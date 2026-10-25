import { useEffect, useRef } from 'react'
import gsap from 'gsap'
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
  const root = useRef(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('[data-anim="hero"]', { opacity: 0, y: 28, duration: 0.8, stagger: 0.12, ease: 'power3.out' })
      gsap.from('[data-anim="feature"]', { opacity: 0, y: 36, scale: 0.96, duration: 0.7, stagger: 0.1, ease: 'power3.out', delay: 0.35 })
      gsap.to('[data-orb]', { x: 'random(-60, 60)', y: 'random(-40, 40)', duration: 'random(6, 9)', ease: 'sine.inOut', repeat: -1, yoyo: true, stagger: 1.2 })
    }, root)
    return () => ctx.revert()
  }, [])

  return (
    <div ref={root} className="relative mx-auto w-full max-w-4xl py-6 sm:py-10">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div data-orb className="absolute -left-24 top-0 size-80 rounded-full bg-primary/25 blur-3xl" />
        <div data-orb className="absolute -right-20 top-40 size-96 rounded-full bg-cat-backend/20 blur-3xl" />
        <div data-orb className="absolute bottom-0 left-1/3 size-72 rounded-full bg-cat-frontend/15 blur-3xl" />
      </div>
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
