import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, AlertTriangle, ChevronRight, Lightbulb, GitBranch } from 'lucide-react'
import { DatasetPulse }      from './DatasetPulse'
import { StatsChart }        from '@/components/charts/StatsChart'
import { CorrelationHeatmap } from '@/components/charts/CorrelationHeatmap'
import type { FullResponse, ColumnInsight, CausalFactor } from '@/types/api'

type Tab = 'statistics' | 'correlations' | 'ai'
const TABS: { key: Tab; label: string }[] = [
  { key:'statistics',   label:'Statistics'    },
  { key:'correlations', label:'Correlations'  },
  { key:'ai',           label:'AI Deep Dive'  },
]

/* ── Tab : Statistics ── */
function StatTab({ statistics }: { statistics: FullResponse['data']['statistics'] }) {
  return (
    <div className="card" style={{ padding:'28px 32px' }}>
      <h2 className="t-h2" style={{ marginBottom:28 }}>Descriptive Statistics</h2>
      <StatsChart statistics={statistics} />
    </div>
  )
}

/* ── Tab : Correlations ── */
function CorrTab({ correlations }: { correlations: FullResponse['data']['correlations'] }) {
  const [method, setMethod] = useState<'pearson' | 'spearman'>('pearson')
  const data = method === 'pearson' ? correlations.pearson : correlations.spearman

  return (
    <div className="card" style={{ padding:'28px 32px' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:28, flexWrap:'wrap', gap:12 }}>
        <h2 className="t-h2">Correlations</h2>
        <div style={{ display:'flex', gap:3, background:'var(--ink-10)', padding:3, borderRadius:'var(--r-sm)' }}>
          {(['pearson', 'spearman'] as const).map(m => (
            <button key={m} onClick={() => setMethod(m)}
              style={{ padding:'7px 16px', borderRadius:'var(--r-xs)', fontSize:12, fontFamily:'var(--font-mono)', fontWeight:500, transition:'all .18s',
                       background: method===m ? 'var(--ink)' : 'transparent',
                       color:      method===m ? 'var(--cream)' : 'var(--ink-40)' }}>
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Heatmap */}
      <CorrelationHeatmap data={data} maxCols={8} />

      {/* Top pairs */}
      {data.top_pairs?.length > 0 && (
        <div style={{ marginTop:32 }}>
          <p className="t-label" style={{ marginBottom:16 }}>Strongest pairs</p>
          {data.top_pairs.slice(0, 6).map((p, i) => (
            <div key={i} style={{
              display:'flex', alignItems:'center', gap:14, padding:'11px 0',
              borderBottom: i < 5 ? '1px solid var(--ink-05)' : 'none',
              flexWrap:'wrap',
            }}>
              <span className="t-mono" style={{ fontSize:11, color:'var(--ink-20)', width:18, flexShrink:0 }}>{i+1}.</span>
              <span style={{ fontSize:13, fontWeight:600, color:'var(--ink)', flex:1, minWidth:120 }}>{p.col_a} ↔ {p.col_b}</span>
              <span className="t-mono" style={{ fontSize:14, fontWeight:700, color: p.direction==='positive' ? 'var(--mint)' : 'var(--coral)', flexShrink:0 }}>
                {p.correlation > 0 ? '+' : ''}{p.correlation.toFixed(3)}
              </span>
              <span style={{ fontSize:11, color:'var(--ink-40)', flexShrink:0 }}>{p.strength}</span>
              <span className={`tag ${p.significant ? 'tag-mint' : 'tag-cream'}`} style={{ fontSize:10, flexShrink:0 }}>
                {p.significant ? 'significant' : 'n.s.'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Tab : AI Deep Dive ── */
function AiTab({ ai }: { ai: FullResponse['ai'] }) {
  if (!ai)
    return <div className="card" style={{ padding:48, textAlign:'center', color:'var(--ink-40)' }}>AI analysis not available (use_ai=false).</div>

  return (
    <div className="stack-6">
      {/* Overview */}
      {ai.overview && (
        <div className="card" style={{ padding:'24px 28px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
            <Lightbulb size={16} color='var(--amber)' />
            <h2 className="t-h2">Overview</h2>
          </div>
          <p className="t-body" style={{ lineHeight:1.78 }}>{ai.overview}</p>
        </div>
      )}

      {/* Column insights */}
      {ai.column_insights?.length > 0 && (
        <div className="card" style={{ padding:'24px 28px' }}>
          <h2 className="t-h2" style={{ marginBottom:24 }}>Column Insights</h2>
          <div>
            {ai.column_insights.map((c: ColumnInsight, i: number) => (
              <div key={c.column} style={{ paddingBottom:18, marginBottom:18, borderBottom: i < ai.column_insights.length-1 ? '1px solid var(--ink-05)' : 'none' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:7, flexWrap:'wrap' }}>
                  <span className="t-mono" style={{ fontSize:12, fontWeight:600, color:'var(--indigo)', background:'var(--indigo-light)', padding:'3px 9px', borderRadius:'var(--r-xs)' }}>
                    {c.column}
                  </span>
                  <span className="t-mono" style={{ fontSize:11, color:'var(--ink-40)' }}>{c.type}</span>
                </div>
                <p className="t-body" style={{ fontSize:14 }}>{c.insight}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Causal factors */}
      {ai.causal_factors?.length > 0 && (
        <div className="card" style={{ padding:'24px 28px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:24 }}>
            <GitBranch size={16} color='var(--mint)' />
            <h2 className="t-h2">Causal Factors</h2>
          </div>
          <div className="stack-8">
            {ai.causal_factors.map((cf: CausalFactor) => (
              <div key={cf.target_variable} style={{ paddingLeft:16, borderLeft:'3px solid var(--mint-light)' }}>
                <p style={{ fontWeight:600, fontSize:14, color:'var(--ink)', marginBottom:12 }}>
                  Target: <span style={{ color:'var(--mint)' }}>{cf.target_variable}</span>
                </p>
                <div className="stack-4">
                  {cf.influencing_factors.map(f => (
                    <div key={f.factor} style={{ display:'flex', gap:9, alignItems:'flex-start', fontSize:13 }}>
                      <ChevronRight size={14} color='var(--indigo)' style={{ flexShrink:0, marginTop:3 }} />
                      <span>
                        <strong style={{ color:'var(--ink)' }}>{f.factor}</strong>
                        <span style={{ color:'var(--ink-60)' }}> — {f.influence_strength} via {f.method}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {ai.recommendations?.length > 0 && (
        <div className="card" style={{ padding:'24px 28px' }}>
          <h2 className="t-h2" style={{ marginBottom:22 }}>Recommendations</h2>
          <ol style={{ listStyle:'none' }} className="stack-4">
            {ai.recommendations.map((r: string, i: number) => (
              <li key={i} style={{ display:'flex', gap:14, alignItems:'flex-start', fontSize:14, color:'var(--ink-60)', lineHeight:1.72 }}>
                <span style={{
                  width:26, height:26, borderRadius:'var(--r-xs)',
                  background:'var(--mint)', color:'var(--ink)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontFamily:'var(--font-mono)', fontSize:11, fontWeight:700, flexShrink:0,
                }}>{i + 1}</span>
                {r}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Anomalies */}
      {ai.anomalies && (
        <div style={{ padding:'16px 20px', borderRadius:'var(--r-md)', background:'var(--coral-light)', border:'1px solid rgba(240,84,84,.2)', display:'flex', gap:14 }}>
          <AlertTriangle size={17} color='var(--coral)' style={{ flexShrink:0, marginTop:2 }} />
          <div>
            <p style={{ fontWeight:600, fontSize:13, color:'var(--coral)', marginBottom:5 }}>Anomalies detected</p>
            <p style={{ fontSize:13, lineHeight:1.72, color:'rgba(176,48,48,.85)' }}>{ai.anomalies}</p>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Main component ── */
export function FullAnalysisView({ result }: { result: FullResponse }) {
  const [tab, setTab] = useState<Tab>('statistics')
  const { data, ai } = result

  return (
    <div className="stack-6">
      <DatasetPulse info={data.dataset_info} />

      {/* Tab bar */}
      <div className="card" style={{ padding:'6px 8px' }}>
        <div style={{ display:'flex', alignItems:'center', flexWrap:'wrap', gap:4 }}>
          <div className="tab-bar" style={{ display:'flex', gap:2 }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                style={{
                  position:'relative', padding:'9px 22px', borderRadius:'var(--r-sm)',
                  fontSize:14, fontWeight:500, transition:'all .18s', whiteSpace:'nowrap',
                  background: tab===t.key ? 'var(--ink)' : 'transparent',
                  color:      tab===t.key ? 'var(--cream)' : 'var(--ink-60)',
                }}>
                {t.label}
              </button>
            ))}
          </div>
          <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:20, paddingRight:6, flexWrap:'wrap' }}>
            {[
              ['Rows',    data.dataset_info.rows.toLocaleString()],
              ['Columns', String(data.dataset_info.columns)],
              ['Health',  `${Math.round(data.dataset_info.completeness_pct)}%`],
            ].map(([l,v]) => (
              <span key={l} style={{ fontSize:12, color:'var(--ink-40)', whiteSpace:'nowrap' }}>
                {l}: <strong style={{ color:'var(--ink)' }}>{v}</strong>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Content + AI panel side-by-side */}
      <div className="results-grid">

        {/* Main content */}
        <div>
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-6 }} transition={{ duration:.22 }}>
              {tab==='statistics'   && <StatTab statistics={data.statistics}     />}
              {tab==='correlations' && <CorrTab correlations={data.correlations} />}
              {tab==='ai'           && <AiTab   ai={ai}                          />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* AI panel sticky */}
        <div className="results-sidebar ai-pane-sticky" style={{ position:'sticky', top:'calc(var(--navbar-h) + var(--subbar-h) + 16px)' }}>
          <div className="card-ink" style={{ padding:24, borderRadius:'var(--r-lg)', maxHeight:'calc(100vh - 180px)', overflowY:'auto' }}>

            {/* Header */}
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20, position:'sticky', top:0, background:'var(--ink)', paddingBottom:4, zIndex:1 }}>
              <div style={{ width:28, height:28, background:'var(--mint)', borderRadius:'var(--r-sm)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Sparkles size={14} color='var(--ink)' />
              </div>
              <span style={{ fontWeight:600, fontSize:14, color:'white' }}>AI Deep Analysis</span>
            </div>

            {ai ? (
              <div className="stack-6">
                {ai.overview && (
                  <p style={{ fontSize:12, lineHeight:1.85, color:'rgba(247,245,240,.65)' }}>{ai.overview}</p>
                )}

                {/* Highlights corrélations */}
                {ai.correlation_analysis && (
                  <div className="stack-4" style={{ paddingTop:14, borderTop:'1px solid rgba(255,255,255,.08)' }}>
                    {[
                      { txt: ai.correlation_analysis.pearson_highlights,  dot:'var(--mint)'   },
                      { txt: ai.correlation_analysis.spearman_highlights, dot:'var(--indigo)' },
                      { txt: ai.correlation_analysis.hub_columns,         dot:'var(--amber)'  },
                    ].filter(x => x.txt).map(({ txt, dot }, i) => (
                      <div key={i} style={{ display:'flex', gap:9, alignItems:'flex-start' }}>
                        <div style={{ width:5, height:5, borderRadius:'50%', background:dot, flexShrink:0, marginTop:8 }} />
                        <p style={{ fontSize:11, lineHeight:1.78, color:'rgba(247,245,240,.52)' }}>{txt}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Recommendations condensées */}
                {ai.recommendations?.length > 0 && (
                  <div className="stack-4" style={{ paddingTop:14, borderTop:'1px solid rgba(255,255,255,.08)' }}>
                    <p style={{ fontFamily:'var(--font-mono)', fontSize:10, textTransform:'uppercase', letterSpacing:'.07em', color:'rgba(247,245,240,.3)', marginBottom:2 }}>Top recs</p>
                    {ai.recommendations.slice(0, 3).map((r: string, i: number) => (
                      <div key={i} style={{ display:'flex', gap:8, alignItems:'flex-start', fontSize:11, color:'rgba(247,245,240,.5)', lineHeight:1.72 }}>
                        <span style={{ width:18, height:18, background:'rgba(0,179,126,.25)', borderRadius:4, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontFamily:'var(--font-mono)', fontWeight:700, color:'var(--mint)', flexShrink:0 }}>{i+1}</span>
                        {r}
                      </div>
                    ))}
                  </div>
                )}

                {/* Sparklines décoratifs */}
                <div className="stack-4" style={{ paddingTop:14, borderTop:'1px solid rgba(255,255,255,.07)' }}>
                  {[[20,42,30,60,44,72,58,78],[58,40,70,50,82,58,88,68],[35,58,42,70,52,76,62,84]].map((pts, i) => (
                    <svg key={i} viewBox="0 0 80 22" style={{ width:'100%', height:22 }} preserveAspectRatio="none">
                      <polyline
                        points={pts.map((y, x) => `${(x/(pts.length-1))*80},${22-y*.26}`).join(' ')}
                        fill="none" stroke={['var(--mint)','var(--indigo)','var(--coral)'][i]}
                        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity=".6"
                      />
                    </svg>
                  ))}
                </div>

                {ai.model_used && (
                  <p className="t-mono" style={{ fontSize:10, color:'rgba(255,255,255,.2)' }}>{ai.model_used}</p>
                )}
              </div>
            ) : (
              <div className="stack-4">
                {[88,72,82,60,76,55,80].map((w,i) => (
                  <div key={i} style={{ height:7, borderRadius:'var(--r-pill)', background:'rgba(255,255,255,.08)', width:`${w}%` }} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Warnings globaux */}
      {data.warnings?.length > 0 && (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:.4 }}
          style={{ padding:'16px 20px', borderRadius:'var(--r-md)', background:'var(--amber-light)', border:'1px solid rgba(217,119,6,.2)', display:'flex', gap:14 }}>
          <AlertTriangle size={17} color='var(--amber)' style={{ flexShrink:0, marginTop:2 }} />
          <div>
            <p style={{ fontWeight:600, fontSize:13, color:'var(--amber)', marginBottom:6 }}>
              Warnings ({data.warnings.length})
            </p>
            <div className="stack-4">
              {data.warnings.map((w, i) => (
                <p key={i} style={{ fontSize:13, color:'rgba(154,104,0,.8)', lineHeight:1.65 }}>{w}</p>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
