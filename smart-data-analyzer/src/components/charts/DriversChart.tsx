import { motion } from 'framer-motion'
import type { KeyVariable } from '@/types/api'

export function DriversChart({ variables }: { variables: KeyVariable[] }) {
  if (!variables?.length)
    return <p style={{ padding:'28px 0', textAlign:'center', color:'var(--ink-40)', fontSize:14 }}>No significant drivers above threshold.</p>

  const max = Math.max(...variables.map(v => Math.abs(v.correlation)))

  return (
    <div>
      {variables.map((v, i) => {
        const pct   = (Math.abs(v.correlation) / max) * 100
        const isPos = v.direction === 'positive'
        const color = isPos ? 'var(--mint)' : 'var(--coral)'
        const tagBg = isPos ? 'var(--mint-light)' : 'var(--coral-light)'
        const tagFg = isPos ? 'var(--mint-dark)'  : '#B03030'

        return (
          <motion.div key={v.name}
            initial={{ opacity:0, x:-14 }} animate={{ opacity:1, x:0 }}
            transition={{ delay:i*.07, duration:.42 }}
            style={{
              display:'flex', alignItems:'center', gap:14,
              padding:'13px 0',
              borderBottom: i < variables.length - 1 ? '1px solid var(--ink-05)' : 'none',
            }}>

            {/* Rang */}
            <span className="t-mono" style={{ fontSize:11, color:'var(--ink-20)', width:22, textAlign:'right', flexShrink:0 }}>
              {String(i + 1).padStart(2, '0')}
            </span>

            {/* Nom */}
            <span className="driver-name" style={{ fontSize:13, fontWeight:600, color:'var(--ink)', width:120, flexShrink:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={v.name}>
              {v.name}
            </span>

            {/* Barre */}
            <div style={{ flex:1, height:8, background:'var(--ink-10)', borderRadius:'var(--r-pill)', overflow:'hidden', minWidth:40 }}>
              <motion.div
                initial={{ width:0 }} animate={{ width:`${pct}%` }}
                transition={{ delay:i*.07+.18, duration:.65, ease:[.22,1,.36,1] }}
                style={{ height:'100%', background:color, borderRadius:'var(--r-pill)' }}
              />
            </div>

            {/* Score */}
            <span className="t-mono" style={{ fontSize:12, fontWeight:600, color:'var(--ink-40)', width:32, textAlign:'right', flexShrink:0 }}>
              {v.importance_score}
            </span>

            {/* Valeur corrélation */}
            <span className="t-mono" style={{ fontSize:12, fontWeight:700, color, width:54, textAlign:'right', flexShrink:0 }}>
              {v.correlation > 0 ? '+' : ''}{v.correlation.toFixed(3)}
            </span>

            {/* Badge */}
            <span style={{
              fontSize:11, fontWeight:600, padding:'3px 9px', borderRadius:'var(--r-pill)',
              background:tagBg, color:tagFg, flexShrink:0, whiteSpace:'nowrap',
            }}>
              {v.strength} {isPos ? '▲' : '▼'}
            </span>
          </motion.div>
        )
      })}
    </div>
  )
}
