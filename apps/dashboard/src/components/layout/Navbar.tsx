import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'About', href: '#about' },
  { label: 'Contact', href: '#contact' },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-[#F5F2E8] border-b-2 border-[#1A1A18]'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="flex items-center justify-center">
              <img
                src="/icons.svg"
                alt="Chitragupta AI logo"
                className="w-10 h-10 sm:w-12 sm:h-12 object-contain block"
              />
            </div>
            <span className="font-black uppercase tracking-tight text-[#1A1A18] text-lg">
              Chitragupta <span className="text-[#1E3878]">AI</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="px-4 py-2 text-sm text-[#1A1A18] hover:text-[#1E3878] rounded-none hover:bg-[#E8C018] transition-all duration-200"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/dashboard')}
                  className="text-[#1A1A18] hover:text-[#1E3878] rounded-none hover:bg-[#E8C018]"
                >
                  Dashboard
                </Button>
                <Button
                  size="sm"
                  onClick={logout}
                  className="bg-[#F5F2E8] text-[#C8302A] border-2 border-[#1A1A18] rounded-none font-bold uppercase hover:bg-[#C8302A] hover:text-[#F5F2E8]"
                >
                  Logout
                </Button>
              </>
            ) : (
              <Button
                id="navbar-login-btn"
                size="sm"
                onClick={() => navigate('/login')}
                className="bg-[#1E3878] hover:bg-[#1A1A18] text-[#F5F2E8] border-2 border-[#1A1A18] rounded-none font-bold uppercase transition-all duration-300"
              >
                Login
              </Button>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            id="mobile-menu-btn"
            className="md:hidden text-[#1A1A18] hover:text-[#1E3878] p-2"
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="md:hidden bg-[#F5F2E8] border-t-2 border-[#1A1A18]"
          >
            <div className="px-4 py-4 flex flex-col gap-2">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-2.5 text-sm text-[#1A1A18] hover:text-[#1E3878] rounded-none hover:bg-[#E8C018] transition-all"
                >
                  {link.label}
                </a>
              ))}
              <div className="pt-2 border-t-2 border-[#1A1A18]">
                {isAuthenticated ? (
                  <Button
                    size="sm"
                    onClick={() => { navigate('/dashboard'); setMobileOpen(false) }}
                    className="w-full bg-[#1E3878] hover:bg-[#1A1A18] text-[#F5F2E8] border-2 border-[#1A1A18] rounded-none font-bold uppercase"
                  >
                    Dashboard
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => { navigate('/login'); setMobileOpen(false) }}
                    className="w-full bg-[#1E3878] hover:bg-[#1A1A18] text-[#F5F2E8] border-2 border-[#1A1A18] rounded-none font-bold uppercase"
                  >
                    Login
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
