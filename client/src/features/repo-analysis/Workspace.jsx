import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ExternalLink, FolderTree, GitFork, MessagesSquare, Network, Scale, Sparkles, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ArchitecturePanel from '@/features/architecture/ArchitecturePanel'
import ChatPanel from '@/features/chat/ChatPanel'
import StructurePanel from '@/features/structure/StructurePanel'
import OverviewPanel from './OverviewPanel'
import { useRepo } from './RepoContext'

const TABS = [
  { value: 'overview', label: 'AI Summary', icon: Sparkles },
  { value: 'structure', label: 'File Structure', icon: FolderTree },
  { value: 'architecture', label: 'Structure Map', icon: Network },
  { value: 'chat', label: 'Ask the Repo', icon: MessagesSquare },
]

function RepoHeader() {
  const { analysis } = useRepo()
  const { meta } = analysis

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <a
          href={meta.html_url}
          target="_blank"
          rel="noreferrer"
          className="group inline-flex items-center gap-2 font-mono text-lg font-semibold hover:text-primary"
        >
          {meta.owner}/<span className="text-primary">{meta.repo}</span>
          <ExternalLink className="size-4 text-muted-foreground group-hover:text-primary" />
        </a>
        {meta.description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{meta.description}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="gap-1.5"><Star className="size-3" />{meta.stars.toLocaleString()}</Badge>
        <Badge variant="outline" className="gap-1.5"><GitFork className="size-3" />{meta.forks.toLocaleString()}</Badge>
        {meta.license && <Badge variant="outline" className="gap-1.5"><Scale className="size-3" />{meta.license}</Badge>}
        <Badge variant="secondary" className="font-mono text-xs">{meta.file_count} files</Badge>
      </div>
    </div>
  )
}

export default function Workspace() {
  const [tab, setTab] = useState('overview')
  const panel = useRef(null)

  // Fade the active tab's content in whenever the tab changes
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('[data-anim="panel"]', { opacity: 0, y: 10, duration: 0.35, ease: 'power2.out' })
    }, panel)
    return () => ctx.revert()
  }, [tab])

  return (
    <div data-anim="result" className="mt-8 space-y-5">
      <RepoHeader />
      <Tabs value={tab} onValueChange={setTab} className="gap-5">
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 p-1 sm:w-fit">
          {TABS.map(({ value, label, icon: Icon }) => (
            <TabsTrigger key={value} value={value} className="gap-2 px-4 py-2">
              <Icon className="size-4" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
        <div ref={panel}>
          <TabsContent value="overview"><div data-anim="panel"><OverviewPanel /></div></TabsContent>
          <TabsContent value="structure"><div data-anim="panel"><StructurePanel /></div></TabsContent>
          <TabsContent value="architecture"><div data-anim="panel"><ArchitecturePanel /></div></TabsContent>
          <TabsContent value="chat"><div data-anim="panel"><ChatPanel /></div></TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
