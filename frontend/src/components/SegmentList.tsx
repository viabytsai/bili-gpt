import { useState } from 'react'
import { Card, Tag, Button, Timeline } from 'antd'
import { CopyOutlined, ClockCircleOutlined, LinkOutlined, DownOutlined, RightOutlined } from '@ant-design/icons'
import type { Segment, TranscriptItem } from '../types'

interface Props {
  segments: Segment[]
  bvid: string
  page: string | null
  transcript: TranscriptItem[]
  onSeek?: (seconds: number) => void
}

function toSeconds(timestamp: string): number {
  const parts = timestamp.split(':')
  if (parts.length === 2) {
    return parseInt(parts[0]) * 60 + parseInt(parts[1])
  }
  return 0
}

function matchTranscript(
  segStart: string,
  segEnd: string,
  transcript: TranscriptItem[],
): TranscriptItem[] {
  const startSec = toSeconds(segStart)
  const endSec = toSeconds(segEnd)
  return transcript.filter(
    (item) => item.from >= startSec && item.to <= endSec,
  )
}

export default function SegmentList({ segments, bvid, page, transcript, onSeek }: Props) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  const toggleExpand = (index: number) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const videoUrl = `https://www.bilibili.com/video/${bvid}${page ? `?p=${page}` : ''}`

  return (
    <Card
      title={
        <span>
          分段总结
          <span className="ml-2 text-sm font-normal text-gray-400">
            ({segments.length} 段)
          </span>
        </span>
      }
      className="card-hover rounded-xl"
    >
      <Timeline
        items={segments.map((seg, idx) => {
          const sec = toSeconds(seg.start)
          const matched = transcript.length > 0
            ? matchTranscript(seg.start, seg.end, transcript)
            : []
          const isExpanded = expanded.has(idx)

          return {
            dot: (
              <ClockCircleOutlined className="text-blue-500" style={{ fontSize: 16 }} />
            ),
            children: (
              <div className="group">
                <div className="flex items-center gap-2 mb-1.5">
                  <Tag
                    color="blue"
                    className="cursor-pointer hover:opacity-80 transition-opacity rounded-md select-none"
                    onClick={() => onSeek?.(sec)}
                    title="点击跳转播放器"
                  >
                    {seg.start} – {seg.end}
                  </Tag>
                  <a
                    href={`${videoUrl}${page ? '&' : '?'}t=${sec}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-300 hover:text-blue-400 transition-colors"
                    title="在B站打开"
                  >
                    <LinkOutlined className="text-xs" />
                  </a>
                  <span className="font-semibold text-gray-800 text-[15px]">
                    {seg.title}
                  </span>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed pl-0">
                  {seg.content}
                </p>
                {matched.length > 0 && (
                  <div className="mt-1.5">
                    <Button
                      type="text"
                      size="small"
                      icon={isExpanded ? <DownOutlined /> : <RightOutlined />}
                      onClick={() => toggleExpand(idx)}
                      className="text-gray-400 hover:text-blue-500 transition-colors !text-xs"
                    >
                      逐字稿 ({matched.length} 条)
                    </Button>
                    {isExpanded && (
                      <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-100 text-sm text-gray-600 leading-relaxed max-h-48 overflow-y-auto">
                        <p>{matched.map((item) => {
  const text = item.content
  return /[。！？，、；：\.!\?,;:\)]\)$/.test(text) ? text : text + '，'
}).join('')}</p>
                      </div>
                    )}
                  </div>
                )}
                <Button
                  type="text"
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() =>
                    handleCopy(
                      `[${seg.start} – ${seg.end}] ${seg.title}\n${seg.content}`,
                    )
                  }
                  className="opacity-0 group-hover:opacity-100 transition-opacity mt-1 text-gray-400"
                />
              </div>
            ),
          }
        })}
      />
    </Card>
  )
}

