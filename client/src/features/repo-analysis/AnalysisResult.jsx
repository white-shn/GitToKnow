import { Badge } from '@/components/ui/badge'

/** Placeholder result view - replace with real analysis output (structure, summary, Q&A). */
export default function AnalysisResult({ result }) {
  return (
    <div data-anim="result" className="space-y-3 rounded-lg border bg-background/60 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-sm">
          {result.owner}/<span className="text-primary">{result.repo}</span>
        </p>
        <Badge variant="secondary" className="font-mono text-xs">
          {result.status}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">{result.message}</p>
    </div>
  )
}
