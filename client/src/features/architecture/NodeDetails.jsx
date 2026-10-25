import { ArrowDownToLine, ArrowUpFromLine, MousePointerClick } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useRepo } from '@/features/repo-analysis/RepoContext'
import { categoryOf } from '@/lib/categories'

function NodeList({ icon: Icon, title, ids, nodesById, onSelect }) {
  if (!ids.length) return null
  return (
    <section className="space-y-1.5">
      <h4 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5" />
        {title} ({ids.length})
      </h4>
      <ul>
        {ids.map((id) => (
          <li key={id}>
            <button
              type="button"
              onClick={() => onSelect(id)}
              className="w-full truncate rounded-md px-2 py-1 text-left font-mono text-xs hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
              title={id}
            >
              {nodesById.get(id)?.label ?? id}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Side panel for the selected graph node: its files and what it depends on / is used by. */
export default function NodeDetails({ node, nodesById, onSelect }) {
  const { fileInfo, openFile } = useRepo()

  if (!node) {
    return (
      <Card className="items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground">
        <MousePointerClick className="size-6" />
        Click a node to inspect its files and dependencies.
      </Card>
    )
  }

  const category = categoryOf(node.category)
  const isComponent = node.files.length > 1
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="space-y-2 border-b p-4">
        <p className="break-all font-mono text-sm font-medium">{node.path || node.label}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="gap-1.5">
            <span className={`size-2 rounded-full ${category.dot}`} />
            {category.label}
          </Badge>
          {node.group && <Badge variant="secondary">{node.group}</Badge>}
          {isComponent && <Badge variant="secondary">{node.files.length} files</Badge>}
        </div>
        {!isComponent && node.files[0] && (
          <Button size="sm" variant="outline" onClick={() => openFile(node.files[0])}>
            Open file
          </Button>
        )}
      </div>
      <ScrollArea className="h-[40vh] lg:h-[calc(65vh-8rem)]">
        <div className="space-y-4 p-4">
          {isComponent && (
            <section className="space-y-1.5">
              <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Files</h4>
              <ul>
                {node.files.map((path) => (
                  <li key={path}>
                    <button
                      type="button"
                      onClick={() => openFile(path)}
                      title={fileInfo.get(path)?.reason ?? path}
                      className="w-full truncate rounded-md px-2 py-1 text-left font-mono text-xs hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      {path.slice(node.path ? node.path.length + 1 : 0)}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <NodeList icon={ArrowUpFromLine} title="Depends on" ids={node.imports} nodesById={nodesById} onSelect={onSelect} />
          <NodeList icon={ArrowDownToLine} title="Used by" ids={node.imported_by} nodesById={nodesById} onSelect={onSelect} />
          {!node.imports.length && !node.imported_by.length && (
            <p className="text-sm text-muted-foreground">No import relationships recorded for this node.</p>
          )}
        </div>
      </ScrollArea>
    </Card>
  )
}
