import { GitBranch } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const STATUS = {
  checking: { label: 'Connecting', dot: 'bg-amber-400 animate-pulse' },
  online: { label: 'API online', dot: 'bg-primary' },
  offline: { label: 'API offline', dot: 'bg-destructive' },
}

export default function Header({ apiStatus }) {
  const { label, dot } = STATUS[apiStatus]

  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
      <div data-anim="header" className="flex items-center gap-2.5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/30">
          <GitBranch className="size-4" />
        </div>
        <span className="text-lg font-semibold tracking-tight">GitToKnow</span>
      </div>
      <Badge data-anim="header" variant="outline" className="gap-2 font-mono text-xs">
        <span className={cn('size-1.5 rounded-full', dot)} />
        {label}
      </Badge>
    </header>
  )
}
