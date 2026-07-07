import os
from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from openai import AsyncOpenAI, APIError, AuthenticationError, RateLimitError

from models import GenerateRequest, GenerateResponse, TestConnectionRequest
from services.subtitle import fetch_subtitle
from services.llm import generate_summary, generate_segments, generate_mindmap, test_llm_connection
from prompts import DEFAULT_SUMMARY_PROMPT, DEFAULT_SEGMENT_PROMPT, DEFAULT_MINDMAP_PROMPT


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    yield


app = FastAPI(title="BiliGPT API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 生产模式：托管前端静态文件
DIST_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "dist")
if os.path.isdir(DIST_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(DIST_DIR, "assets")), name="assets")
    # favicon 等 public 资源
    public_dir = os.path.join(DIST_DIR, "public") if os.path.isdir(os.path.join(DIST_DIR, "public")) else None

    @app.get("/{full_path:path}")
    async def serve_spa(request: Request, full_path: str):
        """SPA fallback：非 API 路径都返回 index.html"""
        # API 路径和静态资源不拦截
        if full_path.startswith("api/") or full_path.startswith("assets/"):
            return None
        file_path = os.path.join(DIST_DIR, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(DIST_DIR, "index.html"))


@app.post("/api/generate", response_model=GenerateResponse)
async def generate(req: GenerateRequest):
    # 1. 校验API Key
    if not req.api_key.strip():
        return GenerateResponse(
            success=False,
            error_code="NO_API_KEY",
            message="请先配置可用的 API Key",
        )

    # 2. 获取字幕
    subtitle_result = await fetch_subtitle(
        req.url,
        sessdata=req.sessdata,
        bili_jct=req.bili_jct,
        buvid3=req.buvid3,
    )
    if not subtitle_result.success:
        return GenerateResponse(
            success=False,
            error_code=subtitle_result.error_code,
            message=subtitle_result.message,
            detail=subtitle_result.detail,
        )

    # 3. 准备LLM客户端
    client = AsyncOpenAI(api_key=req.api_key, base_url=req.base_url)

    # 4. 选择提示词（用户自定义 > 默认）
    summary_prompt = req.summary_prompt.strip() or DEFAULT_SUMMARY_PROMPT
    segment_prompt = req.segment_prompt.strip() or DEFAULT_SEGMENT_PROMPT
    mindmap_prompt = req.mindmap_prompt.strip() or DEFAULT_MINDMAP_PROMPT

    # 5. 并行调用LLM生成摘要、分段和思维导图
    try:
        sub_text = subtitle_result.subtitle_text
        max_chars = 30000
        if len(sub_text) > max_chars:
            sub_text = sub_text[:max_chars] + "\n...（字幕内容过长，已截断）"

        title = subtitle_result.video_title
        task_summary = generate_summary(client, req.model, summary_prompt, sub_text, title)
        task_segments = generate_segments(client, req.model, segment_prompt, sub_text, title)
        task_mindmap = generate_mindmap(client, req.model, mindmap_prompt, sub_text, title)

        import asyncio
        summary, segments, mindmap = await asyncio.gather(
            task_summary, task_segments, task_mindmap
        )

        return GenerateResponse(
            success=True,
            data={
                "video_title": title,
                "summary": summary,
                "segments": segments,
                "transcript": subtitle_result.raw_subtitles or [],
                "mindmap": mindmap,
            },
        )

    except AuthenticationError:
        return GenerateResponse(
            success=False,
            error_code="NO_API_KEY",
            message="API Key无效，请检查后重试",
        )
    except RateLimitError:
        return GenerateResponse(
            success=False,
            error_code="LLM_ERROR",
            message="模型调用额度不足，请更换 Key 或稍后重试",
        )
    except APIError as e:
        return GenerateResponse(
            success=False,
            error_code="LLM_ERROR",
            message=f"模型调用失败：{e.message or '未知错误'}",
        )
    except Exception:
        return GenerateResponse(
            success=False,
            error_code="LLM_ERROR",
            message="请求超时，请检查您的网络后重试",
        )


@app.post("/api/test-connection")
async def test_connection(req: TestConnectionRequest):
    """测试LLM连接"""
    ok = await test_llm_connection(req.api_key, req.base_url, req.model)
    return {"success": ok, "message": "连接成功" if ok else "连接失败，请检查配置"}


@app.post("/api/debug-subtitle")
async def debug_subtitle(req: GenerateRequest):
    """逐步诊断字幕获取流程，返回每一步的结果"""
    import traceback
    from bilibili_api import video, ass, Credential
    from bilibili_api.exceptions import (
        NetworkException,
        ResponseCodeException,
        CredentialNoSessdataException,
    )

    steps: list[dict] = []
    bvid = None

    # Step 1: 解析BV号和分P
    import re
    page_num = None
    match = re.search(r"BV[A-Za-z0-9]{10}", req.url)
    if not match:
        match = re.search(r"bilibili\.com/video/(BV[A-Za-z0-9]{10})", req.url)
    if match:
        bvid = match.group(1) if match.lastindex else match.group(0)
    # 提取分P页码
    page_match = re.search(r"[?&]p=(\d+)", req.url)
    if page_match:
        page_num = int(page_match.group(1))
    steps.append({
        "step": "1. 解析BV号" + (f" (第{page_num}P)" if page_num else ""),
        "ok": bvid is not None,
        "detail": f"BV号: {bvid}" + (f", 目标分P: {page_num}" if page_num else "") if bvid else f"无法从 {req.url} 解析BV号",
    })

    if not bvid:
        return {"success": False, "steps": steps, "summary": "链接格式无效"}

    # Step 2: 创建Credential
    sessdata = req.sessdata
    credential = None
    if sessdata:
        credential = Credential(
            sessdata=sessdata,
            bili_jct=req.bili_jct or "",
            buvid3=req.buvid3 or "",
        )
        steps.append({
            "step": "2. 创建B站凭证",
            "ok": True,
            "detail": f"SESSDATA: {'已设置(长度{})'.format(len(sessdata)) if sessdata else '未设置'}, bili_jct: {'已设置' if req.bili_jct else '未设置'}, buvid3: {'已设置' if req.buvid3 else '未设置'}",
        })
    else:
        steps.append({
            "step": "2. 创建B站凭证",
            "ok": False,
            "detail": "未提供 SESSDATA，字幕接口可能无法访问",
        })

    # Step 3: 获取视频基本信息
    try:
        v = video.Video(bvid=bvid, credential=credential)
        info = await v.get_info()
        title = info.get("title", "")
        pages = info.get("pages", [])

        # 确定目标分P的 CID
        cid = None
        if page_num is not None and pages:
            for p in pages:
                if p.get("page") == page_num:
                    cid = p.get("cid")
                    part_title = p.get("part", "")
                    if part_title:
                        title = part_title
                    break
            if cid is None:
                steps.append({
                    "step": "3b. 查找分P CID",
                    "ok": False,
                    "detail": f"未找到第 {page_num}P，视频共 {len(pages)}P",
                })
                return {"success": False, "steps": steps, "summary": f"指定分P不存在"}
        else:
            cid = info.get("cid")

        sub_count = len(info.get("subtitle", {}).get("list", []))
        steps.append({
            "step": "3. 获取视频信息 (get_info)",
            "ok": True,
            "detail": f"标题: {title}, CID: {cid}, 总P数: {len(pages)}, 字幕数量: {sub_count}",
        })
    except Exception as e:
        steps.append({
            "step": "3. 获取视频信息 (get_info)",
            "ok": False,
            "detail": f"{type(e).__name__}: {e}",
        })
        return {"success": False, "steps": steps, "summary": "获取视频信息失败，请检查BV号是否正确"}

    if sub_count == 0:
        steps.append({
            "step": "4. 字幕列表",
            "ok": False,
            "detail": "该视频没有字幕",
        })
        return {"success": False, "steps": steps, "summary": "视频无字幕"}

    # Step 4: 获取player_info（需要凭证）
    try:
        player_info = await v.get_player_info(cid=cid)
        subtitle_data = player_info.get("subtitle", {}).get("subtitles", [])
        steps.append({
            "step": "4. 获取播放器信息 (get_player_info)",
            "ok": True,
            "detail": f"获取到 {len(subtitle_data)} 个字幕",
        })
        for s in subtitle_data[:5]:
            url_preview = (s.get("subtitle_url", "") or "")[:60]
            steps.append({
                "step": f"  字幕: {s.get('lan_doc', '?')}",
                "ok": bool(url_preview),
                "detail": f"语言代码: {s.get('lan')}, URL: {url_preview}...",
            })
    except CredentialNoSessdataException as e:
        steps.append({
            "step": "4. 获取播放器信息 (get_player_info)",
            "ok": False,
            "detail": f"缺少SESSDATA凭证: {e}",
        })
        return {"success": False, "steps": steps, "summary": "该视频字幕接口需要B站登录凭证"}
    except NetworkException as e:
        steps.append({
            "step": "4. 获取播放器信息 (get_player_info)",
            "ok": False,
            "detail": f"网络错误 (HTTP {e.status}): {e}",
        })
        return {"success": False, "steps": steps, "summary": f"网络请求被拒绝(HTTP {e.status})，请检查SESSDATA是否有效"}
    except ResponseCodeException as e:
        steps.append({
            "step": "4. 获取播放器信息 (get_player_info)",
            "ok": False,
            "detail": f"接口返回异常: {e}",
        })
        return {"success": False, "steps": steps, "summary": "B站接口返回异常"}
    except Exception as e:
        steps.append({
            "step": "4. 获取播放器信息 (get_player_info)",
            "ok": False,
            "detail": f"{type(e).__name__}: {e}\n{traceback.format_exc()}",
        })
        return {"success": False, "steps": steps, "summary": f"未知错误: {e}"}

    # Step 5: 手动下载字幕内容（绕过 bilibili-api 的 cookie 缺失 bug）
    import httpx as _httpx
    try:
        # 找到 AI 中文或第一个可用的字幕 URL
        target_url = None
        for sub in subtitle_data:
            url_str = sub.get("subtitle_url", "")
            if url_str:
                if url_str.startswith("//"):
                    url_str = "https:" + url_str
                if sub.get("lan") == "ai-zh":
                    target_url = url_str
                    break
                if target_url is None:
                    target_url = url_str

        if not target_url:
            steps.append({
                "step": "5. 下载字幕内容",
                "ok": False,
                "detail": "未找到有效字幕URL",
            })
            return {"success": False, "steps": steps, "summary": "字幕URL为空"}

        # 带 cookie 直接请求 CDN
        cookies = credential.get_cookies() if credential else {}
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            "Referer": "https://www.bilibili.com",
            "Origin": "https://www.bilibili.com",
        }
        async with _httpx.AsyncClient(timeout=30, follow_redirects=True) as _client:
            resp = await _client.get(target_url, headers=headers, cookies=cookies)
            if resp.status_code != 200:
                steps.append({
                    "step": "5. 下载字幕内容",
                    "ok": False,
                    "detail": f"CDN 返回 HTTP {resp.status_code}",
                })
                return {"success": False, "steps": steps, "summary": f"字幕CDN下载失败(HTTP {resp.status_code})，请检查SESSDATA和buvid3是否最新"}

            data = resp.json()
            raw = data.get("body", [])
    except Exception as e2:
        steps.append({
            "step": "5. 下载字幕内容",
            "ok": False,
            "detail": f"{type(e2).__name__}: {e2}",
        })
        return {"success": False, "steps": steps, "summary": f"字幕下载失败: {e2}"}

    steps.append({
        "step": "5. 下载字幕内容",
        "ok": True,
        "detail": f"成功获取 {len(raw)} 条字幕",
    })

    # 显示前3条字幕作为样本
    for item in raw[:3]:
        st = int(item.get("from", 0))
        et = int(item.get("to", 0))
        steps.append({
            "step": f"  样本 [{st//60:02d}:{st%60:02d} -> {et//60:02d}:{et%60:02d}]",
            "ok": True,
            "detail": item.get("content", "")[:100],
        })

    return {
        "success": True,
        "steps": steps,
        "summary": "所有步骤通过，字幕获取正常",
        "subtitle_count": len(raw),
    }


# B站扫码登录：存储进行中的登录会话
_qr_sessions: dict[str, "QrCodeLogin"] = {}


@app.post("/api/bilibili-login/generate")
async def bilibili_login_generate():
    """生成B站登录二维码"""
    import base64
    from bilibili_api.login_v2 import QrCodeLogin, QrCodeLoginChannel

    try:
        qr = QrCodeLogin(QrCodeLoginChannel.WEB)
        await qr.generate_qrcode()
        key = qr._QrCodeLogin__qr_key
        _qr_sessions[key] = qr

        # 读取二维码图片转为 base64
        pic = qr.get_qrcode_picture()
        b64 = base64.b64encode(pic.content).decode()

        return {
            "success": True,
            "qrcode_base64": f"data:image/png;base64,{b64}",
            "qrcode_key": key,
        }
    except Exception as e:
        return {"success": False, "message": f"生成登录二维码失败：{e}"}


@app.post("/api/bilibili-login/check")
async def bilibili_login_check(data: dict):
    """检查B站扫码登录状态"""
    from bilibili_api.login_v2 import QrCodeLoginEvents

    key = data.get("qrcode_key", "")
    qr = _qr_sessions.get(key)
    if not qr:
        return {"status": "expired", "message": "会话已过期，请重新生成二维码"}

    try:
        event = await qr.check_state()
        # 注意：QrCodeLoginEvents 的命名有误导性
        #   SCAN  → 等待扫码（尚未扫码）
        #   CONF  → 已扫码，等待用户在手机上确认
        #   DONE  → 登录成功
        #   TIMEOUT → 二维码过期
        if event == QrCodeLoginEvents.DONE:
            cred = qr.get_credential()
            result = {
                "status": "done",
                "sessdata": cred.sessdata,
                "bili_jct": cred.bili_jct,
                "buvid3": cred.buvid3,
            }
            del _qr_sessions[key]
            return result
        elif event == QrCodeLoginEvents.CONF:
            return {"status": "scanned", "message": "已扫码，请在手机上确认"}
        elif event == QrCodeLoginEvents.SCAN:
            return {"status": "pending", "message": "等待扫码..."}
        elif event == QrCodeLoginEvents.TIMEOUT:
            del _qr_sessions[key]
            return {"status": "expired", "message": "二维码已过期，请重新生成"}
        else:
            return {"status": "pending", "message": "等待扫码..."}
    except Exception:
        del _qr_sessions[key]
        return {"status": "expired", "message": "二维码已过期，请重新生成"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
