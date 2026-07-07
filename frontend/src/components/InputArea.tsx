import { useState } from 'react'
import { Input, Button, Space } from 'antd'
import { PlayCircleOutlined } from '@ant-design/icons'

interface Props {
  onSubmit: (url: string) => void
  loading: boolean
}

const BILIBILI_URL_RE =
  /^(https?:\/\/)?(www\.)?bilibili\.com\/video\/BV[A-Za-z0-9]{10}/

export default function InputArea({ onSubmit, loading }: Props) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = () => {
    if (!url.trim()) {
      setError('请输入B站视频链接')
      return
    }
    if (!BILIBILI_URL_RE.test(url.trim())) {
      setError('链接格式不正确，请输入有效的B站视频链接')
      return
    }
    setError('')
    onSubmit(url.trim())
  }

  return (
    <div>
      <div className="bg-white rounded-2xl shadow-md shadow-gray-200/50 p-6 border border-gray-100 glow-input">
        <div className="text-center mb-4">
          <span className="text-sm text-gray-400">
            粘贴 B站视频链接，AI 自动生成摘要、分段总结与思维导图
          </span>
        </div>
        <Space.Compact style={{ width: '100%' }}>
          <Input
            value={url}
            onChange={(e) => {
              setUrl(e.target.value)
              if (error) setError('')
            }}
            onPressEnter={handleSubmit}
            placeholder="https://www.bilibili.com/video/BV1xx411c7mD"
            disabled={loading}
            size="large"
            style={{
              flex: 1,
              fontSize: 15,
              borderTopLeftRadius: 12,
              borderBottomLeftRadius: 12,
            }}
          />
          <Button
            type="primary"
            size="large"
            loading={loading}
            onClick={handleSubmit}
            icon={loading ? undefined : <PlayCircleOutlined />}
            style={{
              height: 48,
              paddingInline: 32,
              fontSize: 16,
              fontWeight: 600,
              borderTopRightRadius: 12,
              borderBottomRightRadius: 12,
              background: loading
                ? undefined
                : 'linear-gradient(135deg, #3b82f6, #6366f1)',
              border: 'none',
            }}
          >
            {loading ? '处理中' : '生成'}
          </Button>
        </Space.Compact>
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-500 pl-2">{error}</p>
      )}
    </div>
  )
}
