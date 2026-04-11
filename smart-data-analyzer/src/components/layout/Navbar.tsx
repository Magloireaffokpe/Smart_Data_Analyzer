import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BarChart2, Menu, X, Sparkles, ArrowUpRight } from 'lucide-react'

interface NavbarProps { onReset?: () => void; inResults?: boolean }

export function Navbar({ onReset, inResults }: NavbarProps) {
  const [open,     setOpen]     = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const go = () => { onReset?.(); setOpen(false) }

  return (
    <>
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        height: 'var(--navbar-h)',
        background: scrolled ? 'rgba(247,245,240,.96)' : 'rgba(247,245,240,.75)',
        backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
        borderBottom: scrolled ? '1px solid var(--ink-10)' : '1px solid transparent',
        transition: 'all .3s ease',
      }}>
        <div className="container" style={{ height: '100%', display: 'flex', alignItems: 'center', gap: 24 }}>

          {/* Logo */}
          <button onClick={go} style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div style={{ width: 32, height: 32, background: 'var(--ink)', borderRadius: 'var(--r-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BarChart2 size={16} color='var(--mint)' />
            </div>
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--ink)', letterSpacing: '-.01em' }}>
              Smart<strong>Data</strong>
            </span>
          </button>

          {/* Desktop nav links */}
          <nav className="hide-mobile" style={{ display: 'flex', gap: 2, flex: 1 }}>
            {['Features', 'How it works', 'Docs'].map(l => (
              <button key={l} style={{ padding: '8px 14px', borderRadius: 'var(--r-sm)', fontSize: 14, fontWeight: 500, color: 'var(--ink-60)', transition: 'all .15s' }}
                onMouseEnter={e => { const el = e.currentTarget; el.style.color = 'var(--ink)'; el.style.background = 'var(--ink-05)' }}
                onMouseLeave={e => { const el = e.currentTarget; el.style.color = 'var(--ink-60)'; el.style.background = 'transparent' }}>
                {l}
              </button>
            ))}
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto' }}>
            <AnimatePresence>
              {inResults && (
                <motion.span initial={{ opacity: 0, scale: .9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  className="tag tag-mint hide-mobile">
                  <Sparkles size={10} /> AI Active
                </motion.span>
              )}
            </AnimatePresence>

            {inResults
              ? <button className="btn btn-primary hide-mobile" style={{ padding: '9px 20px', fontSize: 13 }} onClick={go}>New analysis</button>
              : <button className="btn btn-ghost hide-mobile" style={{ padding: '9px 18px', fontSize: 13 }}>
                  Get started <ArrowUpRight size={13} />
                </button>
            }

            {/* Burger */}
            <button
              onClick={() => setOpen(v => !v)}
              aria-label={open ? 'Close menu' : 'Open menu'}
              style={{
                display: 'none', width: 38, height: 38, borderRadius: 'var(--r-sm)',
                alignItems: 'center', justifyContent: 'center', background: 'var(--ink-05)',
              }}
              className="show-mobile"
            >
              {open ? <X size={18} color='var(--ink)' /> : <Menu size={18} color='var(--ink)' />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: .2 }}
            style={{
              position: 'fixed', top: 'var(--navbar-h)', left: 0, right: 0, zIndex: 99,
              background: 'rgba(247,245,240,.98)', backdropFilter: 'blur(24px)',
              borderBottom: '1px solid var(--ink-10)', padding: '16px var(--px) 24px',
            }}
          >
            <div className="stack-4">
              {['Features', 'How it works', 'Docs'].map(l => (
                <button key={l} onClick={() => setOpen(false)}
                  style={{ textAlign: 'left', padding: '12px 4px', fontSize: 16, fontWeight: 500, color: 'var(--ink-60)', borderBottom: '1px solid var(--ink-05)' }}>
                  {l}
                </button>
              ))}
              <button className="btn btn-primary btn-full" style={{ marginTop: 8 }} onClick={go}>
                {inResults ? 'New analysis' : 'Get started'}
              </button>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>

      {/* show-mobile helper */}
      <style>{`.show-mobile{display:none!important}@media(max-width:768px){.show-mobile{display:flex!important}}`}</style>
    </>
  )
}
