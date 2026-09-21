import { Link } from 'react-router-dom'
import { Shield, Code2, ExternalLink, Mail } from 'lucide-react'

export function Footer() {
  return (
    <footer className="bg-[#F5F2E8] border-t-2 border-[#1A1A18]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <img
                src="/icons.svg"
                alt="Chitragupta AI logo"
                className="w-10 h-10 sm:w-12 sm:h-12 object-contain block"
              />
              <span className="text-[#1A1A18] font-semibold text-lg">
                Chitragupta <span className="text-[#1E3878]">AI</span>
              </span>
            </Link>
            <p className="text-[#4A4845] text-sm leading-relaxed max-w-xs">
              AI-powered monitoring and analytics platform for MPLADS, ensuring transparency and
              efficiency in public fund utilization across India.
            </p>
            <div className="flex items-center gap-3 mt-5">
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-none text-[#1A1A18] hover:text-[#F5F2E8] hover:bg-[#1A1A18] transition-all"
              >
                <Code2 className="w-4 h-4" />
              </a>
              <a
                href="https://x.com"
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-none text-[#1A1A18] hover:text-[#F5F2E8] hover:bg-[#1A1A18] transition-all"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
              <a
                href="mailto:contact@chitragupta.ai"
                className="p-2 rounded-none text-[#1A1A18] hover:text-[#F5F2E8] hover:bg-[#1A1A18] transition-all"
              >
                <Mail className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Platform */}
          <div>
            <h3 className="text-[#1A1A18] font-medium text-sm mb-4">Platform</h3>
            <ul className="space-y-2.5">
              {['Features', 'Dashboard', 'Analytics', 'Reports'].map((item) => (
                <li key={item}>
                  <a
                    href="#"
                    className="text-[#4A4845] hover:text-[#1E3878] text-sm transition-colors"
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-[#1A1A18] font-medium text-sm mb-4">Legal</h3>
            <ul className="space-y-2.5">
              {['Privacy Policy', 'Terms of Service', 'Data Security', 'RTI'].map((item) => (
                <li key={item}>
                  <a
                    href="#"
                    className="text-[#4A4845] hover:text-[#1E3878] text-sm transition-colors"
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-8 border-t-2 border-[#1A1A18] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[#4A4845] text-sm">
            © {new Date().getFullYear()} Chitragupta AI. A Government Technology Initiative.
          </p>
          <p className="text-[#8A8680] text-xs">
            Built for transparency · Powered by AI · Secured by design
          </p>
        </div>
      </div>
    </footer>
  )
}
