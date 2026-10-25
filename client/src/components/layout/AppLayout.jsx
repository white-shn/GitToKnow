import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { Outlet, useLocation } from 'react-router-dom'
import AppNavbar from '@/components/layout/AppNavbar'
import ChatSidebar from '@/features/chat/ChatSidebar'
import { useRepo } from '@/features/repo-analysis/RepoContext'

const WIDE_SCREEN_PX = 1100 // the chat dock opens by itself only when there is room for it

export default function AppLayout() {
  const { analysis, repoId } = useRepo()
  const { pathname } = useLocation()
  const page = useRef(null)

  // Open by default for a freshly analysed repo on wide screens; the user's own toggle wins afterwards
  const [choice, setChoice] = useState({ repoId: null, open: false })
  const chatOpen = choice.repoId === repoId ? choice.open : Boolean(repoId) && window.innerWidth >= WIDE_SCREEN_PX
  const setChatOpen = (open) => setChoice({ repoId, open })

  // Each page eases in
  useEffect(() => {
    if (!page.current) return
    const tween = gsap.fromTo(page.current, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' })
    return () => tween.kill()
  }, [pathname, repoId])

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
      <AppNavbar chatOpen={chatOpen} onToggleChat={() => setChatOpen(!chatOpen)} />
      <div className="flex min-h-0 flex-1">
        <main className="relative min-w-0 flex-1 overflow-hidden">
          <div aria-hidden className="bg-grid pointer-events-none absolute inset-x-0 top-0 h-96 opacity-40" />
          <div ref={page} className="relative h-full">
            <Outlet />
          </div>
        </main>
        {analysis && <ChatSidebar key={repoId} open={chatOpen} onClose={() => setChatOpen(false)} />}
      </div>
    </div>
  )
}
