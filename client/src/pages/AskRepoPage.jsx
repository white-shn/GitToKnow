import { useEffect, useRef, useState } from 'react'
import {
  Bot,
  FileCode2,
  Loader2,
  MessagesSquare,
  RotateCcw,
  Send,
  Sparkles,
  User,
} from 'lucide-react'
import EmptyRepoState from '@/components/layout/EmptyRepoState'
import Markdown from '@/components/Markdown'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useChat } from '@/features/chat/useChat'
import { useRepo } from '@/features/repo-analysis/RepoContext'
import { cn } from '@/lib/utils'

const SUGGESTIONS = [
  'What does this project do?',
  'Where is the main entry point?',
  'How is the code organized across modules?',
  'Explain the request and data flow through the app.',
]

function CitationChip({ citation, onOpen }) {
  const range =
    citation.end_line && citation.end_line !== citation.start_line
      ? `${citation.start_line}-${citation.end_line}`
      : citation.start_line
  return (
    <button
      type="button"
      onClick={() => onOpen(citation.path, citation)}
      title={citation.snippet || citation.path}
      className="inline-flex max-w-full items-center gap-1 rounded-md border border-border/80 bg-background/80 px-2 py-0.5 font-mono text-xs text-primary hover:bg-accent transition-colors focus-visible:outline-2 focus-visible:outline-ring"
    >
      <FileCode2 className="size-3 shrink-0" />
      <span className="truncate">{citation.path}:{range}</span>
    </button>
  )
}

function AssistantMessage({ message, onOpen }) {
  const citations = message.citations ?? []
  const byId = new Map(citations.map((c) => [String(c.id), c]))

  const text = message.content.replace(/\[(\d+)\]/g, (m, n) =>
    byId.has(n) ? `[${n}](cite:${n})` : m,
  )

  return (
    <div className="space-y-3">
      <Markdown
        components={{
          a: ({ href, children }) => {
            if (href?.startsWith('cite:')) {
              const cit = byId.get(href.slice(5))
              return cit ? <CitationChip citation={cit} onOpen={onOpen} /> : children
            }
            return (
              <a href={href} target="_blank" rel="noreferrer" className="text-primary underline">
                {children}
              </a>
            )
          },
        }}
      >
        {text}
      </Markdown>

      {citations.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/40">
          <span className="text-[11px] font-medium text-muted-foreground mr-1">Citations:</span>
          {citations.map((c) => (
            <CitationChip key={c.id} citation={c} onOpen={onOpen} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function AskRepoPage() {
  const { analysis, repoId, openFile } = useRepo()
  const { messages, loading, send, clear } = useChat(repoId)
  const [input, setInput] = useState('')
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  function handleSubmit(e) {
    e?.preventDefault()
    const q = input.trim()
    if (!q || loading) return
    setInput('')
    send(q)
  }

  function handleSuggestion(text) {
    if (loading) return
    send(text)
  }

  if (!analysis) {
    return (
      <div className="h-full overflow-y-auto px-4 py-8">
        <EmptyRepoState
          icon={MessagesSquare}
          title="Ask the Repo (AI Assistant)"
          description="Analyze a repository to ask questions about the codebase with retrieval-grounded answers and source code citations."
        />
      </div>
    )
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background">
      {/* Top Bar for Chat Studio */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <MessagesSquare className="size-4 text-primary" />
          <h2 className="text-sm font-semibold tracking-tight">Codebase Q&A Studio</h2>
          <Badge variant="outline" className="font-mono text-xs">
            {analysis.meta.owner}/{analysis.meta.repo}
          </Badge>
        </div>

        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clear}
            className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="size-3" />
            Clear
          </Button>
        )}
      </div>

      {/* Main Messages Stream */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
        <div className="mx-auto max-w-4xl space-y-6">
          {messages.length === 0 ? (
            <div className="py-12 text-center space-y-6">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
                <Bot className="size-7" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold tracking-tight">
                  Ask anything about {analysis.meta.repo}
                </h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Answers are grounded in the repository files using retrieval-augmented generation (RAG)
                  with clickable line citations.
                </p>
              </div>

              {/* Suggestions Grid */}
              <div className="mx-auto max-w-2xl pt-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Suggested Prompts
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleSuggestion(s)}
                      className="group flex items-start gap-2.5 rounded-xl border border-border/80 bg-card/60 p-3.5 text-left text-xs text-foreground transition-all hover:border-primary/50 hover:bg-card hover:shadow-xs"
                    >
                      <Sparkles className="size-3.5 shrink-0 text-primary mt-0.5" />
                      <span className="leading-relaxed">{s}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div
                key={i}
                className={cn('flex gap-3', m.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                {m.role !== 'user' && (
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/30">
                    <Bot className="size-4" />
                  </div>
                )}

                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed shadow-xs',
                    m.role === 'user'
                      ? 'bg-primary text-primary-foreground font-medium rounded-tr-xs'
                      : 'border border-border/80 bg-card/90 text-foreground rounded-tl-xs',
                    m.error && 'border-destructive/60 bg-destructive/10 text-destructive',
                  )}
                  role={m.error ? 'alert' : undefined}
                >
                  {m.role === 'user' || m.error ? (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  ) : (
                    <AssistantMessage message={m} onOpen={openFile} />
                  )}
                </div>

                {m.role === 'user' && (
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <User className="size-4" />
                  </div>
                )}
              </div>
            ))
          )}

          {loading && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground animate-pulse">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Bot className="size-4" />
              </div>
              <div className="flex items-center gap-2 rounded-xl border bg-card/60 px-4 py-2.5 text-xs">
                <Loader2 className="size-3.5 animate-spin text-primary" />
                <span>Analysing codebase and formulating answer...</span>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      {/* Sticky Bottom Prompt Input */}
      <div className="shrink-0 border-t border-border/70 bg-card/80 p-4 backdrop-blur-md">
        <form onSubmit={handleSubmit} className="mx-auto flex max-w-4xl gap-2">
          <div className="relative flex-1">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask a question about ${analysis.meta.repo}...`}
              aria-label="Question"
              autoComplete="off"
              className="h-11 rounded-xl bg-background/90 px-4 text-sm shadow-xs focus-visible:ring-primary"
            />
          </div>
          <Button
            type="submit"
            size="lg"
            disabled={loading || !input.trim()}
            className="h-11 rounded-xl px-5 font-medium shadow-xs"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            <span className="hidden sm:inline">Ask</span>
          </Button>
        </form>
      </div>
    </div>
  )
}
