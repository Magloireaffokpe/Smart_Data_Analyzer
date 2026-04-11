import { motion } from 'framer-motion'
import { fmt, qualityColor } from '@/lib/utils'
import type { DatasetInfo } from '@/types/api'

export function DatasetPulse({ info, filename }: { info:DatasetInfo; filename?:string }) {
  const h = Math.round(info.completeness_pct)
  const barColor = h >= 95 ? 'var(--mint)' : h >= 80 ? 'var(--indigo)' : h >= 60 ? 'var(--amber)' : 'var(--coral)'

  return (
    <motion.div initial={{ opacity:0, y:-6 }} animate={{ opacity:1, y:0 }}
      className="card pulse-wrap cluster" style={{ padding:'14px 20px', gap:'14px 28px', flexWrap:'wrap' }}>

      {filename && (
        <div className="cluster" style={{ gap:8 }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--mint)' }} />
          <span className="t-mono" style={{ fontSize:12, color:'var(--ink-60)', maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{filename}</span>
        </div>
      )}

      {[{ l:'Rows', v:fmt(info.rows) },{ l:'Columns', v:String(info.columns) }].map(({ l, v }) => (
        <div key={l} className="cluster" style={{ gap:6 }}>
          <span style={{ fontSize:12, color:'var(--ink-40)' }}>{l}</span>
          <span className="t-serif" style={{ fontSize:19, lineHeight:1, color:'var(--ink)' }}>{v}</span>
        </div>
      ))}

      {/* Health bar */}
      <div className="cluster" style={{ gap:10 }}>
        <span style={{ fontSize:12, color:'var(--ink-40)', whiteSpace:'nowrap' }}>Data Health</span>
        <div className="progress" style={{ width:72 }}>
          <div className="progress-fill" style={{ width:`${h}%`, background:barColor }} />
        </div>
        <span className="t-mono" style={{ fontSize:12, fontWeight:600, color:'var(--ink)' }}>{h}%</span>
      </div>

      <div className="pulse-badge" style={{ marginLeft:'auto' }}>
        <span className={`tag ${qualityColor(info.quality_label)}`} style={{ fontSize:11 }}>
          {info.quality_label}
        </span>
      </div>
    </motion.div>
  )
}
