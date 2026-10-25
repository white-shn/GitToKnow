import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { Bot, FileCode2, Loader2, RotateCcw, Send, Sparkles, X } from 'lucide-react'
import Markdown from '@/components/Markdown'
import { useRepo } from '@/features/repo-analysis/RepoContext'
import { useIndexStatus } from '@/hooks/useIndexStatus'
import { cn } from '@/lib/utils'
import { useChat } from './useChat'

const SUGGESTIONS = [
  'What does this project do?',
  'Where is the main entry point?',
  'How is the code organised?',
  'Walk me through a request end to end.',
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
      className="inline-flex max-w-full items-center gap-1 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[11px] text-primary transition-colors hover:bg-primary/15 focus-visible:outline-2 focus-visible:outline-ring"
    >
      <FileCode2 className="size-3 shrink-0" />
      <span className="truncate">{citation.path.split('/').slice(-2).join('/')}:{range}</span>
    </button>
  )
}

function AssistantMessage({ message, onOpen }) {
  const citations = message.citations ?? []
  const byId = new Map(citations.map((c) => [String(c.id), c]))
  const text = message.content.replace(/\[(\d+)\]/g, (m, n) => (byId.has(n) ? `[${n}](cite:${n})` : m))

  return (
    <div className="space-y-2.5">
      <Markdown
        urlTransform={(url) => url}
        components={{
          a: ({ href, children }) => {
            const cit = href?.startsWith('cite:') ? byId.get(href.slice(5)) : null
            if (!cit) return <a href={href} target="_blank" rel="noreferrer" className="text-primary underline">{children}</a>
            return (
              <button
                type="button"
                onClick={() => onOpen(cit.path, cit)}
                title={`${cit.path}:${cit.start_line}`}
                className="mx-0.5 inline-flex size-5 items-center justify-center rounded bg-primary/20 align-baseline text-[11px] font-semibold text-primary hover:bg-primary/35"
              >
                {children}
              </button>
            )
          },
        }}
      >
        {text}
      </Markdown>
      {citations.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-t border-white/10 pt-2">
          {citations.map((c) => (
            <CitationChip key={c.id} citation={c} onOpen={onOpen} />
          ))}
        </div>
      )}
    </div>
  )
}

function IndexBanner({ status }) {
  if (status.status === 'failed') {
    return (
      <p role="alert" className="mx-4 mt-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
        Indexing failed{status.error ? `: ${status.error}` : ''}. Asking a question will retry it.
      </p>
    )
  }
  if (status.status === 'ready' && status.progress >= 1) return null
  const pct = Math.round(status.progress * 100)
  const usable = status.status === 'ready'
  return (
    <div className="mx-4 mt-3 space-y-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2" aria-live="polite">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Loader2 className="size-3 animate-spin text-primary" />
          {usable ? 'Indexing remaining files, chat already works' : 'Reading the codebase'}
        </span>
        <span className="font-mono">{pct}%</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${Math.max(pct, 4)}%` }} />
      </div>
    </div>
  )
}

/** Chat docked on the right, available on every page. Stays mounted while closed so the conversation is kept. */
export default function ChatSidebar({ open, onClose }) {
  const { analysis, repoId, openFile } = useRepo()
  const { messages, loading, send, clear } = useChat(repoId)
  const indexStatus = useIndexStatus(repoId)
  const [input, setInput] = useState('')
  const endRef = useRef(null)
  const panelRef = useRef(null)
  const inputRef = useRef(null)

  // Slide in/out; the panel keeps its inner width so content doesn't reflow while the dock animates
  useEffect(() => {
    gsap.to(panelRef.current, { width: open ? Math.min(420, window.innerWidth) : 0, duration: 0.55, ease: 'power3.inOut' })
    if (open) setTimeout(() => inputRef.current?.focus(), 450)
  }, [open])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, loading])

  const blocked = indexStatus.status === 'pending' || indexStatus.status === 'indexing'

  function submit(question) {
    const q = question.trim()
    if (!q || loading || blocked) return
    setInput('')
    send(q)
  }

  return (
    <aside
      ref={panelRef}
      aria-label="Ask the repo"
      aria-hidden={!open}
      inert={!open}
      style={{ width: 0 }}
      className="relative z-20 h-full shrink-0 overflow-hidden border-l border-white/10 bg-black/30 backdrop-blur-xl"
    >
      <div className="flex h-full w-[min(420px,100vw)] flex-col">
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 px-4">
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-md bg-primary/15 text-primary ring-1 ring-primary/30">
              <Sparkles className="size-3.5" />
            </span>
            <h2 className="text-sm font-semibold">Ask the repo</h2>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button type="button" onClick={clear} aria-label="Clear conversation" title="Clear conversation" className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground">
                <RotateCcw className="size-3.5" />
              </button>
            )}
            <button type="button" onClick={onClose} aria-label="Close chat" title="Close" className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground">
              <X className="size-4" />
            </button>
          </div>
        </div>

        <IndexBanner status={indexStatus} />

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {messages.length === 0 && (
            <div className="space-y-5 pt-4 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/25">
                <Bot className="size-6" />
              </div>
              <div>
                <p className="font-medium">Ask anything about {analysis?.meta.repo}</p>
                <p className="mx-auto mt-1 max-w-[18rem] text-xs text-muted-foreground">
                  Answers come from the repository's own code, with clickable references to the exact lines.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={blocked || loading}
                    onClick={() => submit(s)}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-xs transition-colors hover:border-primary/50 hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div
                role={m.error ? 'alert' : undefined}
                className={cn(
                  'max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                  m.role === 'user' ? 'rounded-br-sm bg-primary text-primary-foreground' : 'rounded-bl-sm border border-white/10 bg-white/5',
                  m.error && 'border-destructive/50 bg-destructive/10 text-destructive',
                )}
              >
                {m.role === 'user' || m.error ? <p className="whitespace-pre-wrap">{m.content}</p> : <AssistantMessage message={m} onOpen={openFile} />}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
              <Loader2 className="size-3.5 animate-spin text-primary" /> Searching the code...
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            submit(input)
          }}
          className="flex shrink-0 gap-2 border-t border-white/10 p-3"
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={blocked ? 'Indexing the codebase...' : 'Ask about this codebase...'}
            aria-label="Question"
            autoComplete="off"
            disabled={blocked}
            className="h-10 min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/60 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={loading || blocked || !input.trim()}
            aria-label="Send question"
            className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </button>
        </form>
      </div>
    </aside>
  )
}
