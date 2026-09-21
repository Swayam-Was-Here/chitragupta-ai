import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  AlertTriangle,
  HardHat,
  FileBarChart2,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
} from 'lucide-react'
import { useUIStore } from '@/stores/useUIStore'
import { useAuth } from '@/context/AuthContext'

const NAV_ITEMS = [
  { to: '/dashboard/overview', label: 'Overview', Icon: LayoutDashboard },
  { to: '/dashboard/alerts', label: 'Alerts', Icon: AlertTriangle },
  { to: '/dashboard/works', label: 'Works', Icon: HardHat },
  { to: '/dashboard/reports', label: 'Reports', Icon: FileBarChart2 },
  { to: '/dashboard/settings', label: 'Settings', Icon: Settings },
]

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore()
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/', { replace: true })
  }

  return (
    <aside
      className={`
        flex flex-col border-r-2 border-[#1A1A18] bg-[#F5F2E8]
        transition-[width] duration-200
        ${sidebarCollapsed ? 'w-14' : 'w-14 md:w-56'}
        shrink-0 h-full
      `}
    >
      {/* Brand */}
      <div
        className={`
          flex items-center border-b-2 border-[#1A1A18] h-14
          ${sidebarCollapsed ? 'justify-center px-0' : 'px-4 gap-2'}
        `}
      >
        <div className="flex items-center justify-center w-7 h-7 bg-[#1E3878] shrink-0 overflow-hidden">
          <img
            src="/icons.svg"
            alt="Chitragupta AI logo"
            className="w-4 h-4 object-contain block"
          />
        </div>
        {!sidebarCollapsed && (
          <span className="text-sm font-black uppercase tracking-tight text-[#1A1A18] whitespace-nowrap">
            Chitragupta
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col pt-2 overflow-y-auto">
        {NAV_ITEMS.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            id={`nav-${label.toLowerCase()}`}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 h-11 border-l-4 transition-colors
               ${
                 isActive
                   ? 'border-l-[#C8302A] bg-[#FFFFFF] text-[#1A1A18]'
                   : 'border-l-transparent text-[#4A4845] hover:bg-[#E8C018] hover:text-[#1A1A18] hover:border-l-[#1A1A18]'
               }
               ${sidebarCollapsed ? 'justify-center px-0' : ''}
              `
            }
            title={sidebarCollapsed ? label : undefined}
          >
            <Icon className="w-4 h-4 shrink-0" strokeWidth={2} />
            {!sidebarCollapsed && (
              <span className="text-sm font-medium uppercase tracking-wider truncate hidden md:inline">
                {label}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom controls */}
      <div className="border-t-2 border-[#1A1A18]">
        {/* Logout */}
        <button
          id="sidebar-logout-btn"
          onClick={handleLogout}
          className={`
            w-full flex items-center gap-3 px-4 h-11 border-l-4 border-l-transparent
            text-[#C8302A] hover:bg-[#C8302A] hover:text-[#F5F2E8] hover:border-l-[#1A1A18]
            transition-colors
            ${sidebarCollapsed ? 'justify-center px-0' : ''}
          `}
          title={sidebarCollapsed ? 'Logout' : undefined}
        >
          <LogOut className="w-4 h-4 shrink-0" strokeWidth={2} />
          {!sidebarCollapsed && (
            <span className="text-sm font-medium uppercase tracking-wider hidden md:inline">Logout</span>
          )}
        </button>

        {/* Collapse toggle */}
        <button
          id="sidebar-collapse-btn"
          onClick={toggleSidebar}
          className={`
            hidden md:flex w-full items-center gap-3 px-4 h-11 border-t-2 border-[#1A1A18]
            text-[#8A8680] hover:bg-[#E8C018] hover:text-[#1A1A18]
            transition-colors
            ${sidebarCollapsed ? 'justify-center px-0' : ''}
          `}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="w-4 h-4 shrink-0" strokeWidth={2} />
          ) : (
            <PanelLeftClose className="w-4 h-4 shrink-0" strokeWidth={2} />
          )}
          {!sidebarCollapsed && (
            <span className="text-sm font-medium uppercase tracking-wider hidden md:inline">Collapse</span>
          )}
        </button>
      </div>
    </aside>
  )
}
