import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
