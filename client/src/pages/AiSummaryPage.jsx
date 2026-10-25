import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ExternalLink, FileCode2, GitFork, Layers, Package, Scale, Sparkles, Star } from 'lucide-react'
import EmptyRepoState from '@/components/layout/EmptyRepoState'
import Markdown from '@/components/Markdown'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import LanguageBar from '@/features/repo-analysis/LanguageBar'
import { useRepo } from '@/features/repo-analysis/RepoContext'
import { useOverview } from '@/hooks/useOverview'
import { categoryOf } from '@/lib/categories'

export default function AiSummaryPage() {
  const { analysis, repoId, openFile } = useRepo()
  const { status, overview, error, retry } = useOverview(repoId)
  const root = useRef(null)

  // Banner and cards rise in one after another
  useEffect(() => {
    if (!root.current) return
    const ctx = gsap.context(() => {
      gsap.from('[data-slot="card"], [data-banner]', { opacity: 0, y: 26, duration: 0.65, stagger: 0.07, ease: 'power3.out' })
    }, root)
    return () => ctx.revert()
  }, [repoId])

  if (!analysis) {
    return (
      <div className="h-full overflow-y-auto px-4 py-8">
        <EmptyRepoState
          icon={Sparkles}
          title="AI-Powered Codebase Summary"
          description="Enter a GitHub repository to generate an automated executive summary, language breakdown, frameworks, and architecture overview."
        />
      </div>
    )
  }

  const { meta, languages, frameworks = [], dependencies = [], files = [] } = analysis
  const importantFiles = files.filter((f) => f.important)

  return (
    <div ref={root} className="h-full overflow-y-auto px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Repo Header Summary Banner */}
        <div data-banner className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-white/10 bg-black/30 p-5 shadow-xl backdrop-blur-xl">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-mono text-2xl font-bold tracking-tight">
                {meta.owner}/<span className="text-primary">{meta.repo}</span>
              </h1>
              <a
                href={meta.html_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border bg-background/80 px-2.5 py-1 font-mono text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                GitHub <ExternalLink className="size-3" />
              </a>
            </div>
            {meta.description && (
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                {meta.description}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1.5 px-3 py-1 font-mono text-xs">
              <Star className="size-3.5 fill-amber-400 text-amber-400" />
              {meta.stars?.toLocaleString() ?? 0} stars
            </Badge>
            <Badge variant="outline" className="gap-1.5 px-3 py-1 font-mono text-xs">
              <GitFork className="size-3.5 text-muted-foreground" />
              {meta.forks?.toLocaleString() ?? 0} forks
            </Badge>
            {meta.license && (
              <Badge variant="outline" className="gap-1.5 px-3 py-1 font-mono text-xs">
                <Scale className="size-3.5 text-muted-foreground" />
                {meta.license}
              </Badge>
            )}
            <Badge variant="secondary" className="px-3 py-1 font-mono text-xs">
              {meta.file_count} files
            </Badge>
          </div>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Column: AI Summary + Key Files */}
          <div className="space-y-6 lg:col-span-2">
            {/* AI Summary Card */}
            <Card className="shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between border-b px-6 py-4">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Sparkles className="size-4 text-primary" />
                  Codebase Executive Summary
                </CardTitle>
                {status === 'ready' && (
                  <Badge variant="secondary" className="font-mono text-xs">
                    Gemma 4 AI
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="p-6">
                {status === 'loading' && (
                  <div className="space-y-3" aria-busy="true">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-11/12" />
                    <Skeleton className="h-4 w-4/5" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                )}
                {status === 'error' && (
                  <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span>Summary generation failed: {error}</span>
                    <Button variant="outline" size="sm" onClick={retry}>
                      Retry
                    </Button>
                  </div>
                )}
                {status === 'ready' && <Markdown>{overview}</Markdown>}
              </CardContent>
            </Card>

            {/* Key Entry Points & Important Files */}
            {importantFiles.length > 0 && (
              <Card className="shadow-xs">
                <CardHeader className="border-b px-6 py-4">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <FileCode2 className="size-4 text-primary" />
                    Important Files & Entry Points ({importantFiles.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="divide-y p-0">
                  {importantFiles.map((file) => {
                    const cat = categoryOf(file.category)
                    return (
                      <div
                        key={file.path}
                        className="flex items-center justify-between gap-4 px-6 py-3 transition-colors hover:bg-muted/40"
                      >
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => openFile(file.path)}
                            className="font-mono text-sm font-medium text-primary hover:underline text-left truncate block"
                          >
                            {file.path}
                          </button>
                          {file.reason && (
                            <p className="text-xs text-muted-foreground mt-0.5">{file.reason}</p>
                          )}
                        </div>
                        <Badge variant="outline" className="shrink-0 text-xs font-mono">
                          <span className={`mr-1.5 size-2 rounded-full ${cat.dot}`} />
                          {cat.label}
                        </Badge>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Sidebar: Languages, Frameworks, Dependencies */}
          <div className="space-y-6">
            {/* Languages Bar */}
            <Card className="shadow-xs">
              <CardHeader className="border-b px-5 py-4">
                <CardTitle className="text-sm font-semibold">Languages Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <LanguageBar languages={languages} />
              </CardContent>
            </Card>

            {/* Frameworks Card */}
            {frameworks.length > 0 && (
              <Card className="shadow-xs">
                <CardHeader className="border-b px-5 py-4">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <Layers className="size-4 text-primary" />
                    Detected Frameworks
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2 p-5">
                  {frameworks.map((fw) => (
                    <Badge key={fw} variant="secondary" className="px-2.5 py-1 text-xs font-medium">
                      {fw}
                    </Badge>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Dependencies Card */}
            {dependencies.length > 0 && (
              <Card className="shadow-xs">
                <CardHeader className="border-b px-5 py-4">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <Package className="size-4 text-primary" />
                    Key Dependencies ({dependencies.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="max-h-80 overflow-y-auto p-4 space-y-1.5">
                  {dependencies.map((dep) => (
                    <div
                      key={dep.name}
                      className="flex items-center justify-between rounded-md border bg-background/50 px-3 py-1.5 text-xs font-mono"
                    >
                      <span className="font-medium text-foreground truncate">{dep.name}</span>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {dep.version && <span className="text-muted-foreground">{dep.version}</span>}
                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                          {dep.ecosystem}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
