import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import { Checker } from './components/Checker'
import { Clinic } from './components/Clinic'
import { Learn } from './components/Learn'
import { prefersReducedMotion } from './components/motion'
import { Printout } from './components/Printout'

const TABS = [
  { id: 'check', label: 'Check my labs' },
  { id: 'clinic', label: 'Screen a panel' },
  { id: 'why', label: 'Why this matters' },
] as const
type Tab = (typeof TABS)[number]['id']

const fromHash = (): Tab => {
  const h = location.hash.slice(1)
  return TABS.some((t) => t.id === h) ? (h as Tab) : 'check'
}

export default function App() {
  const [tab, setTab] = useState<Tab>(fromHash)

  useEffect(() => {
    // Crossfade between tabs where the browser supports view transitions.
    const on = () => {
      const next = fromHash()
      if (!document.startViewTransition || prefersReducedMotion()) return setTab(next)
      document.startViewTransition(() => flushSync(() => setTab(next)))
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])

  return (
    <>
      <header className="masthead no-print">
        <div className="wrap masthead-row">
          <a className="wordmark" href="#check" aria-label="Recount home">
            Recount
            <span className="wordmark-tag" aria-hidden>
              <s>×1.159</s>
            </span>
          </a>
          <nav aria-label="Sections">
            {TABS.map((t) => (
              <a key={t.id} href={`#${t.id}`} aria-current={tab === t.id ? 'page' : undefined}>
                {t.label}
              </a>
            ))}
          </nav>
        </div>
        <div className="wrap lede">
          <div className="lede-text">
            <h1>Your kidney test added points for being Black. See what it delayed.</h1>
            <p>
              Until 2021, the standard eGFR formula raised Black patients' scores by 16 to 21%. That pushed back diagnoses,
              specialist referrals and transplant wait time. Recount recalculates your results without it.
            </p>
          </div>
          <Printout />
        </div>
      </header>
      <main className="wrap">
        {tab === 'check' && <Checker />}
        {tab === 'clinic' && <Clinic />}
        {tab === 'why' && <Learn />}
      </main>
      <footer className="wrap no-print">
        <p>
          Recount is an educational tool, not medical advice. Only your care team and transplant center can confirm your
          eGFR history and wait time. Your data stays in this browser.
        </p>
        <p>
          <a href="https://github.com/The-MathKing/recount">Source and equations on GitHub</a>
        </p>
      </footer>
    </>
  )
}
