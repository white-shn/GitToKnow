import { useCallback, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CATEGORIES } from '@/lib/categories'
import { cn } from '@/lib/utils'
import { useRepo } from '@/features/repo-analysis/RepoContext'
import FileTree from './FileTree'

/** Keep only files matching `match`, and the folders that lead to them. */
function filterTree(nodes, match) {
  return nodes.flatMap((node) => {
    if (node.type === 'file') return match(node) ? [node] : []
    const children = filterTree(node.children, match)
    return children.length ? [{ ...node, children }] : []
  })
}

export default function StructurePanel() {
  const { analysis, fileInfo, openFile } = useRepo()
  const [query, setQuery] = useState('')
  const [activeCategories, setActiveCategories] = useState(() => new Set())
  const [expanded, setExpanded] = useState(() => new Set(analysis.tree.filter((n) => n.type === 'dir').map((n) => n.path)))

  const toggleDir = useCallback((path) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (!next.delete(path)) next.add(path)
      return next
    })
  }, [])
  const toggleCategory = (key) =>
    setActiveCategories((prev) => {
      const next = new Set(prev)
      if (!next.delete(key)) next.add(key)
      return next
    })

  const counts = useMemo(() => {
    const c = {}
    for (const f of analysis.files) c[f.category] = (c[f.category] ?? 0) + 1
    return c
  }, [analysis.files])

  const q = query.trim().toLowerCase()
  const filtering = Boolean(q) || activeCategories.size > 0
  const tree = useMemo(() => {
    if (!filtering) return analysis.tree
    return filterTree(analysis.tree, (n) =>
      (!q || n.path.toLowerCase().includes(q)) &&
      (activeCategories.size === 0 || activeCategories.has(fileInfo.get(n.path)?.category)),
    )
  }, [analysis.tree, filtering, q, activeCategories, fileInfo])

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="space-y-3 border-b p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search files..."
            aria-label="Search files"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
          {Object.entries(CATEGORIES)
            .filter(([key]) => counts[key])
            .map(([key, c]) => {
              const on = activeCategories.has(key)
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleCategory(key)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring',
                    on ? 'border-primary/60 bg-primary/10 text-foreground' : 'text-muted-foreground',
                  )}
                >
                  <span className={cn('size-2 rounded-full', c.dot)} />
                  {c.label}
                  <span className="font-mono">{counts[key]}</span>
                </button>
              )
            })}
        </div>
      </div>
      <ScrollArea className="h-[60vh]">
        <div className="p-2">
          {tree.length ? (
            <FileTree nodes={tree} expanded={expanded} onToggle={toggleDir} forceOpen={filtering} fileInfo={fileInfo} onOpen={openFile} />
          ) : (
            <p className="p-6 text-center text-sm text-muted-foreground">No files match your filters.</p>
          )}
        </div>
      </ScrollArea>
    </Card>
  )
}
