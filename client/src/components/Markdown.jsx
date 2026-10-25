import ReactMarkdown from 'react-markdown'
import { cn } from '@/lib/utils'

// Tailwind-styled renderers (no typography plugin); pass `components` to override any of them.
const base = {
  h1: (p) => <h1 className="mb-3 mt-5 text-xl font-semibold first:mt-0" {...p} />,
  h2: (p) => <h2 className="mb-2 mt-5 text-lg font-semibold first:mt-0" {...p} />,
  h3: (p) => <h3 className="mb-2 mt-4 text-base font-semibold first:mt-0" {...p} />,
  p: (p) => <p className="mb-3 leading-relaxed last:mb-0" {...p} />,
  ul: (p) => <ul className="mb-3 list-disc space-y-1 pl-5" {...p} />,
  ol: (p) => <ol className="mb-3 list-decimal space-y-1 pl-5" {...p} />,
  a: (p) => <a className="text-primary underline underline-offset-2" target="_blank" rel="noreferrer" {...p} />,
  strong: (p) => <strong className="font-semibold text-foreground" {...p} />,
  blockquote: (p) => <blockquote className="mb-3 border-l-2 pl-3 text-muted-foreground" {...p} />,
  pre: (p) => <pre className="mb-3 overflow-x-auto rounded-md border bg-background p-3 font-mono text-xs" {...p} />,
  code: ({ className, ...p }) => (
    <code className={cn('rounded bg-muted px-1 py-0.5 font-mono text-[0.85em] [pre_&]:bg-transparent [pre_&]:p-0', className)} {...p} />
  ),
}

export default function Markdown({ children, components, className, ...props }) {
  return (
    <div className={cn('text-sm text-foreground/90', className)}>
      <ReactMarkdown components={{ ...base, ...components }} {...props}>
        {children}
      </ReactMarkdown>
    </div>
  )
}
