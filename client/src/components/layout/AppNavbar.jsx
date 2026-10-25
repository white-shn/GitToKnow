import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { Link, NavLink } from 'react-router-dom'
import {
  ExternalLink,
  FolderTree,
  GitBranch,
  MessagesSquare,
  Network,
  GitPullRequest,
  RotateCcw,
  Sparkles,
  Star,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import RepoAnalyzeForm from '@/features/repo-analysis/RepoAnalyzeForm'
import { useRepo } from '@/features/repo-analysis/RepoContext'
import { useApiStatus } from '@/hooks/useApiStatus'
import { cn } from '@/lib/utils'

const STATUS = {
  checking: { label: 'Connecting', dot: 'bg-amber-400 animate-pulse' },
  online: { label: 'API online', dot: 'bg-primary' },
  offline: { label: 'API offline', dot: 'bg-destructive' },
}

const NAV_TABS = [
  { path: '/summary', label: 'AI Summary', icon: Sparkles },
  { path: '/structure', label: 'File Structure', icon: FolderTree },
  { path: '/map', label: 'Structure Map', icon: Network },
  { path: '/pull-requests', label: 'PR Review', icon: GitPullRequest },
]

export default function AppNavbar({ chatOpen = false, onToggleChat }) {
  const apiStatus = useApiStatus()
  const { analysis, setAnalysis } = useRepo()
  const [showSwitchModal, setShowSwitchModal] = useState(false)
  const header = useRef(null)

  useEffect(() => {
    const tween = gsap.fromTo(header.current, { y: -56, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out' })
    return () => tween.kill()
  }, [])

  const currentStatus = STATUS[apiStatus] || STATUS.online
  const meta = analysis?.meta

  return (
    <>
      <header ref={header} className="sticky top-0 z-40 flex h-14 w-full shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-black/40 px-4 backdrop-blur-xl">
        {/* Left: Logo + Current Repo Badge */}
        <div className="flex items-center gap-3">
          <Link
            to="/summary"
            className="group flex items-center gap-2 font-semibold tracking-tight transition-opacity hover:opacity-90"
          >
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/30">
              <GitBranch className="size-3.5" />
            </div>
            <span className="text-base font-bold">GitToKnow</span>
          </Link>

          {meta && (
            <div className="hidden items-center gap-2 border-l border-border/60 pl-3 md:flex">
              <a
                href={meta.html_url}
                target="_blank"
                rel="noreferrer"
                className="group flex items-center gap-1.5 font-mono text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <span>{meta.owner}/</span>
                <span className="font-semibold text-foreground group-hover:text-primary">{meta.repo}</span>
                <ExternalLink className="size-3 text-muted-foreground group-hover:text-primary" />
              </a>

              <Badge variant="outline" className="h-5 gap-1 px-1.5 font-mono text-[11px]">
                <Star className="size-2.5 fill-amber-400 text-amber-400" />
                {meta.stars?.toLocaleString() ?? 0}
              </Badge>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSwitchModal(true)}
                className="h-6 gap-1 px-2 text-[11px] text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="size-2.5" />
                Switch
              </Button>
            </div>
          )}
        </div>

        {/* Center: 4 Full-Screen Page Routes */}
        <nav aria-label="Main Navigation" className="flex items-center gap-1">
          {NAV_TABS.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all sm:text-sm',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
                )
              }
            >
              <Icon className="size-3.5 sm:size-4" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Right: chat toggle + API status */}
        <div className="flex items-center gap-2">
          {meta && (
            <button
              type="button"
              onClick={onToggleChat}
              aria-pressed={chatOpen}
              className={cn(
                'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all sm:text-sm',
                chatOpen
                  ? 'border-primary/60 bg-primary/15 text-primary shadow-[0_0_18px_-4px_var(--primary)]'
                  : 'border-white/10 text-muted-foreground hover:border-primary/40 hover:text-foreground',
              )}
            >
              <MessagesSquare className="size-3.5 sm:size-4" />
              Ask the Repo
            </button>
          )}
          {meta && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSwitchModal(true)}
              className="flex h-7 md:hidden gap-1 px-2 text-xs text-muted-foreground"
            >
              <RotateCcw className="size-3" />
              Switch
            </Button>
          )}

          <Badge variant="outline" className="hidden sm:inline-flex gap-1.5 font-mono text-xs">
            <span className={cn('size-1.5 rounded-full', currentStatus.dot)} />
            {currentStatus.label}
          </Badge>
        </div>
      </header>

      {/* Switch Repo Modal Dialog */}
      {showSwitchModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-xs"
        >
          <div className="relative w-full max-w-lg rounded-xl border bg-card p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b">
              <div>
                <h3 className="text-base font-semibold">Analyse another repository</h3>
                <p className="text-xs text-muted-foreground">Enter a GitHub repository URL</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSwitchModal(false)}
                className="size-7 p-0 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </Button>
            </div>
            <div className="pt-4">
              <RepoAnalyzeForm
                onResult={(res) => {
                  if (res) {
                    setAnalysis(res)
                    setShowSwitchModal(false)
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
