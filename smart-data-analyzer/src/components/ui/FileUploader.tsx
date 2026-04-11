import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle, BarChart2, Microscope, ArrowRight, X } from 'lucide-react'
import type { AnalysisMode } from '@/types/api'

const ACCEPT = {
  'text/csv':['.csv'],
  'application/vnd.ms-excel':['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':['.xlsx'],
  'application/vnd.oasis.opendocument.spreadsheet':['.ods'],
}
const MODES = [
  { key:'summary' as AnalysisMode, Icon:BarChart2,  label:'Summary',   desc:'Key insights, fast'  },
  { key:'full'    as AnalysisMode, Icon:Microscope, label:'Full dive',  desc:'Complete report'     },
]

export function FileUploader({ onAnalyze }: { onAnalyze:(f:File,m:AnalysisMode)=>void }) {
  const [file,  setFile]  = useState<File|null>(null)
  const [mode,  setMode]  = useState<AnalysisMode>('summary')
  const [error, setError] = useState<string|null>(null)

  const onDrop = useCallback((ok:File[], bad:{errors:{message:string}[]}[]) => {
    setError(null)
    if (bad.length) { setError(bad[0].errors[0]?.message?.includes('size') ? 'Max 5 MB.' : 'Unsupported format (CSV, XLSX, ODS).'); return }
    if (ok.length)  setFile(ok[0])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept:ACCEPT, maxSize:5*1024*1024, multiple:false,
  })

  return (
    <div className="stack-6">

      {/* Mode selector */}
      <div className="mode-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        {MODES.map(({ key, Icon, label, desc }) => (
          <button key={key} onClick={() => setMode(key)}
            style={{
              display:'flex', flexDirection:'column', alignItems:'flex-start', gap:5,
              padding:'14px 16px', borderRadius:'var(--r-md)', cursor:'pointer',
              transition:'all .18s ease', textAlign:'left',
              background: mode===key ? 'var(--ink)' : 'var(--cream-2)',
              border: `2px solid ${mode===key ? 'var(--ink)' : 'transparent'}`,
              boxShadow: mode===key ? 'var(--sh-md)' : 'none',
            }}>
            <div className="cluster" style={{ gap:8 }}>
              <Icon size={14} color={mode===key ? 'var(--mint)' : 'var(--ink-40)'} />
              <span style={{ fontSize:14, fontWeight:600, color:mode===key ? 'var(--cream)' : 'var(--ink)' }}>{label}</span>
            </div>
            <span style={{ fontSize:12, color:mode===key ? 'rgba(247,245,240,.5)' : 'var(--ink-40)', lineHeight:1.4 }}>{desc}</span>
          </button>
        ))}
      </div>

      {/* Drop zone */}
      <div {...getRootProps()} style={{
        minHeight:190, display:'flex', alignItems:'center', justifyContent:'center',
        borderRadius:'var(--r-lg)', cursor:'pointer', transition:'all .2s ease',
        border:`2px dashed ${isDragActive ? 'var(--mint)' : file ? 'var(--ink-20)' : 'var(--ink-20)'}`,
        background: isDragActive ? 'var(--mint-mid)' : file ? 'rgba(0,179,126,.04)' : 'var(--cream-2)',
      }}>
        <input {...getInputProps()} aria-label="Upload your data file" />
        <AnimatePresence mode="wait">
          {file ? (
            <motion.div key="file" initial={{ opacity:0, scale:.92 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0 }} transition={{ type:'spring', stiffness:280, damping:22 }}
              style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12, padding:24, textAlign:'center' }}>
              <div style={{ width:52, height:52, background:'var(--mint)', borderRadius:'var(--r-md)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <CheckCircle2 size={26} color='white' />
              </div>
              <div>
                <p style={{ fontWeight:600, color:'var(--ink)', fontSize:14 }}>{file.name}</p>
                <p style={{ fontSize:12, color:'var(--ink-40)', marginTop:3 }}>{(file.size/1024).toFixed(0)} KB · Ready to analyze</p>
              </div>
              <button onClick={e => { e.stopPropagation(); setFile(null) }} className="cluster"
                style={{ gap:4, fontSize:12, color:'var(--ink-40)', padding:'4px 10px', borderRadius:'var(--r-sm)', background:'var(--ink-10)' }}>
                <X size={11} /> Change file
              </button>
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:14, padding:32, textAlign:'center' }}>
              <div style={{ width:52, height:52, background:isDragActive ? 'var(--mint)' : 'var(--ink-10)', borderRadius:'var(--r-md)', display:'flex', alignItems:'center', justifyContent:'center', transition:'all .2s' }}>
                {isDragActive
                  ? <FileSpreadsheet size={25} color='white' />
                  : <UploadCloud size={25} color='var(--ink-40)' />}
              </div>
              <div>
                <p style={{ fontWeight:600, color:'var(--ink)', fontSize:15 }}>
                  {isDragActive ? 'Drop it!' : 'Drag your file here'}
                </p>
                <p style={{ fontSize:13, color:'var(--ink-40)', marginTop:5 }}>
                  or <span style={{ color:'var(--indigo)', textDecoration:'underline', cursor:'pointer' }}>browse files</span>
                </p>
                <p style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--ink-40)', marginTop:10 }}>CSV · XLSX · XLS · ODS · max 5 MB</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
            className="cluster" style={{ gap:8, padding:'10px 14px', borderRadius:'var(--r-sm)', background:'var(--coral-light)', border:'1px solid rgba(240,84,84,.2)', color:'var(--coral)', fontSize:13 }}>
            <AlertCircle size={14} /> {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* CTA */}
      <button className="btn btn-primary btn-full btn-lg" onClick={() => file && onAnalyze(file, mode)} disabled={!file}
        style={{ gap:10 }}>
        Analyze my data
        {file && <ArrowRight size={16} />}
      </button>
    </div>
  )
}
