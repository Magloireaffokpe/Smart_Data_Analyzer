import { motion } from 'framer-motion'
import { Sparkles, Zap, Shield, Database, ArrowRight } from 'lucide-react'
import { FileUploader } from '@/components/ui/FileUploader'
import type { AnalysisMode } from '@/types/api'

const TICKER = ['AI-Powered Insights','Pearson Correlations','Spearman Analysis','Pattern Detection',
  'Instant Statistics','Natural Language Summaries','Zero Storage','Gemini 2.5 Flash']

const STEPS = [
  { n:'01', title:'Upload any file',        body:'CSV, XLSX, XLS, ODS. Drag & drop. Max 5 MB.',                        c:'var(--mint)'   },
  { n:'02', title:'Choose your depth',      body:'Summary for quick decisions. Full for expert analysis.',              c:'var(--indigo)' },
  { n:'03', title:'AI reads your data',     body:'Gemini 2.5 Flash finds correlations, anomalies and writes insights.', c:'var(--amber)'  },
  { n:'04', title:'Act on results',         body:'Drivers ranked by importance, recommendations, AI summary.',          c:'var(--coral)'  },
]

const TRUST = [
  { Icon:Zap,      text:'Results in ~30 s' },
  { Icon:Shield,   text:'No data stored'   },
  { Icon:Database, text:'CSV · XLSX · ODS' },
]

const du = (i: number) => ({ initial:{ opacity:0, y:20 }, animate:{ opacity:1, y:0 }, transition:{ delay:i*.09, duration:.55, ease:[.22,1,.36,1] as const } })

export function HomePage({ onAnalyze }: { onAnalyze:(f:File,m:AnalysisMode)=>void }) {
  return (
    <main>

      {/* ── Hero ── */}
      <section style={{ padding:'clamp(40px,8vw,96px) 0 clamp(48px,8vw,80px)', position:'relative', overflow:'hidden' }}>
        <div className="dot-grid" style={{ position:'absolute', inset:0, opacity:.55, pointerEvents:'none' }} />
        <div style={{ position:'absolute', top:-100, right:-160, width:600, height:600, borderRadius:'50%', background:'radial-gradient(circle,rgba(0,179,126,.09) 0%,transparent 70%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:-80, left:-80, width:480, height:480, borderRadius:'50%', background:'radial-gradient(circle,rgba(74,58,255,.07) 0%,transparent 70%)', pointerEvents:'none' }} />

        <div className="container">
          <div className="hero-grid">

            {/* ── Left: copy ── */}
            <div className="stack-8">
              <motion.div {...du(0)}>
                <span className="tag tag-mint"><Sparkles size={11} /> Powered by Gemini 2.5 Flash</span>
              </motion.div>

              <motion.h1 {...du(1)} className="t-hero">
                Your data,<br />
                <em style={{ fontStyle:'italic', background:'linear-gradient(135deg,var(--mint) 0%,var(--indigo) 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
                  understood.
                </em>
              </motion.h1>

              <motion.p {...du(2)} className="t-body" style={{ fontSize:17, maxWidth:420, lineHeight:1.78 }}>
                Upload a CSV or Excel file. Get AI-powered insights, correlations,
                and actionable recommendations — instantly, no sign-up required.
              </motion.p>

              <motion.div {...du(3)} className="cluster" style={{ gap:24 }}>
                {TRUST.map(({ Icon, text }) => (
                  <div key={text} className="cluster" style={{ gap:7 }}>
                    <Icon size={14} color='var(--mint)' />
                    <span style={{ fontSize:13, color:'var(--ink-60)', fontWeight:500 }}>{text}</span>
                  </div>
                ))}
              </motion.div>

              {/* Stat strip */}
              <motion.div {...du(4)}>
                <div style={{ paddingTop:28, borderTop:'1px solid var(--ink-10)' }}>
                  <div className="stats-strip">
                    {[{ v:'< 30 s', l:'Analysis time' },{ v:'3', l:'Corr. methods' },{ v:'100%', l:'Private' }].map(({ v, l }) => (
                      <div key={l}>
                        <div className="stat-value">{v}</div>
                        <div className="stat-label">{l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>

            {/* ── Right: upload card ── */}
            <motion.div {...du(2)}>
              <div className="card card-lift" style={{ padding:'clamp(20px,4vw,36px)', boxShadow:'var(--sh-xl)' }}>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:28 }}>
                  <div>
                    <h2 className="t-h2" style={{ marginBottom:5 }}>Analyze your data</h2>
                    <p className="t-small">Drop a file · pick a mode · get insights</p>
                  </div>
                  <div style={{ width:40, height:40, background:'var(--ink)', borderRadius:'var(--r-sm)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginLeft:12 }}>
                    <Sparkles size={18} color='var(--mint)' />
                  </div>
                </div>
                <FileUploader onAnalyze={onAnalyze} />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Ticker ── */}
      <div className="ticker-wrap" style={{ background:'var(--ink)', padding:'11px 0', borderTop:'1px solid var(--cream-3)', borderBottom:'1px solid var(--cream-3)' }}>
        <div className="ticker-track">
          {[...TICKER, ...TICKER].map((t, i) => (
            <span key={i} style={{ padding:'0 24px', fontFamily:'var(--font-mono)', fontSize:12, whiteSpace:'nowrap', color: i % 3 === 0 ? 'var(--mint)' : 'rgba(247,245,240,.45)' }}>
              {t}<span style={{ color:'rgba(247,245,240,.18)', marginLeft:24 }}>·</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── How it works ── */}
      <section style={{ padding:'clamp(48px,8vw,80px) 0', background:'var(--cream-2)', borderBottom:'1px solid var(--ink-10)' }}>
        <div className="container">
          <p className="t-label" style={{ textAlign:'center', marginBottom:48 }}>How it works</p>
          <div className="feature-grid">
            {STEPS.map(({ n, title, body, c }) => (
              <motion.div key={n} initial={{ opacity:0, y:16 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }}
                transition={{ duration:.5 }} className="stack-4">
                <span style={{ width:30, height:30, background:c, borderRadius:'var(--r-sm)', display:'inline-flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-mono)', fontSize:11, fontWeight:600, color:'white', flexShrink:0 }}>{n}</span>
                <h3 className="t-h3">{title}</h3>
                <p style={{ fontSize:14, color:'var(--ink-60)', lineHeight:1.72 }}>{body}</p>
                <div className="cluster" style={{ gap:5, fontSize:12, color:c, fontWeight:600, marginTop:'auto' }}>
                  Learn more <ArrowRight size={12} />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
