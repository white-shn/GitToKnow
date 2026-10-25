import { useEffect, useState } from 'react'
import { CheckCircle2, ExternalLink, GitPullRequest, Loader2, TriangleAlert } from 'lucide-react'
import EmptyRepoState from '@/components/layout/EmptyRepoState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getPullRequestReview } from '@/api/repos'
import { useRepo } from '@/features/repo-analysis/RepoContext'

function Score({ value }) {
  const colour = value >= 80 ? 'text-emerald-400' : value >= 60 ? 'text-amber-400' : 'text-red-400'
  return <span className={`font-mono text-lg font-bold ${colour}`}>{value}/100</span>
}

export default function PullRequestReviewPage() {
  const { analysis, repoId } = useRepo()
  const [state, setState] = useState({ status: 'idle', data: null, error: null })

  const load = () => {
    if (!repoId) return
    setState({ status: 'loading', data: null, error: null })
    getPullRequestReview(repoId)
      .then((data) => setState({ status: 'ready', data, error: null }))
      .catch((error) => setState({ status: 'error', data: null, error: error.message }))
  }

  useEffect(() => { load() }, [repoId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!analysis) return <div className="h-full overflow-y-auto px-4 py-8"><EmptyRepoState icon={GitPullRequest} title="Automatic Pull Request Review" description="Analyse a public GitHub repository first, then compare its open pull requests and get a merge recommendation." /></div>

  return (
    <div className="h-full overflow-y-auto px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-white/10 bg-black/30 p-5">
          <div><h1 className="flex items-center gap-2 text-xl font-bold"><GitPullRequest className="size-5 text-primary" /> PR merge advisor</h1><p className="mt-1 text-sm text-muted-foreground">Ranks competing PRs by readiness, overlap, size, and test coverage signals.</p></div>
          <Button variant="outline" onClick={load} disabled={state.status === 'loading'}>Refresh review</Button>
        </div>

        {state.status === 'loading' && <Card><CardContent className="flex items-center gap-3 py-8 text-sm text-muted-foreground"><Loader2 className="size-5 animate-spin text-primary" /> Fetching open PRs and comparing changed files…</CardContent></Card>}
        {state.status === 'error' && <Card><CardContent className="flex items-center justify-between gap-3 py-6 text-sm"><span className="text-destructive">Could not review PRs: {state.error}</span><Button size="sm" onClick={load}>Try again</Button></CardContent></Card>}
        {state.status === 'ready' && state.data.open_pr_count === 0 && <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No open pull requests found for this repository.</CardContent></Card>}
        {state.status === 'ready' && state.data.groups.map((group) => (
          <Card key={group.issue}>
            <CardHeader className="border-b pb-4"><CardTitle className="flex flex-wrap items-center gap-2 text-base"><span>{group.issue}</span><Badge variant="secondary">Recommend #{group.best_pr_number}</Badge></CardTitle><CardDescription>{group.reason}</CardDescription></CardHeader>
            <CardContent className="space-y-3 pt-5">
              {group.pull_requests.map((pr) => (
                <div key={pr.number} className={`rounded-lg border p-4 ${pr.number === group.best_pr_number ? 'border-primary/50 bg-primary/5' : ''}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-2">{pr.number === group.best_pr_number ? <CheckCircle2 className="size-4 text-emerald-400" /> : <TriangleAlert className="size-4 text-amber-400" />}<a className="font-medium hover:text-primary" href={pr.url} target="_blank" rel="noreferrer">#{pr.number} {pr.title} <ExternalLink className="inline size-3" /></a></div><p className="mt-1 text-xs text-muted-foreground">by {pr.author} · {pr.changed_files} files · +{pr.additions} / −{pr.deletions}{pr.draft ? ' · draft' : ''}</p></div><Score value={pr.score} /></div>
                  <ul className="mt-3 space-y-1 text-sm text-muted-foreground">{pr.recommendations.map((note) => <li key={note}>• {note}</li>)}</ul>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
