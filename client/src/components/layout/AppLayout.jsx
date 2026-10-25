import { Outlet } from 'react-router-dom'
import AppNavbar from '@/components/layout/AppNavbar'

export default function AppLayout() {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
      {/* Top Navbar */}
      <AppNavbar />

      {/* Main Full-Screen Workspace */}
      <main className="relative flex-1 min-h-0 w-full overflow-hidden">
        <div aria-hidden className="bg-grid pointer-events-none absolute inset-x-0 top-0 h-96 opacity-40" />
        <Outlet />
      </main>
    </div>
  )
}
