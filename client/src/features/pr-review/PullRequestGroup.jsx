import { CheckCircle2, ExternalLink, TriangleAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function Score({ value }) {
  const colour = value >= 80 ? 'text-emerald-400' : value >= 60 ? 'text-amber-400' : 'text-red-400'
  return <span className={`font-mono text-lg font-bold ${colour}`}>{value}/100</span>
}

function PullRequestRow({ pr, best }) {
  return (
    <div className={`rounded-lg border p-4 ${best ? 'border-primary/50 bg-primary/5' : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {best ? <CheckCircle2 className="size-4 text-emerald-400" /> : <TriangleAlert className="size-4 text-amber-400" />}
            <a className="font-medium hover:text-primary" href={pr.url} target="_blank" rel="noreferrer">
              #{pr.number} {pr.title} <ExternalLink className="inline size-3" />
            </a>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            by {pr.author} · {pr.changed_files} files · +{pr.additions} / −{pr.deletions}
            {pr.draft ? ' · draft' : ''}
          </p>
        </div>
        <Score value={pr.score} />
      </div>
      <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
        {pr.recommendations.map((note) => (
          <li key={note}>• {note}</li>
        ))}
      </ul>
    </div>
  )
}

/** One issue (or the unlinked bucket) with its competing PRs, best first. */
export default function PullRequestGroup({ group }) {
  return (
    <Card>
      <CardHeader className="border-b pb-4">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          <span>{group.issue}</span>
          <Badge variant="secondary">Recommend #{group.best_pr_number}</Badge>
        </CardTitle>
        <CardDescription>{group.reason}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pt-5">
        {group.pull_requests.map((pr) => (
          <PullRequestRow key={pr.number} pr={pr} best={pr.number === group.best_pr_number} />
        ))}
      </CardContent>
    </Card>
  )
}
