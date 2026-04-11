import { motion } from 'framer-motion'
import { Sparkles, AlertTriangle, Target, TrendingUp, ChevronRight } from 'lucide-react'
import { DatasetPulse }  from './DatasetPulse'
import { DriversChart }  from '@/components/charts/DriversChart'
import type { SummaryResponse } from '@/types/api'

const du = (i:number) => ({ initial:{opacity:0,y:18}, animate:{opacity:1,y:0}, transition:{delay:i*.09,duration:.45,ease:[.22,1,.36,1] as const} })

export function SummaryView({ result }:{ result:SummaryResponse }) {
  const { data, ai } = result
  const { dataset_info, target, key_variables, warnings } = data
  const insights  = ai?.insights   ?? []
  const aiSummary = ai?.ai_summary ?? null

  return (
    <div className="stack-6">
      <DatasetPulse info={dataset_info} />

      <div className="results-grid">
        {/* ── Main ── */}
        <div className="stack-6">
          {/* Target variable */}
          <motion.div {...du(0)} className="card" style={{ padding:'24px 28px' }}>
            <div className="cluster" style={{ gap:8, marginBottom:14 }}>
              <Target size={15} color='var(--indigo)' />
              <span className="t-label">Target Variable</span>
            </div>
            <div className="cluster" style={{ gap:14, flexWrap:'wrap' }}>
              <span className="t-h1" style={{ lineHeight:1 }}>{target ?? 'Auto-inferred'}</span>
              {target && <span className="t-mono" style={{ fontSize:12, color:'var(--ink-40)' }}>most correlated column</span>}
            </div>
          </motion.div>

          {/* Drivers */}
          <motion.div {...du(1)} className="card" style={{ padding:'24px 28px' }}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:22, flexWrap:'wrap', gap:12 }}>
              <div>
                <div className="cluster" style={{ gap:9, marginBottom:5 }}>
                  <TrendingUp size={16} color='var(--ink)' />
                  <h2 className="t-h2">Top Drivers</h2>
                </div>
                <p className="t-small">Variables correlated with <strong style={{ color:'var(--ink)' }}>{target ?? 'target'}</strong> — ranked by importance</p>
              </div>
              <div className="cluster" style={{ gap:16 }}>
                {[{c:'var(--mint)',l:'positive'},{c:'var(--coral)',l:'negative'}].map(({c,l}) => (
                  <div key={l} className="cluster" style={{ gap:5 }}>
                    <div style={{ width:8,height:8,borderRadius:'50%',background:c }} />
                    <span className="t-mono" style={{ fontSize:11, color:'var(--ink-40)' }}>{l}</span>
                  </div>
                ))}
              </div>
            </div>
            <DriversChart variables={key_variables} />
          </motion.div>

          {/* Warnings */}
          {warnings?.length > 0 && (
            <motion.div {...du(2)} style={{ padding:'16px 20px', borderRadius:'var(--r-md)', background:'var(--amber-light)', border:'1px solid rgba(217,119,6,.2)', display:'flex', gap:14 }}>
              <AlertTriangle size={17} color='var(--amber)' style={{ flexShrink:0, marginTop:2 }} />
              <div>
                <p style={{ fontWeight:600, fontSize:13, color:'var(--amber)', marginBottom:8 }}>
                  {warnings.length} warning{warnings.length > 1 ? 's' : ''}
                </p>
                <ul style={{ listStyle:'none', display:'flex', flexDirection:'column', gap:7 }}>
                  {warnings.map((w, i) => (
                    <li key={i} className="cluster" style={{ gap:8, fontSize:13, color:'rgba(154,104,0,.85)', lineHeight:1.65, alignItems:'flex-start' }}>
                      <ChevronRight size={13} style={{ flexShrink:0, marginTop:3 }} />{w}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )}
        </div>

        {/* ── AI Sidebar ── */}
        <motion.div {...du(1)} className="results-sidebar" style={{ position:'sticky', top:'calc(var(--navbar-h) + var(--subbar-h) + 16px)' }}>
          <div className="card-ink ai-pane-sticky" style={{ padding:24, borderRadius:'var(--r-lg)' }}>
            <div className="cluster" style={{ gap:10, marginBottom:20 }}>
              <div style={{ width:28, height:28, background:'var(--mint)', borderRadius:'var(--r-sm)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Sparkles size={14} color='var(--ink)' />
              </div>
              <span style={{ fontWeight:600, fontSize:14, color:'white' }}>AI Insight</span>
            </div>

            {aiSummary
              ? <p style={{ fontSize:13, lineHeight:1.85, color:'rgba(247,245,240,.72)', marginBottom:20 }}>{aiSummary}</p>
              : <div className="stack-4" style={{ marginBottom:20 }}>
                  {[85,65,78,55,70].map((w,i) => <div key={i} style={{ height:8, borderRadius:99, background:'rgba(255,255,255,.09)', width:`${w}%` }} />)}
                </div>
            }

            {insights.length > 0 && (
              <div className="stack-4" style={{ paddingTop:16, borderTop:'1px solid rgba(255,255,255,.09)' }}>
                {insights.map((ins, i) => (
                  <motion.div key={i} initial={{ opacity:0, x:10 }} animate={{ opacity:1, x:0 }} transition={{ delay:.35+i*.1 }}
                    className="cluster" style={{ gap:10, alignItems:'flex-start' }}>
                    <div style={{ width:5, height:5, borderRadius:'50%', background:'var(--mint)', flexShrink:0, marginTop:8 }} />
                    <p style={{ fontSize:12, lineHeight:1.8, color:'rgba(247,245,240,.55)' }}>{ins}</p>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Sparklines décoratifs */}
            <div className="stack-4" style={{ paddingTop:16, borderTop:'1px solid rgba(255,255,255,.07)', marginTop:16 }}>
              {[[20,42,30,58,44,70,60],[55,38,65,46,78,55,82],[68,58,80,62,88,72,78]].map((pts, i) => (
                <svg key={i} viewBox="0 0 64 20" style={{ width:'100%', height:20 }} preserveAspectRatio="none">
                  <polyline
                    points={pts.map((y,x) => `${(x/(pts.length-1))*64},${20-y*.24}`).join(' ')}
                    fill="none" stroke={['var(--mint)','var(--indigo)','var(--coral)'][i]}
                    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity=".65"
                  />
                </svg>
              ))}
            </div>

            {ai?.model_used && <p className="t-mono" style={{ fontSize:10, color:'rgba(255,255,255,.2)', marginTop:14 }}>{ai.model_used}</p>}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
