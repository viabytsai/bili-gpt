import { useState, useEffect, useRef } from 'react'
import { Drawer, Form, Input, Button, Divider, Modal, message } from 'antd'
import { ScanOutlined } from '@ant-design/icons'
import type { Settings } from '../types'
import {
  testConnection,
  debugSubtitle,
  generateQrCode,
  checkQrCode,
  type DebugResult,
} from '../services/api'

const { TextArea } = Input

interface Props {
  settings: Settings
  defaultSettings: Settings
  onSave: (s: Settings) => void
  onReset: () => void
  onClose: () => void
}

export default function SettingsPanel({
  settings,
  defaultSettings,
  onSave,
  onReset,
  onClose,
}: Props) {
  const [local, setLocal] = useState<Settings>({ ...settings })
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)
  const [debugUrl, setDebugUrl] = useState('')
  const [debugging, setDebugging] = useState(false)
  const [debugResult, setDebugResult] = useState<DebugResult | null>(null)

  // 扫码登录状态
  const [qrModalOpen, setQrModalOpen] = useState(false)
  const [qrImage, setQrImage] = useState('')
  const [qrStatus, setQrStatus] = useState('')
  const qrTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const startQrLogin = async () => {
    setQrModalOpen(true)
    setQrImage('')
    setQrStatus('正在生成二维码...')
    const result = await generateQrCode()
    if (result.success && result.qrcode_base64 && result.qrcode_key) {
      setQrImage(result.qrcode_base64)
      setQrStatus('请用B站App扫码')
      startPolling(result.qrcode_key)
    } else {
      setQrStatus(result.message || '生成二维码失败')
    }
  }

  const startPolling = (key: string) => {
    if (qrTimer.current) clearInterval(qrTimer.current)
    qrTimer.current = setInterval(async () => {
      const result = await checkQrCode(key)
      if (result.status === 'scanned') {
        setQrStatus('已扫码，请在手机上确认登录')
      } else if (result.status === 'done') {
        if (qrTimer.current) clearInterval(qrTimer.current)
        setQrStatus('登录成功！')
        setLocal({
          ...local,
          sessdata: result.sessdata || '',
          biliJct: result.bili_jct || '',
          buvid3: result.buvid3 || '',
        })
        message.success('B站登录凭证已自动填入')
        setTimeout(() => setQrModalOpen(false), 800)
      } else if (result.status === 'expired') {
        if (qrTimer.current) clearInterval(qrTimer.current)
        setQrStatus('二维码已过期，请重新获取')
      }
    }, 2000)
  }

  useEffect(() => {
    return () => {
      if (qrTimer.current) clearInterval(qrTimer.current)
    }
  }, [])

  const handleSave = () => {
    onSave(local)
    onClose()
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    const ok = await testConnection(local)
    setTestResult(ok ? '连接成功' : '连接失败，请检查配置')
    setTesting(false)
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title="设置"
      width={480}
      footer={
        <div className="flex gap-3 justify-end">
          <Button onClick={() => { setLocal({ ...defaultSettings }); onReset() }}>
            恢复默认
          </Button>
          <Button type="primary" onClick={handleSave}>
            保存
          </Button>
        </div>
      }
    >
      <Form layout="vertical" size="middle">
        <Form.Item label="模型">
          <Input
            value={local.model}
            onChange={(e) => setLocal({ ...local, model: e.target.value })}
            placeholder="例如 gpt-4o / deepseek-chat / claude-3-opus"
          />
        </Form.Item>

        <Form.Item label="API Base URL" extra="支持所有兼容 OpenAI API 格式的服务">
          <Input
            value={local.baseUrl}
            onChange={(e) => setLocal({ ...local, baseUrl: e.target.value })}
            placeholder="https://api.openai.com/v1"
          />
        </Form.Item>

        <Form.Item label="API Key">
          <div className="flex gap-2">
            <Input.Password
              value={local.apiKey}
              onChange={(e) => setLocal({ ...local, apiKey: e.target.value })}
              placeholder="sk-..."
              className="flex-1"
            />
            <Button
              onClick={handleTest}
              loading={testing}
              disabled={!local.apiKey}
            >
              测试连接
            </Button>
          </div>
          {testResult && (
            <p className={`mt-1 text-xs ${testResult.includes('成功') ? 'text-green-500' : 'text-red-500'}`}>
              {testResult}
            </p>
          )}
        </Form.Item>

        <Divider>B站凭证</Divider>

        <div className="mb-4">
          <Button
            icon={<ScanOutlined />}
            onClick={startQrLogin}
            type="default"
          >
            扫码登录
          </Button>
          <span className="ml-2 text-xs text-gray-400">或手动填入下方字段</span>
        </div>

        <Form.Item label="SESSDATA" extra="从 bilibili.com Cookie 中获取（必需）">
          <Input
            value={local.sessdata}
            onChange={(e) => setLocal({ ...local, sessdata: e.target.value })}
            placeholder="从浏览器开发者工具 → Application → Cookies 复制"
          />
        </Form.Item>

        <Form.Item label="bili_jct" extra="CSRF Token（可选）">
          <Input
            value={local.biliJct}
            onChange={(e) => setLocal({ ...local, biliJct: e.target.value })}
          />
        </Form.Item>

        <Form.Item label="buvid3" extra="设备标识（可选）">
          <Input
            value={local.buvid3}
            onChange={(e) => setLocal({ ...local, buvid3: e.target.value })}
          />
        </Form.Item>

        <Divider>凭证诊断</Divider>

        <Form.Item label="测试视频链接" extra="粘贴一个视频链接，测试凭证能否正常获取字幕">
          <div className="flex gap-2">
            <Input
              value={debugUrl}
              onChange={(e) => setDebugUrl(e.target.value)}
              placeholder="https://www.bilibili.com/video/BV..."
              className="flex-1"
            />
            <Button
              onClick={async () => {
                setDebugging(true)
                setDebugResult(null)
                const result = await debugSubtitle(debugUrl, local)
                setDebugResult(result)
                setDebugging(false)
              }}
              loading={debugging}
              disabled={!debugUrl}
            >
              诊断
            </Button>
          </div>
        </Form.Item>

        {debugResult && (
          <div className={`rounded-lg p-3 text-xs font-mono space-y-1 max-h-64 overflow-y-auto mb-4 ${
            debugResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            <p className={`font-semibold mb-2 ${debugResult.success ? 'text-green-700' : 'text-red-700'}`}>
              {debugResult.summary}
            </p>
            {debugResult.steps.map((s, i) => (
              <div key={i} className="flex gap-2">
                <span className={s.ok ? 'text-green-500' : 'text-red-500'}>
                  {s.ok ? '✓' : '✗'}
                </span>
                <span className="text-gray-500">{s.step}</span>
                <span className="text-gray-400 truncate">{s.detail}</span>
              </div>
            ))}
          </div>
        )}

        <Divider>自定义提示词</Divider>

        <Form.Item label="全局摘要提示词" extra="可写入 {{subtitle_text}}（字幕）和 {{video_title}}（标题）作为变量，生成时自动替换">
          <TextArea
            value={local.summaryPrompt}
            onChange={(e) => setLocal({ ...local, summaryPrompt: e.target.value })}
            rows={4}
            placeholder="请输入提示词"
          />
        </Form.Item>

        <Form.Item label="分段总结提示词" extra="可写入 {{subtitle_text}}（字幕）和 {{video_title}}（标题）作为变量，生成时自动替换">
          <TextArea
            value={local.segmentPrompt}
            onChange={(e) => setLocal({ ...local, segmentPrompt: e.target.value })}
            rows={6}
            placeholder="请输入提示词"
          />
        </Form.Item>

        <Form.Item label="思维导图提示词" extra="可写入 {{subtitle_text}}（字幕）和 {{video_title}}（标题）作为变量，生成时自动替换">
          <TextArea
            value={local.mindmapPrompt}
            onChange={(e) => setLocal({ ...local, mindmapPrompt: e.target.value })}
            rows={6}
            placeholder="请输入提示词"
          />
        </Form.Item>
      </Form>

      {/* 扫码登录弹窗 */}
      <Modal
        open={qrModalOpen}
        onCancel={() => {
          if (qrTimer.current) clearInterval(qrTimer.current)
          setQrModalOpen(false)
        }}
        footer={
          qrStatus.includes('过期')
            ? [
                <Button key="retry" type="primary" onClick={startQrLogin}>
                  重新获取
                </Button>,
                <Button key="cancel" onClick={() => setQrModalOpen(false)}>
                  取消
                </Button>,
              ]
            : null
        }
        title="B站扫码登录"
        width={360}
      >
        <div className="flex flex-col items-center py-4">
          {qrImage ? (
            <img
              src={qrImage}
              alt="B站登录二维码"
              className="w-52 h-52 border border-gray-100 rounded-lg"
            />
          ) : (
            <div className="w-52 h-52 bg-gray-50 rounded-lg flex items-center justify-center">
              <span className="text-gray-400 text-sm">加载中...</span>
            </div>
          )}
          <p className="mt-4 text-sm text-gray-600">{qrStatus}</p>
        </div>
      </Modal>
    </Drawer>
  )
}
