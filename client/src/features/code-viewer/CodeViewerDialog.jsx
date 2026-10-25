import { useEffect, useRef, useState } from 'react'
import { getFile } from '@/api/repos'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

function CodeBody({ repoId, path, startLine, endLine }) {
  const [state, setState] = useState({ status: 'loading' })
  const scroller = useRef(null)

  useEffect(() => {
    const controller = new AbortController()
    getFile(repoId, path, controller.signal)
      .then((data) => setState({ status: 'ready', data }))
      .catch((err) => {
        if (err.name !== 'AbortError') setState({ status: 'error', message: err.message })
      })
    return () => controller.abort()
  }, [repoId, path])

  // Jump to the cited line once the file has rendered
  useEffect(() => {
    if (state.status === 'ready' && startLine) {
      scroller.current?.querySelector(`[data-line="${startLine}"]`)?.scrollIntoView({ block: 'center' })
    }
  }, [state.status, startLine])

  if (state.status === 'loading') {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 10 }, (_, i) => (
          <Skeleton key={i} className="h-4" style={{ width: `${40 + ((i * 17) % 55)}%` }} />
        ))}
      </div>
    )
  }
  if (state.status === 'error') {
    return <p role="alert" className="p-4 text-sm text-destructive">{state.message}</p>
  }

  const lines = state.data.content.split('\n')
  const end = endLine ?? startLine
  return (
    <div ref={scroller} className="max-h-[65vh] overflow-auto py-2 font-mono text-xs leading-5">
      {lines.map((text, i) => {
        const n = i + 1
        const cited = startLine && n >= startLine && n <= end
        return (
          <div key={n} data-line={n} className={cn('flex min-w-max', cited && 'bg-primary/15')}>
            <span className="w-12 shrink-0 select-none pr-3 text-right text-muted-foreground">{n}</span>
            <span className="whitespace-pre pr-4">{text || ' '}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function CodeViewerDialog({ repoId, target, onClose }) {
  return (
    <Dialog open={Boolean(target)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="border-b px-4 py-3 pr-12">
          <DialogTitle className="flex flex-wrap items-center gap-2 font-mono text-sm font-medium">
            {target?.path}
            {target?.startLine && (
              <Badge variant="secondary" className="font-mono text-xs">
                lines {target.startLine}
                {target.endLine && target.endLine !== target.startLine ? `-${target.endLine}` : ''}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="sr-only">Source file from the analysed repository</DialogDescription>
        </DialogHeader>
        {target && (
          <CodeBody
            key={`${target.path}:${target.startLine}`}
            repoId={repoId}
            path={target.path}
            startLine={target.startLine}
            endLine={target.endLine}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
