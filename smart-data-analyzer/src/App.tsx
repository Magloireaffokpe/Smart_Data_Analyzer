import { AnimatePresence, motion } from 'framer-motion'
import { Navbar }        from '@/components/layout/Navbar'
import { HomePage }      from '@/components/pages/HomePage'
import { LoadingScreen } from '@/components/pages/LoadingScreen'
import { ResultsPage }   from '@/components/pages/ResultsPage'
import { useAnalysis }   from '@/hooks/useAnalysis'
import './index.css'

const T = { duration: .28, ease: [.22, 1, .36, 1] as [number,number,number,number] }
const page = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: T },
  exit:    { opacity: 0, y: -6, transition: { duration: .18 } },
}

export default function App() {
  const { view, mode, fname, full, summary, error, reset, analyze } = useAnalysis()

  return (
    <>
      <Navbar onReset={reset} inResults={view === 'results'} />

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity:0, y:-10, x:'-50%' }} animate={{ opacity:1, y:0, x:'-50%' }} exit={{ opacity:0, x:'-50%' }}
            style={{ position:'fixed', top:76, left:'50%', zIndex:200, maxWidth:380, width:'calc(100% - 32px)',
                     background:'var(--coral-light)', border:'1px solid rgba(240,84,84,.25)', color:'var(--coral)',
                     padding:'11px 18px', borderRadius:'var(--r-md)', fontSize:13, fontWeight:500,
                     textAlign:'center', boxShadow:'var(--sh-md)' }}>
            ⚠ {error}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {view === 'home' && (
          <motion.div key="home" {...page} style={{ paddingTop:'var(--navbar-h)' }}>
            <HomePage onAnalyze={analyze} />
          </motion.div>
        )}
        {view === 'loading' && (
          <motion.div key="loading" {...page}>
            <LoadingScreen filename={fname} />
          </motion.div>
        )}
        {view === 'results' && (
          <motion.div key="results" {...page} style={{ paddingTop:'var(--navbar-h)' }}>
            <ResultsPage mode={mode} filename={fname} full={full} summary={summary} onReset={reset} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
