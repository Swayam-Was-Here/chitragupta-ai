import { useState, type FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { useAuth } from '@/context/AuthContext'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/dashboard'

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email || !password) {
      setError('Please enter your email and password.')
      return
    }
    setIsLoading(true)
    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch {
      setError('Authentication failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F2E8] flex items-center justify-center relative overflow-hidden px-4">
      {/* Solid background */}
      <div className="absolute inset-0 bg-[#F5F2E8]" />

      {/* Back button */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        onClick={() => navigate('/')}
        className="absolute top-6 left-6 flex items-center gap-2 text-[#1A1A18] hover:text-[#1E3878] text-sm transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </motion.button>

      {/* Login card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative z-10 w-full max-w-md"
      >
        <Card className="bg-white border-2 border-[#1A1A18] rounded-none">
          <CardHeader className="text-center pb-6 pt-8">
            {/* Logo */}
            <div className="flex justify-center mt30 mb132">
              <img
                src="/icons.svg"
                alt="Chitragupta AI logo"
                className="w-24 h-24 sm:w-28 sm:h-28 object-contain block"
              />
            </div>
            <h1 className="text-2xl font-bold text-[#1A1A18] mb-1">Welcome back</h1>
            <p className="text-[#4A4845] text-sm">Sign in to Chitragupta AI</p>
          </CardHeader>

          <CardContent className="px-8 pb-8">
            <form onSubmit={handleSubmit} className="space-y-4" id="login-form">
              {/* Email */}
              <div className="space-y-1.5">
                <label htmlFor="login-email" className="text-sm text-[#1A1A18] font-medium">
                  Email address
                </label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="officer@mplads.gov.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white border-2 border-[#1A1A18] text-[#1A1A18] placeholder:text-[#8A8680] h-11 rounded-none"
                  autoComplete="email"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label htmlFor="login-password" className="text-sm text-[#1A1A18] font-medium">
                  Password
                </label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-white border-2 border-[#1A1A18] text-[#1A1A18] placeholder:text-[#8A8680] h-11 pr-10 rounded-none"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    id="toggle-password-btn"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1A1A18] hover:text-[#1E3878] transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[#C8302A] text-sm bg-white border-2 border-[#C8302A] rounded-none font-bold px-3 py-2"
                >
                  {error}
                </motion.p>
              )}

              {/* Submit */}
              <Button
                id="login-submit-btn"
                type="submit"
                disabled={isLoading}
                className="w-full h-11 rounded-none bg-[#1E3878] hover:bg-[#1A1A18] text-[#F5F2E8] border-2 border-[#1A1A18] font-bold uppercase transition-all duration-300 mt-2"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Authenticating…
                  </span>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            <p className="text-center text-xs text-[#8A8680] mt-6 leading-relaxed">
              Access is restricted to authorized MPLADS officials.
              <br />
              Contact your State Nodal Authority for credentials.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
