import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LOADING_STEPS } from '@/lib/utils'

const DOTS = Array.from({ length: 200 }, (_, i) => {
  const phi = Math.acos(-1 + (2 * i) / 200)
  const theta = Math.sqrt(200 * Math.PI) * phi
  return { cx: 50 + 44 * Math.sin(phi) * Math.cos(theta), cy: 50 + 44 * Math.sin(phi) * Math.sin(theta), r: 1.2 + Math.random() * 1.4, delay: (Math.random() * 2.5).toFixed(2), dur: (1.4 + Math.random() * 1.6).toFixed(2) }
})

export function LoadingScreen({ filename }: { filename: string }) {
  const [step, setStep] = useState(0)
  const [pct,  setPct]  = useState(0)

  useEffect(() => {
    let elapsed = 0
    const total = LOADING_STEPS.reduce((s, x) => s + x.ms, 0)
    const id = setInterval(() => {
      elapsed += 80
      setPct(Math.min((elapsed / total) * 95, 95))
      let acc = 0
      for (let i = 0; i < LOADING_STEPS.length; i++) { acc += LOADING_STEPS[i].ms; if (elapsed < acc) { setStep(i); break } }
    }, 80)
    return () => clearInterval(id)
  }, [])

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      style={{ position:'fixed', inset:0, background:'#0D0D0D', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', zIndex:100, gap:0 }}
      role="status" aria-live="polite">

      {/* Background blobs */}
      <div style={{ position:'absolute', top:'30%', left:'50%', transform:'translate(-50%,-50%)', width:600, height:600, borderRadius:'50%', background:'radial-gradient(circle, rgba(0,179,126,.08) 0%, transparent 65%)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:'20%', right:'20%', width:300, height:300, borderRadius:'50%', background:'radial-gradient(circle, rgba(74,58,255,.07) 0%, transparent 65%)', pointerEvents:'none' }} />

      {/* Title */}
      <motion.h2 initial={{ opacity:0, y:-18 }} animate={{ opacity:1, y:0 }} transition={{ delay:.1 }}
        style={{ fontFamily:'var(--font-display)', fontSize:'clamp(1.8rem,5vw,3rem)', color:'white', marginBottom:8, position:'relative', zIndex:1 }}>
        Analyzing your data…
      </motion.h2>
      <motion.p initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:.3 }}
        style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'rgba(255,255,255,.3)', marginBottom:56, maxWidth:260, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
        {filename}
      </motion.p>

      {/* Orb SVG */}
      <motion.div initial={{ opacity:0, scale:.7 }} animate={{ opacity:1, scale:1 }} transition={{ delay:.2, duration:.7, ease:'backOut' }}
        style={{ width:220, height:220, marginBottom:56, animation:'orbPulse 4s ease-in-out infinite' }}>
        <svg viewBox="0 0 100 100" style={{ width:'100%', height:'100%' }}>
          <defs>
            <radialGradient id="og" cx="38%" cy="32%" r="62%">
              <stop offset="0%"   stopColor="#00B37E" stopOpacity=".95" />
              <stop offset="45%"  stopColor="#4A3AFF" stopOpacity=".65" />
              <stop offset="100%" stopColor="#F05454" stopOpacity=".3"  />
            </radialGradient>
          </defs>
          {DOTS.map((d, i) => (
            <circle key={i} cx={d.cx} cy={d.cy} r={d.r} fill="url(#og)" opacity=".75">
              <animate attributeName="opacity" values=".2;.95;.2" dur={`${d.dur}s`} begin={`${d.delay}s`} repeatCount="indefinite" />
              <animate attributeName="r" values={`${d.r*.65};${d.r*1.35};${d.r*.65}`} dur={`${d.dur}s`} begin={`${d.delay}s`} repeatCount="indefinite" />
            </circle>
          ))}
        </svg>
      </motion.div>

      {/* Progress */}
      <div style={{ width:'100%', maxWidth:380, padding:'0 24px', position:'relative', zIndex:1 }}>
        <div style={{ height:3, background:'rgba(255,255,255,.08)', borderRadius:99, overflow:'hidden', marginBottom:14 }}>
          <motion.div animate={{ width:`${pct}%` }} transition={{ duration:.3, ease:'easeOut' }}
            style={{ height:'100%', background:'linear-gradient(90deg, var(--mint), var(--indigo))', borderRadius:99 }} />
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <AnimatePresence mode="wait">
            <motion.span key={step} initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:8 }}
              style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'rgba(255,255,255,.45)' }}>
              {LOADING_STEPS[step]?.label}
            </motion.span>
          </AnimatePresence>
          <span style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'rgba(255,255,255,.25)' }}>{Math.round(pct)}%</span>
        </div>
        {/* Step pills */}
        <div style={{ display:'flex', justifyContent:'center', gap:6, marginTop:20 }}>
          {LOADING_STEPS.map((_, i) => (
            <motion.div key={i} animate={{ width: i===step?22:6, background: i<=step?'var(--mint)':'rgba(255,255,255,.15)' }} transition={{ duration:.3 }}
              style={{ height:4, borderRadius:99 }} />
          ))}
        </div>
      </div>

      {/* Decorative diamond */}
      <div style={{ position:'absolute', bottom:28, right:28, opacity:.3 }}>
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
          <path d="M16 2 L30 16 L16 30 L2 16 Z" stroke="var(--mint)" strokeWidth="1.5" />
          <path d="M16 9 L23 16 L16 23 L9 16 Z" fill="var(--mint)" opacity=".25" />
        </svg>
      </div>
    </motion.div>
  )
}
