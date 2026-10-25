import { Badge } from '@/components/ui/badge'

/** Placeholder result view - replaced by the tabbed workspace (Overview / Structure / Architecture / Chat). */
export default function AnalysisResult({ result }) {
  const { meta, files, languages, graph } = result

  return (
    <div data-anim="result" className="space-y-3 rounded-lg border bg-background/60 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-sm">
          {meta.owner}/<span className="text-primary">{meta.repo}</span>
        </p>
        <Badge variant="secondary" className="font-mono text-xs">
          index: {result.index_status}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">{meta.description}</p>
      <p className="font-mono text-xs text-muted-foreground">
        {files.length} files · {languages.length} languages · {graph.nodes.length} graph nodes
      </p>
    </div>
  )
}
