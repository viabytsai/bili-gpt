import re
import httpx
from dataclasses import dataclass

from bilibili_api import video, ass, Credential
from bilibili_api.exceptions import (
    ArgsException,
    NetworkException,
    ResponseCodeException,
    CredentialNoSessdataException,
)


@dataclass
class SubtitleResult:
    """字幕获取结果"""
    success: bool
    video_title: str = ""
    subtitle_text: str = ""
    raw_subtitles: list[dict] | None = None
    error_code: str | None = None
    message: str | None = None
    detail: str | None = None


def extract_bvid(url: str) -> str | None:
    """从B站链接中提取BV号"""
    patterns = [
        r"BV[A-Za-z0-9]{10}",
        r"bilibili\.com/video/(BV[A-Za-z0-9]{10})",
        r"b23\.tv/(\w+)",
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            bvid = match.group(1) if "bilibili" in pattern or "b23" in pattern else match.group(0)
            return bvid
    return None


def extract_page(url: str) -> int | None:
    """从B站链接中提取分P页码（如 ?p=42 或 &p=42），未指定时返回 None"""
    match = re.search(r"[?&]p=(\d+)", url)
    if match:
        return int(match.group(1))
    return None


async def fetch_subtitle(
    url: str,
    sessdata: str | None = None,
    bili_jct: str | None = None,
    buvid3: str | None = None,
) -> SubtitleResult:
    """获取视频字幕，返回带时间戳的文本"""
    bvid = extract_bvid(url)
    if not bvid:
        return SubtitleResult(
            success=False,
            error_code="INVALID_URL",
            message="视频不存在或链接格式错误",
            detail=f"无法从链接中提取BV号: {url}",
        )

    credential = None
    cookies = {}
    if sessdata:
        # SESSDATA 可能需要 URL 编码（如果原始值不含 %）
        encoded_sessdata = sessdata if "%" in sessdata else sessdata
        credential = Credential(
            sessdata=sessdata,
            bili_jct=bili_jct or "",
            buvid3=buvid3 or "",
        )
        cookies = credential.get_cookies()

    try:
        v = video.Video(bvid=bvid, credential=credential)
        info = await v.get_info()
        video_title = info.get("title", "")

        # 确定目标分P的 CID
        page_num = extract_page(url)
        pages = info.get("pages", [])
        cid = None
        if page_num is not None and pages:
            # 用户在URL中指定了分P（如 ?p=42），查找对应 CID
            for p in pages:
                if p.get("page") == page_num:
                    cid = p.get("cid")
                    part_title = p.get("part", "")
                    if part_title:
                        video_title = part_title
                    break
            if cid is None:
                return SubtitleResult(
                    success=False,
                    error_code="INVALID_URL",
                    message=f"未找到第 {page_num}P，该视频共 {len(pages)}P",
                    detail=f"URL: {url}",
                )
        else:
            # 未指定分P，使用第一个
            cid = info.get("cid")

        # 检查视频是否有字幕（通过 get_info 的字幕列表）
        subtitle_list = info.get("subtitle", {}).get("list", [])
        if not subtitle_list:
            return SubtitleResult(
                success=False,
                error_code="NO_SUBTITLE",
                message="视频未提供字幕，暂无法生成总结",
                detail=f"视频 {bvid} 无字幕列表",
            )

        # 获取字幕语言列表和URL（通过 request_subtitle_languages）
        try:
            subtitle_lang_obj = await ass.request_subtitle_languages(
                obj=v, cid=cid, credential=credential
            )
        except CredentialNoSessdataException:
            return SubtitleResult(
                success=False,
                error_code="SUBTITLE_FETCH_FAILED",
                message="字幕获取需要B站登录凭证，请在设置中填写 SESSDATA",
                detail="缺少 SESSDATA：该视频字幕接口需要登录态",
            )
        except NetworkException as e:
            return _handle_network_error(e, sessdata)
        except Exception as e:
            return SubtitleResult(
                success=False,
                error_code="SUBTITLE_FETCH_FAILED",
                message=f"获取字幕列表失败：{e}",
                detail=f"{type(e).__name__}: {e}",
            )

        # 找到 AI 中文字幕的 CDN URL
        lan_list = subtitle_lang_obj._AssSubtitleObject__json_lan_list
        ai_url = None
        fallback_url = None
        for sub in lan_list:
            sub_url = sub.get("subtitle_url", "")
            if not sub_url:
                continue
            # 补全协议
            if sub_url.startswith("//"):
                sub_url = "https:" + sub_url
            if sub.get("lan") == "ai-zh":
                ai_url = sub_url
                break
            if fallback_url is None and sub_url:
                fallback_url = sub_url

        target_url = ai_url or fallback_url
        if not target_url:
            return SubtitleResult(
                success=False,
                error_code="NO_SUBTITLE",
                message="未找到可下载的字幕链接",
                detail=f"字幕列表中有 {len(lan_list)} 项，但无有效URL",
            )

        # 手动带 cookie 下载字幕内容（绕过 bilibili-api 的 bug）
        raw_subtitles = await _download_subtitle_json(target_url, cookies)
        if raw_subtitles is None:
            return SubtitleResult(
                success=False,
                error_code="SUBTITLE_FETCH_FAILED",
                message="字幕内容下载失败（CDN 403），请尝试更新 SESSDATA 和 buvid3",
                detail=f"字幕CDN返回403，URL: {target_url}\n请确保从浏览器复制的 SESSDATA 和 buvid3 均是最新值",
            )

        if not raw_subtitles:
            return SubtitleResult(
                success=False,
                error_code="NO_SUBTITLE",
                message="视频字幕内容为空",
                detail=f"视频 {bvid} 字幕数据为空",
            )

        # 拼接为带时间戳的纯文本
        lines = []
        has_timestamp = False
        for item in raw_subtitles:
            start = _format_time(item["from"])
            end = _format_time(item["to"])
            content = item["content"]
            if item["from"] > 0 or item["to"] > 0:
                has_timestamp = True
            lines.append(f"[{start} -> {end}] {content}")

        subtitle_text = "\n".join(lines)

        if not has_timestamp:
            return SubtitleResult(
                success=True,
                video_title=video_title,
                subtitle_text=subtitle_text,
                raw_subtitles=raw_subtitles,
                error_code="NO_TIMESTAMP",
                message="分段总结的时间标记可能缺失，仅按内容段落展示",
            )

        return SubtitleResult(
            success=True,
            video_title=video_title,
            subtitle_text=subtitle_text,
            raw_subtitles=raw_subtitles,
        )

    except NetworkException as e:
        return _handle_network_error(e, sessdata)
    except ResponseCodeException:
        return SubtitleResult(
            success=False,
            error_code="INVALID_URL",
            message="视频不存在或链接格式错误",
        )
    except Exception as e:
        return SubtitleResult(
            success=False,
            error_code="SUBTITLE_FETCH_FAILED",
            message=f"字幕获取失败：{e}",
            detail=f"{type(e).__name__}: {e}",
        )


async def _download_subtitle_json(
    url: str, cookies: dict
) -> list[dict] | None:
    """直接请求字幕 CDN 下载 JSON 内容，返回 body 数组"""
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Referer": "https://www.bilibili.com",
        "Origin": "https://www.bilibili.com",
    }
    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
        resp = await client.get(url, headers=headers, cookies=cookies)
        if resp.status_code != 200:
            return None
        data = resp.json()
        return data.get("body", [])


def _handle_network_error(e: NetworkException, sessdata: str | None) -> SubtitleResult:
    """处理网络错误"""
    status = e.status
    msg = str(e)

    if status == 403:
        parts = [
            "请求被B站服务器拒绝（403 Forbidden），常见原因：",
            "",
            "1. SESSDATA 已过期 → 重新登录 bilibili.com 获取最新 Cookie",
            "2. 缺少 buvid3 → 请在设置中同时填写 buvid3",
            "3. Cookie 格式错误 → 确保完整复制原始值",
            "",
            f"原始错误: {msg}",
        ]
        return SubtitleResult(
            success=False,
            error_code="SUBTITLE_FETCH_FAILED",
            message="B站拒绝了请求（403），凭证可能已过期，请更新后重试",
            detail="\n".join(parts),
        )

    return SubtitleResult(
        success=False,
        error_code="SUBTITLE_FETCH_FAILED",
        message=f"网络请求失败（{status}），请检查网络或更新凭证后重试",
        detail=f"HTTP {status}: {msg}",
    )


def _format_time(seconds: float) -> str:
    """将秒数转换为 MM:SS 格式"""
    m = int(seconds // 60)
    s = int(seconds % 60)
    return f"{m:02d}:{s:02d}"
