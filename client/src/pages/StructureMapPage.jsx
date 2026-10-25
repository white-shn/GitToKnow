import { useCallback, useMemo, useState } from 'react'
import { Background, Controls, MarkerType, Panel, ReactFlow } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Info, Network, X } from 'lucide-react'
import EmptyRepoState from '@/components/layout/EmptyRepoState'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import GraphNode from '@/features/architecture/GraphNode'
import { layoutNodes } from '@/features/architecture/layout'
import NodeDetails from '@/features/architecture/NodeDetails'
import { useRepo } from '@/features/repo-analysis/RepoContext'
import { CATEGORIES } from '@/lib/categories'

const nodeTypes = { file: GraphNode }

function Legend({ categories }) {
  return (
    <Panel position="top-left" className="m-3 flex flex-wrap gap-2.5 rounded-xl border bg-card/90 px-3 py-2 text-xs shadow-md backdrop-blur-md">
      {categories.map((key) => (
        <span key={key} className="flex items-center gap-1.5 font-medium">
          <span className={`size-2.5 rounded-full ${CATEGORIES[key].dot}`} />
          {CATEGORIES[key].label}
        </span>
      ))}
    </Panel>
  )
}

export default function StructureMapPage() {
  const { analysis } = useRepo()

  const [selectedId, setSelectedId] = useState(null)
  const [detailsOpen, setDetailsOpen] = useState(true)

  const graph = analysis?.graph

  const nodesById = useMemo(() => {
    if (!graph?.nodes) return new Map()
    return new Map(graph.nodes.map((n) => [n.id, n]))
  }, [graph])

  // Layout with dagre
  const laidOut = useMemo(() => {
    if (!graph?.nodes) return []
    const base = graph.nodes.map((n) => ({
      id: n.id,
      type: 'file',
      position: { x: 0, y: 0 },
      data: { label: n.label, path: n.path, category: n.category, fileCount: n.files.length },
    }))
    return layoutNodes(base, graph.edges)
  }, [graph])

  // Nodes with active selection highlight
  const nodes = useMemo(() => {
    if (!selectedId) return laidOut
    const selected = nodesById.get(selectedId)
    const activeIds = new Set([selectedId, ...(selected?.imports ?? []), ...(selected?.imported_by ?? [])])
    return laidOut.map((n) => ({
      ...n,
      data: { ...n.data, isSelected: n.id === selectedId, isDimmed: !activeIds.has(n.id) },
    }))
  }, [laidOut, selectedId, nodesById])

  // Edges highlighting
  const edges = useMemo(() => {
    if (!graph?.edges) return []
    return graph.edges.map((e) => {
      const active = selectedId && (e.source === selectedId || e.target === selectedId)
      return {
        id: `${e.source}->${e.target}`,
        source: e.source,
        target: e.target,
        animated: Boolean(active),
        markerEnd: { type: MarkerType.ArrowClosed, color: active ? 'var(--primary)' : 'var(--muted-foreground)' },
        style: {
          stroke: active ? 'var(--primary)' : 'var(--muted-foreground)',
          strokeWidth: active ? 2 : 1,
          opacity: selectedId && !active ? 0.15 : 0.6,
        },
      }
    })
  }, [graph, selectedId])

  const handleNodeClick = useCallback((_, node) => {
    setSelectedId(node.id)
    setDetailsOpen(true)
  }, [])

  const handlePaneClick = useCallback(() => {
    setSelectedId(null)
  }, [])

  if (!analysis) {
    return (
      <div className="h-full overflow-y-auto px-4 py-8">
        <EmptyRepoState
          icon={Network}
          title="Full-Screen Structure Map"
          description="Analyze a repository to generate an interactive canvas showing how modules, files, routes, and services interconnect."
        />
      </div>
    )
  }

  if (!graph || !graph.nodes.length) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Card className="max-w-md p-6 text-center text-sm text-muted-foreground">
          No import relationships were found. The repository may use an unsupported language or have no internal imports.
        </Card>
      </div>
    )
  }

  const categoriesPresent = [...new Set(graph.nodes.map((n) => n.category))].filter((k) => CATEGORIES[k])
  const isCollapsed = graph.nodes.some((n) => n.files.length > 1)
  const selectedNode = nodesById.get(selectedId)

  return (
    <div className="relative flex h-full w-full overflow-hidden">
      {/* ReactFlow Canvas */}
      <div className="h-full flex-1 relative bg-background">
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
          fitViewOptions={{ padding: 0.2, minZoom: 0.6 }}
        >
          <Background gap={28} size={1} />
          <Controls showInteractive={false} className="m-3 border rounded-lg bg-card/90 shadow-md" />
          <Legend categories={categoriesPresent} />

          <Panel position="bottom-left" className="m-3 rounded-lg border bg-card/90 px-3 py-1.5 text-xs text-muted-foreground shadow-sm backdrop-blur-xs">
            Drag canvas to pan • Scroll to zoom • Click node to inspect
          </Panel>

          {isCollapsed && (
            <Panel position="bottom-center" className="m-3 rounded-lg border bg-card/90 px-3 py-1.5 text-xs text-muted-foreground shadow-sm backdrop-blur-xs">
              Component nodes represent grouped folders
            </Panel>
          )}
        </ReactFlow>
      </div>

      {/* Floating / Docked Node Details Sidebar */}
      {selectedNode && detailsOpen && (
        <div className="absolute right-4 top-4 bottom-4 z-10 w-80 sm:w-96 rounded-xl border border-border/80 bg-card/95 shadow-2xl backdrop-blur-md flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Node Details
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDetailsOpen(false)}
              className="size-7 p-0 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <NodeDetails node={selectedNode} nodesById={nodesById} onSelect={(id) => setSelectedId(id)} />
          </div>
        </div>
      )}

      {selectedNode && !detailsOpen && (
        <Button
          onClick={() => setDetailsOpen(true)}
          className="absolute right-4 top-4 z-10 gap-2 shadow-lg"
          size="sm"
        >
          <Info className="size-4" />
          Inspect: {selectedNode.label}
        </Button>
      )}
    </div>
  )
}
