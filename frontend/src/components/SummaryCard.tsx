import { Card, Button, Typography } from 'antd'
import { CopyOutlined } from '@ant-design/icons'

interface Props {
  summary: string
}

export default function SummaryCard({ summary }: Props) {
  return (
    <Card
      title="全局摘要"
      className="card-hover rounded-xl"
      extra={
        <Button
          type="text"
          size="small"
          icon={<CopyOutlined />}
          onClick={() => navigator.clipboard.writeText(summary)}
        >
          复制
        </Button>
      }
    >
      <Typography.Paragraph className="whitespace-pre-wrap leading-relaxed !mb-0 text-[15px]">
        {summary}
      </Typography.Paragraph>
    </Card>
  )
}
