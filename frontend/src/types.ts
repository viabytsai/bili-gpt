export interface Segment {
  start: string
  end: string
  title: string
  content: string
}

export interface TranscriptItem {
  from: number
  to: number
  content: string
}

export interface MindMapNode {
  title: string
  children: MindMapNode[]
}

export interface GenerateData {
  video_title: string
  summary: string
  segments: Segment[]
  transcript: TranscriptItem[]
  mindmap?: MindMapNode | null
}

export interface GenerateResponse {
  success: boolean
  data?: GenerateData
  error_code?: string
  message?: string
  detail?: string
}

export interface Settings {
  apiKey: string
  baseUrl: string
  model: string
  summaryPrompt: string
  segmentPrompt: string
  mindmapPrompt: string
  sessdata: string
  biliJct: string
  buvid3: string
}

export type Status =
  | 'idle'
  | 'loading_subtitle'
  | 'loading_llm'
  | 'success'
  | 'error'
