import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, BarChart2, Microscope } from 'lucide-react'
import { SummaryView }      from '@/components/results/SummaryView'
import { FullAnalysisView }  from '@/components/results/FullAnalysisView'
import type { AnalysisMode, FullResponse, SummaryResponse } from '@/types/api'

interface Props { mode:AnalysisMode; filename:string; full:FullResponse|null; summary:SummaryResponse|null; onReset:()=>void }

export function ResultsPage({ mode:init, filename, full, summary, onReset }:Props) {
  const [active, setActive] = useState<AnalysisMode>(init)
  const can = full !== null && summary !== null

  return (
    <div style={{ minHeight:'100vh', background:'var(--cream)', paddingBottom:80 }}>

      {/* Sticky sub-header */}
      <div style={{
        position:'sticky', top:'var(--navbar-h)', zIndex:50,
        background:'rgba(247,245,240,.95)',
        backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
        borderBottom:'1px solid var(--ink-10)',
      }}>
        <div className="container subheader-inner" style={{ height:'var(--subbar-h)', display:'flex', alignItems:'center', gap:16 }}>
          <button onClick={onReset} className="cluster"
            style={{ gap:6, fontSize:13, color:'var(--ink-60)', fontWeight:500, padding:'6px 10px', borderRadius:'var(--r-sm)', transition:'all .15s' }}
            onMouseEnter={e => { e.currentTarget.style.background='var(--ink-05)'; e.currentTarget.style.color='var(--ink)' }}
            onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--ink-60)' }}>
            <ArrowLeft size={14} />
            <span className="hide-mobile">Home</span>
          </button>

          <span style={{ color:'var(--ink-20)', fontSize:12 }}>/</span>
          <span className="t-mono" style={{ fontSize:12, color:'var(--ink-40)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'min(200px,35vw)' }}>{filename}</span>

          <div style={{ flex:1 }} />

          {/* Mode switcher */}
          {can && (
            <div className="cluster" style={{ gap:2, background:'var(--ink-10)', padding:3, borderRadius:'var(--r-md)' }}>
              {[{ k:'summary' as AnalysisMode, I:BarChart2,  l:'Summary' },
                { k:'full'    as AnalysisMode, I:Microscope, l:'Full'    }].map(({ k, I, l }) => (
                <button key={k} onClick={() => setActive(k)} className="cluster"
                  style={{
                    gap:6, padding:'7px 16px', borderRadius:'var(--r-sm)',
                    fontSize:13, fontWeight:500, transition:'all .18s',
                    background: active===k ? 'var(--ink)' : 'transparent',
                    color: active===k ? 'var(--cream)' : 'var(--ink-60)',
                    boxShadow: active===k ? 'var(--sh-xs)' : 'none',
                  }}>
                  <I size={13} />
                  <span>{l}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="container" style={{ paddingTop:24 }}>
        <motion.div key={active} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ duration:.25 }}>
          {active==='summary' && summary && <SummaryView result={summary} />}
          {active==='full'    && full    && <FullAnalysisView result={full} />}
          {active==='summary' && !summary && (
            <div className="card" style={{ padding:48, textAlign:'center', color:'var(--ink-40)' }}>Summary data not available.</div>
          )}
          {active==='full' && !full && (
            <div className="card" style={{ padding:48, textAlign:'center', color:'var(--ink-40)' }}>Full analysis not available.</div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
