import { ExternalLink, GitFork, RotateCcw, Scale, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useRepo } from '@/features/repo-analysis/RepoContext'

export default function RepoHeader({ onSwitchRepo }) {
  const { analysis, clearAnalysis } = useRepo()
  if (!analysis?.meta) return null

  const { meta } = analysis

  function handleSwitch() {
    if (onSwitchRepo) {
      onSwitchRepo()
    } else {
      clearAnalysis()
    }
  }

  return (
    <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border bg-card/60 p-4 backdrop-blur-xs">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2.5">
          <a
            href={meta.html_url}
            target="_blank"
            rel="noreferrer"
            className="group inline-flex items-center gap-2 font-mono text-lg font-semibold hover:text-primary transition-colors"
          >
            {meta.owner}/<span className="text-primary">{meta.repo}</span>
            <ExternalLink className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </a>
        </div>
        {meta.description && (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground leading-relaxed line-clamp-2">
            {meta.description}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="gap-1.5 font-mono text-xs">
          <Star className="size-3 text-amber-400 fill-amber-400" />
          {meta.stars?.toLocaleString() ?? 0}
        </Badge>
        <Badge variant="outline" className="gap-1.5 font-mono text-xs">
          <GitFork className="size-3 text-muted-foreground" />
          {meta.forks?.toLocaleString() ?? 0}
        </Badge>
        {meta.license && (
          <Badge variant="outline" className="gap-1.5 font-mono text-xs">
            <Scale className="size-3 text-muted-foreground" />
            {meta.license}
          </Badge>
        )}
        <Badge variant="secondary" className="font-mono text-xs">
          {meta.file_count} files
        </Badge>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSwitch}
          className="ml-1 h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="size-3" />
          Switch Repo
        </Button>
      </div>
    </div>
  )
}
