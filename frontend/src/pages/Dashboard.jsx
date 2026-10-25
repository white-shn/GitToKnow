import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { BrainCircuit, FolderTree, MessagesSquare } from 'lucide-react'
import Header from '@/components/layout/Header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import AnalysisResult from '@/features/repo-analysis/AnalysisResult'
import RepoAnalyzeForm from '@/features/repo-analysis/RepoAnalyzeForm'
import { useApiStatus } from '@/hooks/useApiStatus'

const FEATURES = [
  { icon: FolderTree, title: 'Structure map', text: 'See how the codebase is organised at a glance.' },
  { icon: BrainCircuit, title: 'AI summaries', text: 'Plain-English explanations of modules and flows.' },
  { icon: MessagesSquare, title: 'Ask the repo', text: 'Chat with the code using retrieval-augmented answers.' },
]

export default function Dashboard() {
  const apiStatus = useApiStatus()
  const [result, setResult] = useState(null)
  const root = useRef(null)

  // Entrance animation
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      tl.from('[data-anim="header"]', { opacity: 0, y: -12, duration: 0.5, stagger: 0.08 })
        .from('[data-anim="hero"]', { opacity: 0, y: 20, duration: 0.6, stagger: 0.1 }, '-=0.2')
        .from('[data-anim="feature"]', { opacity: 0, y: 24, duration: 0.5, stagger: 0.1 }, '-=0.3')
    }, root)
    return () => ctx.revert()
  }, [])

  // Animate a new result in
  useEffect(() => {
    if (!result) return
    const ctx = gsap.context(() => {
      gsap.from('[data-anim="result"]', { opacity: 0, y: 12, duration: 0.4, ease: 'power2.out' })
    }, root)
    return () => ctx.revert()
  }, [result])

  return (
    <div ref={root} className="relative min-h-screen overflow-hidden">
      <div aria-hidden className="bg-grid pointer-events-none absolute inset-x-0 top-0 h-130" />
      <div className="relative">
        <Header apiStatus={apiStatus} />

        <main className="mx-auto w-full max-w-5xl px-6 pb-16 pt-12 sm:pt-20">
          <section className="mx-auto max-w-2xl text-center">
            <h1 data-anim="hero" className="text-4xl font-bold tracking-tight sm:text-5xl">
              Understand any codebase,{' '}
              <span className="bg-linear-to-r from-emerald-300 to-teal-400 bg-clip-text text-transparent">
                faster
              </span>
              .
            </h1>
            <p data-anim="hero" className="mt-4 text-balance text-muted-foreground">
              Paste a GitHub repository and GitToKnow maps its structure, explains how it works, and
              answers your questions about it.
            </p>
          </section>

          <Card data-anim="hero" className="mx-auto mt-10 max-w-3xl gap-4 py-5">
            <CardContent className="space-y-4 px-5">
              <RepoAnalyzeForm onResult={setResult} />
              {result && <AnalysisResult result={result} />}
            </CardContent>
          </Card>

          <section className="mt-12 grid gap-4 sm:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <Card key={title} data-anim="feature" className="gap-3 py-5">
                <CardHeader className="gap-3 px-5">
                  <Icon className="size-5 text-primary" />
                  <CardTitle className="text-base">{title}</CardTitle>
                  <CardDescription>{text}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </section>
        </main>
      </div>
    </div>
  )
}
