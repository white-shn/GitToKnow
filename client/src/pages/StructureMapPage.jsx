import { useEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import { MousePointerClick, Network, X } from 'lucide-react'
import EmptyRepoState from '@/components/layout/EmptyRepoState'
import { Card } from '@/components/ui/card'
import ForceGraph from '@/features/architecture/ForceGraph'
import NodeDetails from '@/features/architecture/NodeDetails'
import { useRepo } from '@/features/repo-analysis/RepoContext'
import { CATEGORIES } from '@/lib/categories'

const glass = 'rounded-2xl border border-white/10 bg-black/45 shadow-2xl backdrop-blur-xl'

export default function StructureMapPage() {
  const { analysis } = useRepo()
  const [selectedId, setSelectedId] = useState(null)
  const root = useRef(null)
  const detailsRef = useRef(null)

  const graph = analysis?.graph
  const nodesById = useMemo(() => new Map((graph?.nodes ?? []).map((n) => [n.id, n])), [graph])
  const selectedNode = nodesById.get(selectedId)

  // Overlay panels glide in
  useEffect(() => {
    if (!root.current) return
    const ctx = gsap.context(() => {
      gsap.from('[data-anim="hud"]', { opacity: 0, y: -14, duration: 0.7, stagger: 0.12, ease: 'power3.out', delay: 0.2 })
    }, root)
    return () => ctx.revert()
  }, [graph])

  // The details panel slides in each time a node is picked
  useEffect(() => {
    if (selectedNode && detailsRef.current) {
      gsap.fromTo(detailsRef.current, { x: 40, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4, ease: 'power3.out' })
    }
  }, [selectedNode])

  if (!analysis) {
    return (
      <div className="h-full overflow-y-auto px-4 py-8">
        <EmptyRepoState
          icon={Network}
          title="Structure Map"
          description="Analyse a repository to see how its files import each other as a living, draggable graph."
        />
      </div>
    )
  }

  if (!graph?.nodes.length) {
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

  return (
    <div
      ref={root}
      className="relative h-full w-full overflow-hidden bg-[radial-gradient(ellipse_at_30%_20%,oklch(0.24_0.06_285)_0%,transparent_55%),radial-gradient(ellipse_at_80%_80%,oklch(0.22_0.07_200)_0%,transparent_50%)]"
    >
      <div aria-hidden className="bg-grid pointer-events-none absolute inset-0 opacity-40" />
      <ForceGraph graph={graph} selectedId={selectedId} onSelect={setSelectedId} />

      {/* Top-left HUD: title, stats, legend */}
      <div data-anim="hud" className={`${glass} pointer-events-none absolute left-4 top-4 max-w-[min(90vw,22rem)] space-y-3 p-4`}>
        <div className="flex items-center gap-2">
          <Network className="size-4 text-primary" />
          <h1 className="text-sm font-semibold tracking-wide">Dependency graph</h1>
        </div>
        <p className="font-mono text-xs text-muted-foreground">
          {graph.nodes.length} {isCollapsed ? 'components' : 'files'} · {graph.edges.length} imports
        </p>
        <div className="flex flex-wrap gap-x-3 gap-y-1.5">
          {categoriesPresent.map((key) => (
            <span key={key} className="flex items-center gap-1.5 text-xs">
              <span className={`size-2.5 rounded-full ${CATEGORIES[key].dot}`} style={{ boxShadow: `0 0 8px var(--cat-${key})` }} />
              {CATEGORIES[key].label}
            </span>
          ))}
        </div>
      </div>

      {/* Hint */}
      {!selectedNode && (
        <div data-anim="hud" className={`${glass} pointer-events-none absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 px-4 py-2 text-xs text-muted-foreground`}>
          <MousePointerClick className="size-3.5" />
          Drag nodes · scroll to zoom · click a node to inspect
        </div>
      )}

      {/* Right: details of the selected node */}
      {selectedNode && (
        <div ref={detailsRef} className={`${glass} absolute bottom-4 right-4 top-4 z-10 flex w-[min(92vw,22rem)] flex-col overflow-hidden`}>
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Inspector</span>
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              aria-label="Close inspector"
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <NodeDetails node={selectedNode} nodesById={nodesById} onSelect={setSelectedId} />
          </div>
        </div>
      )}
    </div>
  )
}
