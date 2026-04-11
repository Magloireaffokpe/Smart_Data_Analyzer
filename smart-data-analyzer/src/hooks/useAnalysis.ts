import { useState, useCallback } from 'react'
import { analyzeFull, analyzeSummary } from '@/lib/api'
import type { AppView, AnalysisMode, FullResponse, SummaryResponse } from '@/types/api'

export function useAnalysis() {
  const [view,    setView]    = useState<AppView>('home')
  const [mode,    setMode]    = useState<AnalysisMode>('summary')
  const [fname,   setFname]   = useState('')
  const [full,    setFull]    = useState<FullResponse | null>(null)
  const [summary, setSummary] = useState<SummaryResponse | null>(null)
  const [error,   setError]   = useState<string | null>(null)

  const reset = useCallback(() => {
    setView('home'); setFull(null); setSummary(null); setError(null); setFname('')
  }, [])

  const analyze = useCallback(async (file: File, m: AnalysisMode) => {
    setFname(file.name); setMode(m); setError(null); setView('loading')
    try {
      if (m === 'summary') {
        const r = await analyzeSummary(file, undefined, true)
        setSummary(r)
        // Full en arrière-plan pour permettre le switch de mode
        analyzeFull(file, true).then(setFull).catch(() => {})
      } else {
        const r = await analyzeFull(file, true)
        setFull(r)
        analyzeSummary(file, undefined, true).then(setSummary).catch(() => {})
      }
      setView('results')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unexpected error — check backend is running.')
      setView('home')
    }
  }, [])

  return { view, mode, fname, full, summary, error, reset, analyze }
}
