import { useEffect, useRef } from 'react'
import { Card } from 'antd'
import { Graph, treeToGraphData } from '@antv/g6'
import type { MindMapNode as MindMapNodeType } from '../types'

interface Props {
  node: MindMapNodeType
}

const levelColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#f43f5e']

interface G6TreeNode {
  id: string
  label: string
  depth: number
  children?: G6TreeNode[]
}

let idCounter = 0
function toG6Tree(node: MindMapNodeType, depth = 0): G6TreeNode {
  const g6Node: G6TreeNode = {
    id: `node-${idCounter++}`,
    label: node.title,
    depth,
  }
  if (node.children && node.children.length > 0) {
    g6Node.children = node.children.map((c) => toG6Tree(c, depth + 1))
  }
  return g6Node
}

export default function MindMap({ node }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const graphRef = useRef<Graph | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // 清理旧实例
    if (graphRef.current) {
      graphRef.current.destroy()
      graphRef.current = null
    }

    idCounter = 0
    const treeData = toG6Tree(node)
    const data = treeToGraphData(treeData)

    const graph = new Graph({
      container: containerRef.current,
      width: containerRef.current.clientWidth || 800,
      height: 600,
      data,
      layout: {
        type: 'mindmap',
        direction: 'H',
        getHeight: () => 36,
        getWidth: (d: G6TreeNode) => {
          // 中文字符大约每个字14px宽，加上padding
          const len = (d.label || '').length
          return Math.max(len * 14 + 32, 60)
        },
        getVGap: () => 12,
        getHGap: () => 60,
      },
      node: {
        type: 'rect',
        style: {
          radius: 8,
          fill: (d: Record<string, unknown>) => levelColors[((d.depth as number) || 0) % levelColors.length],
          labelText: (d: Record<string, unknown>) => (d.label as string) || '',
          labelFill: '#fff',
          labelFontSize: 13,
          labelFontWeight: 600,
          labelPlacement: 'center',
          size: (d: Record<string, unknown>) => {
            const len = ((d.label as string) || '').length
            return [Math.max(len * 14 + 32, 60), 36]
          },
          ports: [{ placement: 'right' }, { placement: 'left' }],
        },
      },
      edge: {
        type: 'cubic-horizontal',
        style: {
          stroke: '#c4c4c4',
          lineWidth: 1.5,
        },
      },
      behaviors: ['drag-canvas', 'zoom-canvas'],
      autoFit: 'view',
    })

    graph.render()
    graphRef.current = graph

    return () => {
      if (graphRef.current) {
        graphRef.current.destroy()
        graphRef.current = null
      }
    }
  }, [node])

  return (
    <Card title="思维导图" className="rounded-xl card-hover">
      <div ref={containerRef} style={{ width: '100%', minHeight: 400 }} />
    </Card>
  )
}
