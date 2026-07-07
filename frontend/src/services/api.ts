import type { GenerateResponse, Settings } from '../types'

export async function generateSummary(
  url: string,
  settings: Settings,
): Promise<GenerateResponse> {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,
      api_key: settings.apiKey,
      base_url: settings.baseUrl,
      model: settings.model,
      summary_prompt: settings.summaryPrompt,
      segment_prompt: settings.segmentPrompt,
      mindmap_prompt: settings.mindmapPrompt,
      sessdata: settings.sessdata || undefined,
      bili_jct: settings.biliJct || undefined,
      buvid3: settings.buvid3 || undefined,
    }),
  })
  return res.json()
}

export async function testConnection(settings: Settings): Promise<boolean> {
  try {
    const res = await fetch('/api/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: settings.apiKey,
        base_url: settings.baseUrl,
        model: settings.model,
      }),
    })
    const data = await res.json()
    return data.success
  } catch {
    return false
  }
}

export interface DebugStep {
  step: string
  ok: boolean
  detail: string
}

export interface DebugResult {
  success: boolean
  steps: DebugStep[]
  summary: string
  subtitle_count?: number
}

export async function debugSubtitle(
  url: string,
  settings: Settings,
): Promise<DebugResult> {
  const res = await fetch('/api/debug-subtitle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,
      api_key: settings.apiKey || 'test',
      base_url: settings.baseUrl,
      model: settings.model,
      sessdata: settings.sessdata || undefined,
      bili_jct: settings.biliJct || undefined,
      buvid3: settings.buvid3 || undefined,
    }),
  })
  return res.json()
}

// B站扫码登录

export interface QrCodeGenerateResult {
  success: boolean
  qrcode_base64?: string
  qrcode_key?: string
  message?: string
}

export async function generateQrCode(): Promise<QrCodeGenerateResult> {
  const res = await fetch('/api/bilibili-login/generate', { method: 'POST' })
  return res.json()
}

export interface QrCodeCheckResult {
  status: 'pending' | 'scanned' | 'done' | 'expired'
  message?: string
  sessdata?: string
  bili_jct?: string
  buvid3?: string
}

export async function checkQrCode(key: string): Promise<QrCodeCheckResult> {
  const res = await fetch('/api/bilibili-login/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ qrcode_key: key }),
  })
  return res.json()
}
