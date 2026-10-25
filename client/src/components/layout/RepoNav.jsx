import { NavLink } from 'react-router-dom'
import { FolderTree, MessagesSquare, Network, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ROUTES = [
  { path: '/summary', label: 'AI Summary', icon: Sparkles, desc: 'Overview & dependencies' },
  { path: '/structure', label: 'File Structure', icon: FolderTree, desc: 'Interactive directory tree' },
  { path: '/map', label: 'Structure Map', icon: Network, desc: 'Architecture graph' },
  { path: '/ask', label: 'Ask the Repo', icon: MessagesSquare, desc: 'RAG codebase chat' },
]

export default function RepoNav() {
  return (
    <nav
      aria-label="Repository sections"
      className="inline-flex w-full flex-wrap items-center gap-1.5 rounded-xl border bg-muted/40 p-1.5 sm:w-auto"
    >
      {NAV_ROUTES.map(({ path, label, icon: Icon }) => (
        <NavLink
          key={path}
          to={path}
          className={({ isActive }) =>
            cn(
              'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 select-none',
              isActive
                ? 'bg-background text-foreground shadow-sm ring-1 ring-border/50'
                : 'text-muted-foreground hover:bg-background/50 hover:text-foreground',
            )
          }
        >
          <Icon className="size-4 shrink-0 text-primary" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
