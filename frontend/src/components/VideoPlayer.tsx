import { Card } from 'antd'

interface Props {
  bvid: string
  page: string | null
  seekTime: number | null
  visible: boolean
}

export default function VideoPlayer({ bvid, page, seekTime, visible }: Props) {
  if (!visible || !bvid) return null

  const pageParam = page ? page : '1'
  const base = `//player.bilibili.com/player.html?bvid=${bvid}&page=${pageParam}&highQuality=1&autoplay=0`
  const src = seekTime != null ? `${base}&t=${seekTime}` : base

  return (
    <Card className="rounded-xl overflow-hidden !p-0 shadow-md">
      <div className="relative" style={{ paddingBottom: '56.25%' }}>
        <iframe
          key={seekTime ?? 'init'}
          src={src}
          className="absolute inset-0 w-full h-full border-0 rounded-xl"
          allowFullScreen
          scrolling="no"
        />
      </div>
    </Card>
  )
}
