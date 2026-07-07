import json
import re

from openai import AsyncOpenAI

from models import Segment


async def generate_summary(
    client: AsyncOpenAI,
    model: str,
    prompt_template: str,
    subtitle_text: str,
    video_title: str,
) -> str:
    """调用LLM生成全局摘要"""
    prompt = prompt_template.replace("{{subtitle_text}}", subtitle_text)
    prompt = prompt.replace("{{video_title}}", video_title)

    response = await client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        max_tokens=800,
    )
    return response.choices[0].message.content.strip()


async def generate_segments(
    client: AsyncOpenAI,
    model: str,
    prompt_template: str,
    subtitle_text: str,
    video_title: str,
) -> list[Segment]:
    """调用LLM生成分段总结，返回结构化数据"""
    prompt = prompt_template.replace("{{subtitle_text}}", subtitle_text)
    prompt = prompt.replace("{{video_title}}", video_title)

    response = await client.chat.completions.create(
        model=model,
        messages=[
            {"role": "user", "content": prompt},
            {
                "role": "system",
                "content": "你只能以JSON格式回复，不要包含任何其他文字或markdown标记。",
            },
        ],
        temperature=0.3,
        max_tokens=8000,
    )

    raw = response.choices[0].message.content.strip()
    data = _parse_json(raw)

    segments = []
    for item in data.get("segments", []):
        segments.append(
            Segment(
                start=item.get("start", "00:00"),
                end=item.get("end", "00:00"),
                title=item.get("title", ""),
                content=item.get("content", ""),
            )
        )
    return segments


def _parse_json(raw: str) -> dict:
    """解析LLM返回的JSON，处理markdown代码块包裹及前后附加文字的情况"""
    # 1. 先尝试直接解析（json_object模式下的正常返回）
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass

    # 2. 从文本中提取 ```json ... ``` 代码块
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", raw)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass

    # 3. 从文本中提取最外层花括号包裹的JSON对象
    match = re.search(r"\{[\s\S]*\}", raw)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass

    return {"segments": []}


async def generate_mindmap(
    client: AsyncOpenAI,
    model: str,
    prompt_template: str,
    subtitle_text: str,
    video_title: str,
) -> dict | None:
    """调用LLM生成思维导图树结构"""
    prompt = prompt_template.replace("{{subtitle_text}}", subtitle_text)
    prompt = prompt.replace("{{video_title}}", video_title)

    response = await client.chat.completions.create(
        model=model,
        messages=[
            {"role": "user", "content": prompt},
            {
                "role": "system",
                "content": "你只能以JSON格式回复，不要包含任何其他文字或markdown标记。",
            },
        ],
        temperature=0.3,
        max_tokens=4000,
    )

    raw = response.choices[0].message.content.strip()
    data = _parse_json(raw)
    return data.get("mindmap")


async def test_llm_connection(
    api_key: str, base_url: str, model: str
) -> bool:
    """测试LLM连接是否正常"""
    try:
        client = AsyncOpenAI(api_key=api_key, base_url=base_url)
        await client.models.list()
        return True
    except Exception:
        return False
