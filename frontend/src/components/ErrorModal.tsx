import { Modal, Button, Typography } from 'antd'
import { ExclamationCircleFilled } from '@ant-design/icons'

interface Props {
  message: string
  detail?: string | null
  onClose: () => void
  onRetry?: () => void
}

export default function ErrorModal({ message, detail, onClose, onRetry }: Props) {
  return (
    <Modal
      open
      onCancel={onClose}
      footer={
        <div className="flex gap-3 justify-end">
          {onRetry && (
            <Button type="primary" onClick={onRetry}>
              重试
            </Button>
          )}
          <Button onClick={onClose}>知道了</Button>
        </div>
      }
      title={
        <div className="flex items-center gap-2">
          <ExclamationCircleFilled className="text-red-500 text-lg" />
          <span>生成失败</span>
        </div>
      }
    >
      <Typography.Paragraph className="mb-3">{message}</Typography.Paragraph>
      {detail && (
        <details>
          <summary className="text-gray-400 text-xs cursor-pointer hover:text-gray-500 select-none mb-2">
            查看技术详情
          </summary>
          <pre className="text-xs text-gray-500 bg-gray-50 p-3 rounded whitespace-pre-wrap break-all">
            {detail}
          </pre>
        </details>
      )}
    </Modal>
  )
}
