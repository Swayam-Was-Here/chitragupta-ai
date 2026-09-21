import { useRef, useEffect, useState } from 'react'
import { motion, useInView } from 'framer-motion'

const stats = [
  {
    value: 4466,
    prefix: '₹',
    suffix: ' Cr',
    label: 'Total Sanctioned',
    subLabel: 'Across all MPLADS constituencies',
    color: 'text-[#1E3878]',
  },
  {
    value: 700,
    prefix: '',
    suffix: '+',
    label: 'Districts Monitored',
    subLabel: 'Nation-wide coverage',
    color: 'text-[#C8302A]',
  },
  {
    value: 24,
    prefix: '',
    suffix: '/7',
    label: 'Automated Alerts',
    subLabel: 'Continuous AI surveillance',
    color: 'text-[#E8C018]',
  },
  {
    value: 90,
    prefix: '',
    suffix: '%',
    label: 'Detection Accuracy',
    subLabel: 'ML model precision rate',
    color: 'text-[#1A1A18]',
  },
]

function CountUp({
  target,
  decimals = 0,
  duration = 2000,
}: {
  target: number
  decimals?: number
  duration?: number
}) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })

  useEffect(() => {
    if (!inView) return
    let startTime: number
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(parseFloat((target * eased).toFixed(decimals)))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [inView, target, duration, decimals])

  return <span ref={ref}>{count.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</span>
}

export function Stats() {
  return (
    <section id="about" className="py-24 bg-[#F5F2E8] relative overflow-hidden">
      {/* Decorative circles */}

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-none border-2 border-[#1A1A18] bg-[#E8C018] text-[#1A1A18] text-sm font-bold uppercase tracking-widest mb-6">
            Impact at Scale
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-[#1A1A18] mb-5 tracking-tight">
            Numbers That Matter
          </h2>
          <p className="text-[#4A4845] text-lg max-w-xl mx-auto">
            Real impact on transparency and accountability in India's public infrastructure
            spending.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
              whileHover={{ scale: 1.04, y: -6 }}
              className="relative group h-full"
            >
              <div className="relative p-8 rounded-none border-2 border-[#1A1A18] bg-white overflow-hidden transition-all duration-300 h-full flex flex-col">
                <div className={`text-4xl lg:text-5xl font-black ${stat.color} mb-2 min-h-[3.5rem] lg:min-h-[4rem]`}>
                  {stat.prefix}
                  <CountUp
                    target={stat.value}
                    decimals={stat.value % 1 !== 0 ? 1 : 0}
                    duration={2000}
                  />
                  {stat.suffix}
                </div>
                <div className="text-[#1A1A18] font-semibold text-sm mb-1 mt-auto">{stat.label}</div>
                <div className="text-[#4A4845] text-xs">{stat.subLabel}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
