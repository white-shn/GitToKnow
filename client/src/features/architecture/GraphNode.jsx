import { Handle, Position } from '@xyflow/react'
import { Layers } from 'lucide-react'
import { categoryOf } from '@/lib/categories'
import { cn } from '@/lib/utils'
import { NODE_HEIGHT, NODE_WIDTH } from './layout'

/** A file (or folder component) in the architecture graph, coloured by category. */
export default function GraphNode({ data, selected }) {
  const category = categoryOf(data.category)
  return (
    <div
      style={{ width: NODE_WIDTH, height: NODE_HEIGHT }}
      className={cn(
        'flex items-center gap-2 rounded-lg border bg-card px-3 text-sm shadow-sm transition-colors',
        category.border,
        selected && 'ring-2 ring-primary',
        data.dimmed && 'opacity-35',
      )}
    >
      <Handle type="target" position={Position.Left} className="opacity-0" />
      <span className={cn('size-2 shrink-0 rounded-full', category.dot)} />
      <span className="truncate font-mono text-[13px]" title={data.path || data.label}>{data.label}</span>
      {data.fileCount > 1 && (
        <span className="ml-auto flex shrink-0 items-center gap-1 font-mono text-xs text-muted-foreground" title={`${data.fileCount} files`}>
          <Layers className="size-3" />
          {data.fileCount}
        </span>
      )}
      <Handle type="source" position={Position.Right} className="opacity-0" />
    </div>
  )
}
