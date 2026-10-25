import { GitPullRequest, Loader2 } from 'lucide-react'
import EmptyRepoState from '@/components/layout/EmptyRepoState'
import Markdown from '@/components/Markdown'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import PullRequestGroup from '@/features/pr-review/PullRequestGroup'
import { useRepo } from '@/features/repo-analysis/RepoContext'
import { usePullRequestReview } from '@/hooks/usePullRequestReview'

function AiReview({ ai }) {
  if (ai.status === 'no_prs') return null
  if (ai.status === 'loading') {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 py-5 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" /> Asking the AI reviewer…
        </CardContent>
      </Card>
    )
  }
  if (ai.status === 'ok') {
    return (
      <Card className="border-primary/30">
        <CardHeader className="border-b pb-4">
          <CardTitle className="text-base">AI reviewer</CardTitle>
          <CardDescription>Advisory only: written from PR metadata, not from reading the diffs.</CardDescription>
        </CardHeader>
        <CardContent className="pt-5"><Markdown>{ai.text}</Markdown></CardContent>
      </Card>
    )
  }
  return (
    <Card>
      <CardContent className="py-5 text-sm text-muted-foreground">
        {ai.status === 'not_configured'
          ? <>The AI review turns on when <code>FALLBACK_API_KEY</code> is set in <code>server/.env</code>. </>
          : <>The AI review is unavailable right now{ai.detail ? ` (${ai.detail})` : ''}. </>}
        The rule-based recommendations below still apply.
      </CardContent>
    </Card>
  )
}

function ReviewBody({ repoId }) {
  const { status, review, error, ai, reload } = usePullRequestReview(repoId)

  return (
    <div className="h-full overflow-y-auto px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-white/10 bg-black/30 p-5">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold"><GitPullRequest className="size-5 text-primary" /> PR merge advisor</h1>
            <p className="mt-1 text-sm text-muted-foreground">Ranks competing PRs by readiness, overlap, size, and test coverage signals.</p>
          </div>
          <Button variant="outline" onClick={() => reload(true)} disabled={status === 'loading'}>Refresh review</Button>
        </div>

        {status === 'loading' && (
          <Card>
            <CardContent className="flex items-center gap-3 py-8 text-sm text-muted-foreground">
              <Loader2 className="size-5 animate-spin text-primary" /> Fetching open PRs and comparing changed files…
            </CardContent>
          </Card>
        )}
        {status === 'error' && (
          <Card>
            <CardContent className="flex items-center justify-between gap-3 py-6 text-sm">
              <span className="text-destructive">Could not review PRs: {error}</span>
              <Button size="sm" onClick={() => reload(false)}>Try again</Button>
            </CardContent>
          </Card>
        )}
        {status === 'ready' && (
          <>
            {review.open_pr_count === 0
              ? <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No open pull requests found for this repository.</CardContent></Card>
              : <AiReview ai={ai} />}
            {review.truncated && (
              <p className="text-xs text-muted-foreground">Showing the 20 most recent open pull requests; older ones were not reviewed.</p>
            )}
            {review.groups.map((group) => <PullRequestGroup key={group.issue} group={group} />)}
          </>
        )}
      </div>
    </div>
  )
}

/** Keyed by repo so switching repos starts from a fresh loading state. */
export default function PullRequestReviewPage() {
  const { analysis, repoId } = useRepo()

  if (!analysis) {
    return (
      <div className="h-full overflow-y-auto px-4 py-8">
        <EmptyRepoState
          icon={GitPullRequest}
          title="Automatic Pull Request Review"
          description="Analyse a public GitHub repository first, then compare its open pull requests and get a merge recommendation."
        />
      </div>
    )
  }
  return <ReviewBody key={repoId} repoId={repoId} />
}
