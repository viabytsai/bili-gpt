import { useState, useMemo } from 'react'
import { Layout, Tabs, Button } from 'antd'
import {
  SettingOutlined,
  FileTextOutlined,
  OrderedListOutlined,
  ApartmentOutlined,
} from '@ant-design/icons'
import InputArea from './components/InputArea'
import SummaryCard from './components/SummaryCard'
import SegmentList from './components/SegmentList'
import MindMapComponent from './components/MindMap'
import VideoPlayer from './components/VideoPlayer'
import ProgressBar from './components/ProgressBar'
import ErrorModal from './components/ErrorModal'
import SettingsPanel from './components/SettingsPanel'
import { useSettings } from './hooks/useSettings'
import { generateSummary } from './services/api'
import type { GenerateData, Status } from './types'

const { Header, Content } = Layout

function WelcomeEmpty() {
  const features = [
    {
      icon: <FileTextOutlined className="text-2xl text-blue-500" />,
      title: '全局摘要',
      desc: '100~200字结论导向，快速判断视频价值',
    },
    {
      icon: <OrderedListOutlined className="text-2xl text-emerald-500" />,
      title: '分段总结',
      desc: '带时间戳的章节划分，精准定位感兴趣片段',
    },
    {
      icon: <ApartmentOutlined className="text-2xl text-purple-500" />,
      title: '思维导图',
      desc: '层级化知识结构，一眼看清视频脉络',
    },
  ]

  return (
    <div className="text-center pt-4 pb-2">
      <div className="mb-3">
        <span className="inline-block text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          BiliGPT
        </span>
      </div>
      <p className="text-gray-400 text-base mb-10">
        AI 驱动的B站视频内容效率工具
      </p>
      <div className="flex justify-center gap-6 flex-wrap">
        {features.map((f, i) => (
          <div
            key={i}
            className="w-44 bg-white rounded-xl p-5 shadow-sm border border-gray-100 card-hover"
          >
            <div className="mb-2">{f.icon}</div>
            <div className="font-semibold text-gray-700 text-sm mb-1">{f.title}</div>
            <div className="text-gray-400 text-xs leading-relaxed">{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function App() {
  const { settings, saveSettings, resetSettings, defaultSettings } = useSettings()
  const [showSettings, setShowSettings] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<GenerateData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [errorDetail, setErrorDetail] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('summary')
  const [lastUrl, setLastUrl] = useState('')
  const [seekTime, setSeekTime] = useState<number | null>(null)

  const bvid = useMemo(
    () => lastUrl.match(/BV[A-Za-z0-9]{10}/)?.[0] || '',
    [lastUrl],
  )
  const page = useMemo(
    () => lastUrl.match(/[?&]p=(\d+)/)?.[1] || null,
    [lastUrl],
  )

  const handleSubmit = async (url: string) => {
    if (!settings.apiKey) {
      setError('请先配置可用的 API Key')
      setShowSettings(true)
      return
    }

    setError(null)
    setErrorDetail(null)
    setResult(null)
    setSeekTime(null)
    setLastUrl(url)
    setStatus('loading_subtitle')

    const response = await generateSummary(url, settings)

    if (response.success && response.data) {
      setStatus('success')
      setResult(response.data)
      setActiveTab('summary')
    } else {
      setStatus('error')
      setError(response.message || '未知错误')
      setErrorDetail(response.detail || null)
    }
  }

  const tabItems = [
    {
      key: 'summary',
      label: '摘要',
      children: result ? <SummaryCard summary={result.summary} /> : null,
    },
    {
      key: 'segments',
      label: '分段总结',
      children: result ? (
        <SegmentList
          segments={result.segments}
          bvid={bvid}
          page={page}
          transcript={result.transcript}
          onSeek={(t) => setSeekTime(t)}
        />
      ) : null,
    },
    {
      key: 'mindmap',
      label: '思维导图',
      children:
        result?.mindmap ? (
          <MindMapComponent node={result.mindmap} />
        ) : (
          <div className="text-center text-gray-400 py-12">思维导图生成失败，请重试</div>
        ),
    },
  ]

  return (
    <Layout className="min-h-screen flex flex-col" style={{ background: '#f5f7fa' }}>
      <Header
        className="flex items-center justify-between !px-6 !h-14 !bg-transparent !border-b !border-gray-100/80"
      >
        <span className="text-lg font-bold text-gray-800 tracking-tight">
          BiliGPT
        </span>
        <Button
          type="text"
          icon={<SettingOutlined />}
          onClick={() => setShowSettings(true)}
        />
      </Header>

      <Content className="flex-1" style={{ background: 'transparent' }}>
        <div className="max-w-3xl w-full mx-auto px-4 py-6" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 输入区 */}
          <InputArea
            onSubmit={handleSubmit}
            loading={
              status === 'loading_subtitle' || status === 'loading_llm'
            }
          />

          {/* 加载状态 */}
          <ProgressBar status={status} />

          {/* 视频播放器 */}
          <VideoPlayer
            bvid={bvid}
            page={page}
            seekTime={seekTime}
            visible={status === 'success' && !!result}
          />

          {/* 空状态 / 结果 */}
          {status === 'idle' && <WelcomeEmpty />}

          {result && status === 'success' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h2 className="text-lg font-medium text-gray-700 px-1 !my-0">
                {result.video_title}
              </h2>
              <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
            </div>
          )}
        </div>
      </Content>

      {showSettings && (
        <SettingsPanel
          settings={settings}
          defaultSettings={defaultSettings}
          onSave={saveSettings}
          onReset={resetSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {error && status === 'error' && (
        <ErrorModal
          message={error}
          detail={errorDetail}
          onClose={() => {
            setError(null)
            setErrorDetail(null)
            setStatus('idle')
          }}
          onRetry={lastUrl ? () => handleSubmit(lastUrl) : undefined}
        />
      )}
    </Layout>
  )
}
