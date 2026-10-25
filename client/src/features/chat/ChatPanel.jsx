import { useEffect, useRef, useState } from 'react'
import { Bot, FileCode2, Loader2, Send } from 'lucide-react'
import Markdown from '@/components/Markdown'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useRepo } from '@/features/repo-analysis/RepoContext'
import { cn } from '@/lib/utils'
import { useChat } from './useChat'

const SUGGESTIONS = [
  'What does this project do?',
  'Where is the entry point?',
  'How is the code organised?',
  'How does a request flow through the app?',
]

function CitationChip({ citation, onOpen }) {
  const range = citation.end_line && citation.end_line !== citation.start_line
    ? `${citation.start_line}-${citation.end_line}`
    : citation.start_line
  return (
    <button
      type="button"
      onClick={() => onOpen(citation.path, citation)}
      title={citation.snippet || citation.path}
      className="inline-flex max-w-full items-center gap-1 rounded-md border bg-background px-1.5 py-0.5 font-mono text-xs text-primary hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
    >
      <FileCode2 className="size-3 shrink-0" />
      <span className="truncate">{citation.path}:{range}</span>
    </button>
  )
}

function AssistantMessage({ message, onOpen }) {
  const citations = message.citations ?? []
  const byId = new Map(citations.map((c) => [String(c.id), c]))

  // Turn [n] markers into links the Markdown renderer turns back into clickable citation chips
  const text = message.content.replace(/\[(\d+)\]/g, (m, n) => (byId.has(n) ? `[${n}](cite:${n})` : m))
  const components = {
    a: ({ href, children }) => {
      const citation = href?.startsWith('cite:') ? byId.get(href.slice(5)) : null
      if (!citation) return <a href={href} className="text-primary underline" target="_blank" rel="noreferrer">{children}</a>
      return (
        <button
          type="button"
          onClick={() => onOpen(citation.path, citation)}
          title={`${citation.path}:${citation.start_line}`}
          className="mx-0.5 inline-flex size-5 items-center justify-center rounded bg-primary/15 align-baseline text-xs font-medium text-primary hover:bg-primary/25"
        >
          {children}
        </button>
      )
    },
  }

  return (
    <div className="space-y-3">
      <Markdown components={components} urlTransform={(url) => url}>{text}</Markdown>
      {citations.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-t pt-2.5">
          {citations.map((c) => (
            <CitationChip key={c.id} citation={c} onOpen={onOpen} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function ChatPanel() {
  const { repoId, analysis, openFile } = useRepo()
  const { messages, loading, send } = useChat(repoId)
  const [input, setInput] = useState('')
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, loading])

  function submit(question) {
    const q = question.trim()
    if (!q || loading) return
    setInput('')
    send(q)
  }

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="flex h-[55vh] flex-col gap-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="m-auto max-w-md space-y-4 text-center">
            <Bot className="mx-auto size-8 text-primary" />
            <div>
              <p className="font-medium">Ask anything about {analysis.meta.repo}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Answers are grounded in the repository's code, with references you can click.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => submit(s)}
                  className="rounded-full border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
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
              className={cn(
                'max-w-[85%] rounded-xl px-4 py-2.5 text-sm',
                m.role === 'user' ? 'bg-primary text-primary-foreground' : 'border bg-background',
                m.error && 'border-destructive/50 text-destructive',
              )}
              role={m.error ? 'alert' : undefined}
            >
              {m.role === 'user' || m.error ? m.content : <AssistantMessage message={m} onOpen={openFile} />}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
            <Loader2 className="size-4 animate-spin" /> Searching the code...
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit(input)
        }}
        className="flex gap-2 border-t p-3"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about this codebase..."
          aria-label="Question"
          autoComplete="off"
        />
        <Button type="submit" disabled={loading || !input.trim()}>
          <Send /> Ask
        </Button>
      </form>
    </Card>
  )
}
