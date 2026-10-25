import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import {
  ChevronRight,
  Compass,
  Copy,
  FileCode2,
  FolderTree,
  Maximize2,
  Search,
  Star,
  X,
} from 'lucide-react'
import { getFile } from '@/api/repos'
import EmptyRepoState from '@/components/layout/EmptyRepoState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useRepo } from '@/features/repo-analysis/RepoContext'
import FileTree from '@/features/structure/FileTree'
import Sunburst from '@/features/structure/Sunburst'
import { CATEGORIES, categoryOf } from '@/lib/categories'
import { cn } from '@/lib/utils'

function filterTree(nodes, match) {
  return nodes.flatMap((node) => {
    if (node.type === 'file') return match(node) ? [node] : []
    const children = filterTree(node.children, match)
    return children.length ? [{ ...node, children }] : []
  })
}

function CodePreview({ repoId, path, fileInfo, onOpenModal }) {
  const [state, setState] = useState({ status: 'loading' })
  const [copied, setCopied] = useState(false)
  const scroller = useRef(null)

  useEffect(() => {
    if (!path) return
    const controller = new AbortController()
    getFile(repoId, path, controller.signal)
      .then((data) => setState({ status: 'ready', data }))
      .catch((err) => {
        if (err.name !== 'AbortError') setState({ status: 'error', message: err.message })
      })
    return () => controller.abort()
  }, [repoId, path])

  const info = fileInfo.get(path)
  const cat = categoryOf(info?.category)

  function copyCode() {
    if (state.data?.content) {
      navigator.clipboard.writeText(state.data.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      {/* File Top Bar */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2 overflow-hidden">
          <FileCode2 className="size-4 shrink-0 text-primary" />
          <span className="font-mono text-sm font-semibold truncate text-foreground">{path}</span>
          {info?.important && (
            <Badge variant="secondary" className="gap-1 font-mono text-[11px]">
              <Star className="size-3 fill-amber-400 text-amber-400" />
              Important
            </Badge>
          )}
          <Badge variant="outline" className="hidden sm:inline-flex text-[11px] font-mono">
            <span className={`mr-1.5 size-1.5 rounded-full ${cat.dot}`} />
            {cat.label}
          </Badge>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={copyCode}
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <Copy className="size-3.5" />
            {copied ? 'Copied!' : 'Copy'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenModal(path)}
            title="Open in modal dialog"
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <Maximize2 className="size-3.5" />
            Expand
          </Button>
        </div>
      </div>

      {/* Code Body */}
      <div ref={scroller} className="flex-1 overflow-auto bg-card/20 p-4 font-mono text-xs leading-5">
        {state.status === 'loading' && (
          <div className="space-y-2 p-2">
            {Array.from({ length: 18 }, (_, i) => (
              <Skeleton key={i} className="h-4" style={{ width: `${30 + ((i * 19) % 65)}%` }} />
            ))}
          </div>
        )}

        {state.status === 'error' && (
          <div role="alert" className="p-4 text-sm text-destructive">
            Failed to load file: {state.message}
          </div>
        )}

        {state.status === 'ready' && (
          <div>
            {state.data.content.split('\n').map((line, i) => (
              <div key={i + 1} className="flex min-w-max hover:bg-muted/40 transition-colors">
                <span className="w-12 shrink-0 select-none pr-4 text-right text-muted-foreground/60">
                  {i + 1}
                </span>
                <span className="whitespace-pre pr-4 text-foreground">{line || ' '}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ExplorerView() {
  const { analysis, fileInfo, openFile } = useRepo()

  const [query, setQuery] = useState('')
  const [activeCategories, setActiveCategories] = useState(() => new Set())
  const [expanded, setExpanded] = useState(() =>
    analysis?.tree ? new Set(analysis.tree.filter((n) => n.type === 'dir').map((n) => n.path)) : new Set(),
  )
  const [selectedFile, setSelectedFile] = useState(() => {
    if (!analysis?.files) return null
    const firstImportant = analysis.files.find((f) => f.important)
    return firstImportant ? firstImportant.path : analysis.files[0]?.path ?? null
  })

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
    if (!analysis?.files) return {}
    const c = {}
    for (const f of analysis.files) c[f.category] = (c[f.category] ?? 0) + 1
    return c
  }, [analysis])

  const q = query.trim().toLowerCase()
  const filtering = Boolean(q) || activeCategories.size > 0
  const tree = useMemo(() => {
    if (!analysis?.tree) return []
    if (!filtering) return analysis.tree
    return filterTree(analysis.tree, (n) =>
      (!q || n.path.toLowerCase().includes(q)) &&
      (activeCategories.size === 0 || activeCategories.has(fileInfo.get(n.path)?.category)),
    )
  }, [analysis, filtering, q, activeCategories, fileInfo])

  if (!analysis) {
    return (
      <div className="h-full overflow-y-auto px-4 py-8">
        <EmptyRepoState
          icon={FolderTree}
          title="Interactive File Structure"
          description="Analyze a repository to explore its file directory tree, filter by categories, and preview code in a full-screen IDE explorer."
        />
      </div>
    )
  }

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Left Sidebar: File Tree Explorer */}
      <div className="flex w-80 sm:w-96 shrink-0 flex-col border-r border-border/70 bg-card/40 backdrop-blur-xs">
        {/* Explorer Header */}
        <div className="space-y-3 border-b p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search files..."
              aria-label="Search files"
              className="h-9 pl-9 text-xs"
            />
          </div>

          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by category">
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
                      'flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] transition-colors',
                      on
                        ? 'border-primary/60 bg-primary/10 text-foreground'
                        : 'text-muted-foreground hover:bg-accent',
                    )}
                  >
                    <span className={cn('size-1.5 rounded-full', c.dot)} />
                    {c.label}
                    <span className="font-mono text-[10px] text-muted-foreground">{counts[key]}</span>
                  </button>
                )
              })}
          </div>
        </div>

        {/* Tree List */}
        <div className="flex-1 overflow-y-auto p-2">
          {tree.length ? (
            <FileTree
              nodes={tree}
              expanded={expanded}
              onToggle={toggleDir}
              forceOpen={filtering}
              fileInfo={fileInfo}
              onOpen={(path) => setSelectedFile(path)}
            />
          ) : (
            <p className="p-6 text-center text-xs text-muted-foreground">No files match your filters.</p>
          )}
        </div>
      </div>

      {/* Right Main Pane: Code Viewer */}
      <div className="flex-1 overflow-hidden">
        {selectedFile ? (
          <CodePreview
            repoId={analysis.repo_id}
            path={selectedFile}
            fileInfo={fileInfo}
            onOpenModal={openFile}
          />
        ) : (
          <div className="flex h-full items-center justify-center p-8 text-center text-muted-foreground">
            <div className="max-w-md space-y-2">
              <FolderTree className="mx-auto size-10 text-muted-foreground/60" />
              <p className="font-medium text-foreground">Select a file from the explorer</p>
              <p className="text-xs">Browse files and folders on the left to preview their source code.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const glass = 'rounded-2xl border border-white/10 bg-black/45 shadow-2xl backdrop-blur-xl'

/** The whole codebase as an interactive sunburst: click folders to dive in, click a file to read it. */
function GalaxyView() {
  const { analysis, fileInfo, openFile } = useRepo()
  const [focusPath, setFocusPath] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const codePanel = useRef(null)

  useEffect(() => {
    if (selectedFile && codePanel.current) {
      gsap.fromTo(codePanel.current, { x: 70, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, ease: 'power3.out' })
    }
  }, [selectedFile])

  const parts = focusPath ? focusPath.split('/') : []
  const present = [...new Set(analysis.files.map((f) => f.category))].filter((k) => CATEGORIES[k])

  return (
    <div className="flex h-full min-h-0">
      <div className="relative min-w-0 flex-1 overflow-hidden bg-[radial-gradient(ellipse_at_50%_45%,oklch(0.22_0.05_285)_0%,transparent_65%)]">
        <div aria-hidden className="bg-grid pointer-events-none absolute inset-0 opacity-30" />
        <div className="absolute inset-0 p-3 sm:p-6">
          <Sunburst
            tree={analysis.tree}
            fileInfo={fileInfo}
            selectedFile={selectedFile}
            onSelectFile={setSelectedFile}
            focusPath={focusPath}
            onFocusChange={setFocusPath}
          />
        </div>

        <nav aria-label="Folder path" className={`${glass} absolute left-4 top-4 flex max-w-[70%] flex-wrap items-center gap-0.5 px-2 py-1.5 text-xs`}>
          <button type="button" onClick={() => setFocusPath('')} className="rounded px-1.5 py-0.5 font-mono hover:bg-white/10">repo</button>
          {parts.map((part, i) => (
            <span key={i} className="flex items-center gap-0.5">
              <ChevronRight className="size-3 text-muted-foreground" />
              <button type="button" onClick={() => setFocusPath(parts.slice(0, i + 1).join('/'))} className="rounded px-1.5 py-0.5 font-mono hover:bg-white/10">{part}</button>
            </span>
          ))}
        </nav>

        <div className={`${glass} pointer-events-none absolute bottom-4 left-4 flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-xs`}>
          {present.map((key) => (
            <span key={key} className="flex items-center gap-1.5">
              <span className={`size-2.5 rounded-full ${CATEGORIES[key].dot}`} style={{ boxShadow: `0 0 8px var(--cat-${key})` }} />
              {CATEGORIES[key].label}
            </span>
          ))}
        </div>
        {!selectedFile && (
          <p className={`${glass} pointer-events-none absolute bottom-4 right-4 px-3 py-2 text-xs text-muted-foreground`}>
            Arc size = code volume · click a folder to dive in · click the centre to go back
          </p>
        )}
      </div>

      {selectedFile && (
        <div ref={codePanel} className="relative w-[min(48%,640px)] shrink-0 border-l border-white/10 bg-black/30 backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setSelectedFile(null)}
            aria-label="Close file"
            className="absolute -left-3 top-3 z-10 flex size-6 items-center justify-center rounded-full border border-white/20 bg-background text-muted-foreground shadow-lg transition-colors hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
          <CodePreview repoId={analysis.repo_id} path={selectedFile} fileInfo={fileInfo} onOpenModal={openFile} />
        </div>
      )}
    </div>
  )
}

export default function FileStructurePage() {
  const { analysis } = useRepo()
  const [mode, setMode] = useState('galaxy')

  if (!analysis) {
    return (
      <div className="h-full overflow-y-auto px-4 py-8">
        <EmptyRepoState
          icon={FolderTree}
          title="Interactive File Structure"
          description="Analyse a repository to explore its whole codebase as an interactive galaxy, or browse it like an IDE explorer."
        />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-white/10 bg-black/20 px-4">
        <h1 className="flex items-center gap-2 text-sm font-semibold">
          <FolderTree className="size-4 text-primary" />
          File structure
        </h1>
        <div role="tablist" aria-label="View" className="flex rounded-lg border border-white/10 p-0.5 text-xs">
          {[
            { id: 'galaxy', label: 'Galaxy', icon: Compass },
            { id: 'explorer', label: 'Explorer', icon: FolderTree },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={mode === id}
              onClick={() => setMode(id)}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition-colors',
                mode === id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="size-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1">{mode === 'galaxy' ? <GalaxyView /> : <ExplorerView />}</div>
    </div>
  )
}
