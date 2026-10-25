import { useState } from 'react'
import { RefreshCw, Sparkles, Star } from 'lucide-react'
import Markdown from '@/components/Markdown'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useOverview } from '@/hooks/useOverview'
import { categoryOf } from '@/lib/categories'
import LanguageBar from './LanguageBar'
import { useRepo } from './RepoContext'

const DEPS_PREVIEW = 24

function AiSummary() {
  const { repoId } = useRepo()
  const { status, overview, error, retry } = useOverview(repoId)

  return (
    <Card className="gap-4 py-5 lg:col-span-2">
      <CardHeader className="px-5">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4 text-primary" />
          AI summary
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5">
        {status === 'loading' && (
          <div className="space-y-2.5" aria-busy="true" aria-label="Generating summary">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        )}
        {status === 'error' && (
          <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span>The AI summary isn't available yet: {error}</span>
            <Button variant="outline" size="sm" onClick={retry}>
              <RefreshCw /> Retry
            </Button>
          </div>
        )}
        {status === 'ready' && <Markdown>{overview}</Markdown>}
      </CardContent>
    </Card>
  )
}

function TechStack() {
  const { analysis } = useRepo()
  const { languages, frameworks } = analysis

  return (
    <Card className="gap-4 py-5">
      <CardHeader className="px-5">
        <CardTitle className="text-base">Tech stack</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 px-5">
        <LanguageBar languages={languages} />
        {frameworks.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {frameworks.map((f) => (
              <Badge key={f} variant="secondary">{f}</Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ImportantFiles() {
  const { analysis, openFile } = useRepo()
  const important = analysis.files.filter((f) => f.important)
  if (!important.length) return null

  return (
    <Card className="gap-3 py-5">
      <CardHeader className="px-5">
        <CardTitle className="flex items-center gap-2 text-base">
          <Star className="size-4 text-primary" />
          Start here
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2">
        <ul>
          {important.map((f) => (
            <li key={f.path}>
              <button
                type="button"
                onClick={() => openFile(f.path)}
                className="flex w-full items-start gap-3 rounded-md px-3 py-2 text-left hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
              >
                <span className={`mt-1.5 size-2 shrink-0 rounded-full ${categoryOf(f.category).dot}`} />
                <span className="min-w-0">
                  <span className="block truncate font-mono text-sm">{f.path}</span>
                  <span className="block text-xs text-muted-foreground">{f.reason}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

function Dependencies() {
  const { analysis } = useRepo()
  const [showAll, setShowAll] = useState(false)
  const { dependencies } = analysis
  if (!dependencies.length) return null

  const shown = showAll ? dependencies : dependencies.slice(0, DEPS_PREVIEW)
  return (
    <Card className="gap-3 py-5">
      <CardHeader className="px-5">
        <CardTitle className="text-base">
          Dependencies <span className="font-normal text-muted-foreground">({dependencies.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5">
        <div className="flex flex-wrap gap-1.5">
          {shown.map((d) => (
            <Badge key={`${d.ecosystem}:${d.name}`} variant="outline" className="font-mono text-xs" title={`${d.ecosystem}${d.dev ? ' (dev)' : ''}`}>
              {d.name}
              {d.version && <span className="text-muted-foreground">{d.version}</span>}
            </Badge>
          ))}
        </div>
        {dependencies.length > DEPS_PREVIEW && (
          <Button variant="ghost" size="sm" className="mt-3" onClick={() => setShowAll((v) => !v)}>
            {showAll ? 'Show fewer' : `Show all ${dependencies.length}`}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

export default function OverviewPanel() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <AiSummary />
      <TechStack />
      <div className="grid gap-4 lg:col-span-3 lg:grid-cols-2">
        <ImportantFiles />
        <Dependencies />
      </div>
    </div>
  )
}
