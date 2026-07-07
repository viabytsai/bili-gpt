from pydantic import BaseModel


class GenerateRequest(BaseModel):
    url: str
    api_key: str
    base_url: str = "https://api.openai.com/v1"
    model: str = "gpt-4o"
    summary_prompt: str = ""
    segment_prompt: str = ""
    mindmap_prompt: str = ""
    sessdata: str | None = None
    bili_jct: str | None = None
    buvid3: str | None = None


class Segment(BaseModel):
    start: str
    end: str
    title: str
    content: str


class MindMapNode(BaseModel):
    title: str
    children: list["MindMapNode"] = []


MindMapNode.model_rebuild()


class GenerateData(BaseModel):
    video_title: str
    summary: str
    segments: list[Segment]
    transcript: list[dict] = []
    mindmap: MindMapNode | None = None


class GenerateResponse(BaseModel):
    success: bool
    data: GenerateData | None = None
    error_code: str | None = None
    message: str | None = None
    detail: str | None = None  # 技术细节，供调试用


class TestConnectionRequest(BaseModel):
    api_key: str
    base_url: str = "https://api.openai.com/v1"
    model: str = "gpt-4o"
