import { FolderTree, MessagesSquare, Network, Sparkles } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import RepoAnalyzeForm from '@/features/repo-analysis/RepoAnalyzeForm'
import { useRepo } from '@/features/repo-analysis/RepoContext'

const FEATURES = [
  { icon: Sparkles, title: 'AI Summary', text: 'Plain-English explanations of modules, tech stack, and entry points.' },
  { icon: FolderTree, title: 'File Structure', text: 'Interactive categorized file tree with line counts and sizes.' },
  { icon: Network, title: 'Structure Map', text: 'Visual graph showing how dependencies and components connect.' },
  { icon: MessagesSquare, title: 'Ask the Repo', text: 'Chat with the code using grounded retrieval-augmented answers.' },
]

export default function EmptyRepoState({
  title = 'Understand any codebase, faster.',
  description = 'Paste a GitHub repository to map its structure, explain how it works, and answer questions about it.',
  icon: FeatureIcon,
}) {
  const { setAnalysis } = useRepo()

  return (
    <div className="mx-auto w-full max-w-4xl py-6 sm:py-10">
      <section className="mx-auto max-w-2xl text-center">
        {FeatureIcon && (
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
            <FeatureIcon className="size-6" />
          </div>
        )}
        <h1 data-anim="hero" className="text-3xl font-bold tracking-tight sm:text-5xl">
          {title}
        </h1>
        <p data-anim="hero" className="mt-4 text-balance text-muted-foreground text-base sm:text-lg">
          {description}
        </p>
      </section>

      <Card data-anim="hero" className="mx-auto mt-8 max-w-3xl border-border/80 shadow-lg">
        <CardContent className="p-6">
          <RepoAnalyzeForm onResult={setAnalysis} />
        </CardContent>
      </Card>

      <section className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map(({ icon: Icon, title: fTitle, text }) => (
          <Card key={fTitle} data-anim="feature" className="border-border/60 bg-card/60 transition-colors hover:border-primary/40">
            <CardHeader className="gap-2.5 p-4">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-4" />
              </div>
              <CardTitle className="text-sm font-semibold">{fTitle}</CardTitle>
              <CardDescription className="text-xs leading-relaxed">{text}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>
    </div>
  )
}
