import { motion } from 'framer-motion'
import type { MatrixResult } from '@/types/api'

/* Blanc → menthe (positif)  |  Blanc → coral (négatif) */
function bubbleColor(v: number): string {
  const a = Math.abs(v)
  if (v >= 0) {
    const r = Math.round(230 - a * 230)
    const g = Math.round(230 - a * (230 - 179))
    const b = Math.round(230 - a * (230 - 126))
    return `rgba(${r},${g},${b},${.18 + a * .72})`
  }
  const r = Math.round(230 + a * (240 - 230))
  const g = Math.round(230 - a * (230 - 84))
  const b = Math.round(230 - a * (230 - 84))
  return `rgba(${r},${g},${b},${.18 + a * .72})`
}

function bubbleBorder(v: number): string {
  const a = Math.abs(v)
  return v >= 0
    ? `rgba(0,179,126,${(.25 + a * .6).toFixed(2)})`
    : `rgba(240,84,84,${(.25 + a * .6).toFixed(2)})`
}

export function CorrelationHeatmap({ data, maxCols = 8 }: { data: MatrixResult; maxCols?: number }) {
  if (!data?.matrix || data.available === false)
    return (
      <div style={{ padding:32, textAlign:'center', color:'var(--ink-40)', fontSize:14 }}>
        {data?.reason ?? 'Correlation data unavailable'}
      </div>
    )

  const cols     = Object.keys(data.matrix).slice(0, maxCols)
  const cellSize = Math.min(54, Math.floor(500 / cols.length))

  return (
    <div className="heatmap-scroll">
      <div style={{ display:'inline-flex', flexDirection:'column', minWidth:'max-content' }}>

        {/* En-têtes colonnes */}
        <div style={{ display:'flex', paddingLeft:104 }}>
          {cols.map(c => (
            <div key={c} style={{ width:cellSize, textAlign:'center' }} title={c}>
              <span className="t-mono" style={{ fontSize:10, color:'var(--ink-40)', display:'block', overflow:'hidden', textOverflow:'ellipsis', padding:'0 2px' }}>
                {c.length > 7 ? c.slice(0, 7) + '…' : c}
              </span>
            </div>
          ))}
          {/* Légende couleur */}
          <div style={{ marginLeft:20, position:'relative', width:14 }}>
            <div style={{ width:10, height:Math.min(120, cols.length * cellSize), borderRadius:5, background:'linear-gradient(to top, rgba(240,84,84,.85), rgba(230,230,230,.4), rgba(0,179,126,.85))' }} />
            {['+1','0','−1'].map((l, i) => (
              <span key={l} className="t-mono" style={{ position:'absolute', fontSize:9, color:'var(--ink-40)', left:14, top: i * Math.min(60, cols.length * cellSize / 2), whiteSpace:'nowrap' }}>{l}</span>
            ))}
          </div>
        </div>

        {/* Lignes */}
        {cols.map((row, ri) => (
          <div key={row} style={{ display:'flex', alignItems:'center' }}>
            {/* Label ligne */}
            <div style={{ width:104, paddingRight:10, textAlign:'right', flexShrink:0 }} title={row}>
              <span className="t-mono" style={{ fontSize:11, color:'var(--ink-60)', display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {row.length > 12 ? row.slice(0, 12) + '…' : row}
              </span>
            </div>

            {/* Cellules */}
            {cols.map((col, ci) => {
              const raw    = data.matrix[row]?.[col] ?? 0
              const val    = Number(raw)
              const isSelf = row === col
              const size   = (Math.abs(val) * .78 + (isSelf ? .22 : .04)) * (cellSize - 8)

              return (
                <div key={col} style={{ width:cellSize, height:cellSize, display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}
                  className="hm-cell" title={`${row} ↔ ${col}: ${val.toFixed(3)}`}>
                  <motion.div
                    initial={{ scale:0, opacity:0 }}
                    animate={{ scale:1, opacity:1 }}
                    transition={{ delay:(ri * cols.length + ci) * .005, type:'spring', stiffness:220, damping:18 }}
                    style={{
                      width:size, height:size, borderRadius:'50%',
                      background:  isSelf ? 'var(--ink)'       : bubbleColor(val),
                      border:      isSelf ? 'none'             : `1.5px solid ${bubbleBorder(val)}`,
                      boxShadow:   isSelf ? 'none'             : `0 0 0 3px ${bubbleBorder(val).replace(/[\d.]+\)$/, '.08)')}`,
                    }}
                  />
                  {/* Tooltip valeur */}
                  <div style={{
                    position:'absolute', bottom:'calc(100% + 6px)', left:'50%', transform:'translateX(-50%)',
                    background:'var(--ink)', color:'var(--cream)',
                    padding:'5px 9px', borderRadius:'var(--r-xs)',
                    fontSize:11, fontFamily:'var(--font-mono)', whiteSpace:'nowrap',
                    boxShadow:'var(--sh-md)', zIndex:10,
                    opacity:0, pointerEvents:'none', transition:'opacity .15s',
                  }} className="hm-tip">
                    {val.toFixed(3)}
                  </div>
                </div>
              )
            })}
          </div>
        ))}

        {/* Légende direction */}
        <div style={{ display:'flex', alignItems:'center', gap:20, paddingLeft:108, marginTop:16, flexWrap:'wrap' }}>
          {[{ c:'var(--mint)',  l:'positive correlation' },
            { c:'var(--coral)', l:'negative correlation' },
            { c:'var(--ink)',   l:'self (r = 1)'         }].map(({ c, l }) => (
            <div key={l} style={{ display:'flex', alignItems:'center', gap:7 }}>
              <div style={{ width:10, height:10, borderRadius:'50%', background:c, flexShrink:0 }} />
              <span className="t-mono" style={{ fontSize:10, color:'var(--ink-40)' }}>{l}</span>
            </div>
          ))}
        </div>
      </div>

      <style>{`.hm-cell:hover .hm-tip { opacity:1 !important } .hm-cell > div:first-child { transition: transform .15s ease; } .hm-cell:hover > div:first-child { transform: scale(1.25); }`}</style>
    </div>
  )
}
