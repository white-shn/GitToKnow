import { ChevronDown, ChevronRight, File, Folder, FolderOpen, Star } from 'lucide-react'
import { categoryOf } from '@/lib/categories'
import { cn } from '@/lib/utils'

const INDENT_PX = 16

function countFiles(node) {
  return node.type === 'file' ? 1 : node.children.reduce((sum, c) => sum + countFiles(c), 0)
}

function TreeRows({ nodes, depth, expanded, onToggle, forceOpen, fileInfo, onOpen }) {
  return nodes.map((node) => {
    const pad = { paddingLeft: `${depth * INDENT_PX + 8}px` }

    if (node.type === 'dir') {
      const open = forceOpen || expanded.has(node.path)
      return (
        <li key={node.path}>
          <button
            type="button"
            onClick={() => onToggle(node.path)}
            aria-expanded={open}
            style={pad}
            className="flex w-full items-center gap-1.5 rounded-md py-1 pr-2 text-left text-sm hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
          >
            {open ? <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" /> : <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />}
            {open ? <FolderOpen className="size-4 shrink-0 text-primary" /> : <Folder className="size-4 shrink-0 text-primary/70" />}
            <span className="truncate">{node.name}</span>
            <span className="ml-auto font-mono text-xs text-muted-foreground">{countFiles(node)}</span>
          </button>
          {open && (
            <ul>
              <TreeRows nodes={node.children} depth={depth + 1} expanded={expanded} onToggle={onToggle} forceOpen={forceOpen} fileInfo={fileInfo} onOpen={onOpen} />
            </ul>
          )}
        </li>
      )
    }

    const info = fileInfo.get(node.path)
    const category = categoryOf(info?.category)
    return (
      <li key={node.path}>
        <button
          type="button"
          onClick={() => onOpen(node.path)}
          style={{ paddingLeft: `${depth * INDENT_PX + 8 + 20}px` }}
          title={info?.reason ?? node.path}
          className={cn('flex w-full items-center gap-1.5 rounded-md py-1 pr-2 text-left text-sm hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring')}
        >
          <File className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{node.name}</span>
          {info?.important && <Star className="size-3 shrink-0 fill-primary text-primary" aria-label="Important file" />}
          <span className={cn('ml-auto size-2 shrink-0 rounded-full', category.dot)} title={category.label} />
        </button>
      </li>
    )
  })
}

export default function FileTree(props) {
  return (
    <ul role="tree" className="py-1">
      <TreeRows {...props} depth={0} />
    </ul>
  )
}
