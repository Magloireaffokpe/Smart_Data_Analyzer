import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
  ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts'
import type { StatisticsData } from '@/types/api'

/* Palette de couleurs cohérente avec le design system */
const PALETTE = [
  'var(--mint)',   'var(--indigo)', 'var(--coral)',
  'var(--amber)',  '#0891b2',       '#7c3aed',
  '#059669',       '#dc2626',       '#ea580c',       '#6d28d9',
]

/* Tooltip custom sobre */
function Tip({ active, payload, label }: { active?: boolean; payload?: { name:string; value:unknown }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background:'var(--ink)', color:'var(--cream)',
      padding:'10px 14px', borderRadius:'var(--r-sm)',
      fontSize:12, fontFamily:'var(--font-mono)',
      boxShadow:'var(--sh-lg)', minWidth:120,
    }}>
      <p style={{ color:'rgba(247,245,240,.5)', marginBottom:5, fontSize:11 }}>{label}</p>
      {payload.map(p => (
        <p key={p.name}>{p.name}:{' '}
          <strong style={{ color:'var(--mint)' }}>
            {typeof p.value === 'number' ? p.value.toFixed(3) : String(p.value)}
          </strong>
        </p>
      ))}
    </div>
  )
}

export function StatsChart({ statistics }: { statistics: StatisticsData }) {
  const numCols = Object.entries(statistics)
    .filter(([, v]) => typeof (v as Record<string, unknown>).mean === 'number')

  if (!numCols.length)
    return <p style={{ padding:32, textAlign:'center', color:'var(--ink-40)' }}>No numeric columns available.</p>

  const chartData = numCols.slice(0, 10).map(([col, s]) => {
    const st = s as Record<string, number>
    return {
      name:   col.length > 13 ? col.slice(0, 13) + '…' : col,
      mean:   +st.mean.toFixed(3),
      median: +st['50%'].toFixed(3),
      std:    +st.std.toFixed(3),
    }
  })

  return (
    <div>
      {/* ── Bar chart ── */}
      <div>
        <p className="t-label" style={{ marginBottom:16 }}>Mean value per column</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top:0, right:0, left:-20, bottom:0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--ink-10)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize:10, fill:'var(--ink-40)', fontFamily:'var(--font-mono)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize:10, fill:'var(--ink-40)', fontFamily:'var(--font-mono)' }} axisLine={false} tickLine={false} />
            <Tooltip content={<Tip />} cursor={{ fill:'var(--ink-05)' }} />
            <ReferenceLine y={0} stroke="var(--ink-20)" strokeWidth={1} />
            <Bar dataKey="mean" radius={[5,5,0,0]} name="mean" maxBarSize={44}>
              {chartData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Divider ── */}
      <div className="divider" style={{ margin:'28px 0' }} />

      {/* ── Statistics table ── */}
      <div>
        <p className="t-label" style={{ marginBottom:16 }}>Descriptive statistics</p>
        <div style={{ overflowX:'auto' }}>
          <table className="stats-table" style={{ width:'100%', borderCollapse:'collapse', fontFamily:'var(--font-mono)', fontSize:12 }}>
            <thead>
              <tr>
                {['','Column','Count','Mean','Std Dev','Min','25%','Median','75%','Max'].map(h => (
                  <th key={h} style={{
                    textAlign:'left', padding:'8px 14px 8px 0',
                    color:'var(--ink-40)', fontWeight:600,
                    borderBottom:'2px solid var(--ink-10)',
                    whiteSpace:'nowrap', fontSize:11,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {numCols.map(([col, s], i) => {
                const st  = s as Record<string, number>
                const clr = PALETTE[i % PALETTE.length]
                return (
                  <tr key={col} style={{ borderBottom:'1px solid var(--ink-05)', transition:'background .15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--cream-2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    {/* Couleur swatch */}
                    <td style={{ padding:'10px 14px 10px 0', width:14 }}>
                      <div style={{ width:8, height:8, borderRadius:2, background:clr, flexShrink:0 }} />
                    </td>
                    <td style={{ padding:'10px 14px 10px 0', fontWeight:700, color:'var(--ink)', whiteSpace:'nowrap' }}>{col}</td>
                    <td style={{ padding:'10px 14px 10px 0', color:'var(--ink-60)' }}>{st.count?.toLocaleString()}</td>
                    <td style={{ padding:'10px 14px 10px 0', fontWeight:700, color:clr }}>{st.mean?.toFixed(3)}</td>
                    <td style={{ padding:'10px 14px 10px 0', color:'var(--ink-60)' }}>{st.std?.toFixed(3)}</td>
                    <td style={{ padding:'10px 14px 10px 0', color:'var(--ink-40)' }}>{st.min?.toFixed(3)}</td>
                    <td style={{ padding:'10px 14px 10px 0', color:'var(--ink-40)' }}>{st['25%']?.toFixed(3)}</td>
                    <td style={{ padding:'10px 14px 10px 0', color:'var(--ink-40)' }}>{st['50%']?.toFixed(3)}</td>
                    <td style={{ padding:'10px 14px 10px 0', color:'var(--ink-40)' }}>{st['75%']?.toFixed(3)}</td>
                    <td style={{ padding:'10px 14px 10px 0', color:'var(--ink-40)' }}>{st.max?.toFixed(3)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
