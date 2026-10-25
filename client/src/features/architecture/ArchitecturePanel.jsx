import { useCallback, useMemo, useState } from 'react'
import { Background, Controls, MarkerType, Panel, ReactFlow } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Card } from '@/components/ui/card'
import { useRepo } from '@/features/repo-analysis/RepoContext'
import { CATEGORIES } from '@/lib/categories'
import GraphNode from './GraphNode'
import { layoutNodes } from './layout'
import NodeDetails from './NodeDetails'

const nodeTypes = { file: GraphNode }


function Legend({ categories }) {
  return (
    <Panel position="top-left" className="flex flex-wrap gap-3 rounded-md border bg-card/90 px-3 py-1.5 text-xs">
      {categories.map((key) => (
        <span key={key} className="flex items-center gap-1.5">
          <span className={`size-2 rounded-full ${CATEGORIES[key].dot}`} />
          {CATEGORIES[key].label}
        </span>
      ))}
    </Panel>
  )
}

export default function ArchitecturePanel() {
  const { analysis } = useRepo()
  const { graph } = analysis
  const [selectedId, setSelectedId] = useState(null)

  const nodesById = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n])), [graph])

  // Layout only depends on the graph, so selecting a node never re-runs dagre
  const laidOut = useMemo(() => {
    const base = graph.nodes.map((n) => ({
      id: n.id,
      type: 'file',
      position: { x: 0, y: 0 },
      data: { label: n.label, path: n.path, category: n.category, fileCount: n.files.length },
    }))
    return layoutNodes(base, graph.edges)
  }, [graph])

  const related = useMemo(() => {
    const node = nodesById.get(selectedId)
    return node ? new Set([node.id, ...node.imports, ...node.imported_by]) : null
  }, [nodesById, selectedId])

  const nodes = useMemo(
    () =>
      laidOut.map((n) => ({
        ...n,
        selected: n.id === selectedId,
        data: { ...n.data, dimmed: related ? !related.has(n.id) : false },
      })),
    [laidOut, selectedId, related],
  )

  const edges = useMemo(
    () =>
      graph.edges.map((e) => {
        const active = selectedId && (e.source === selectedId || e.target === selectedId)
        return {
          id: `${e.source}->${e.target}`,
          source: e.source,
          target: e.target,
          type: 'smoothstep',
          animated: Boolean(active),
          markerEnd: { type: MarkerType.ArrowClosed, color: active ? 'var(--primary)' : 'var(--muted-foreground)' },
          style: {
            stroke: active ? 'var(--primary)' : 'var(--muted-foreground)',
            strokeWidth: active ? 2 : 1,
            opacity: selectedId && !active ? 0.15 : 0.6,
          },
        }
      }),
    [graph.edges, selectedId],
  )

  const handleNodeClick = useCallback((_, node) => setSelectedId(node.id), [])
  const handlePaneClick = useCallback(() => setSelectedId(null), [])

  if (!graph.nodes.length) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">
        No import relationships were found. The repository may use an unsupported language or have no internal imports.
      </Card>
    )
  }

  const categoriesPresent = [...new Set(graph.nodes.map((n) => n.category))].filter((k) => CATEGORIES[k])
  const isCollapsed = graph.nodes.some((n) => n.files.length > 1)

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
      <Card className="h-[65vh] gap-0 overflow-hidden py-0">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={handleNodeClick}
          onPaneClick={handlePaneClick}
          nodesDraggable={false}
          nodesConnectable={false}
          colorMode="dark"
          minZoom={0.1}
          fitView
          fitViewOptions={{ padding: 0.15, minZoom: 0.6 }}
        >
          <Background gap={24} />
          <Controls showInteractive={false} />
          <Legend categories={categoriesPresent} />
          <Panel position="bottom-left" className="ml-12 rounded-md border bg-card/90 px-3 py-1 text-xs text-muted-foreground">
            Drag to pan, scroll to zoom
          </Panel>
          {isCollapsed && (
            <Panel position="bottom-center" className="rounded-md border bg-card/90 px-3 py-1 text-xs text-muted-foreground">
              Large repo: files are grouped into folder components
            </Panel>
          )}
        </ReactFlow>
      </Card>
      <NodeDetails node={nodesById.get(selectedId)} nodesById={nodesById} onSelect={setSelectedId} />
    </div>
  )
}
