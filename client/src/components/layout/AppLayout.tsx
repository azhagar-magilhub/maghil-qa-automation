import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import { usePresence } from '@/hooks/usePresence'

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  // Track user presence globally — writes to Firestore on mount & route changes
  usePresence()

  return (
    <div className="min-h-screen bg-body overflow-x-hidden">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main area offset by sidebar width on desktop */}
      <div className="lg:pl-60">
        <Header onMenuToggle={() => setSidebarOpen((prev) => !prev)} />

        <main className="px-3 py-4 lg:px-6 lg:py-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
