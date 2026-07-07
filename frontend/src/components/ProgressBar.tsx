import { Spin } from 'antd'

interface Props {
  status: string
}

const messages: Record<string, string> = {
  loading_subtitle: '正在获取字幕...',
  loading_llm: '字幕获取成功，正在生成总结...',
}

export default function ProgressBar({ status }: Props) {
  if (!messages[status]) return null

  return (
    <div className="flex justify-center py-4">
      <Spin tip={messages[status]} />
    </div>
  )
}
