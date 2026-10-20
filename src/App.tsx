import { useEffect, useState } from 'react'
import { Checker } from './components/Checker'
import { Clinic } from './components/Clinic'
import { Learn } from './components/Learn'

const TABS = [
  { id: 'check', label: 'Check my labs' },
  { id: 'clinic', label: 'Screen a clinic panel' },
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
    const on = () => setTab(fromHash())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])

  return (
    <>
      <header className="site-header no-print">
        <div className="wrap">
          <a className="brand" href="#check">
            <span className="mark" aria-hidden>
              ↺
            </span>
            Recount
          </a>
          <p className="tagline">
            For years, kidney tests added points to Black patients' scores. That delayed diagnoses, referrals and
            transplants. <b>Find out if it delayed yours.</b>
          </p>
          <nav aria-label="Sections">
            {TABS.map((t) => (
              <a key={t.id} href={`#${t.id}`} aria-current={tab === t.id ? 'page' : undefined}>
                {t.label}
              </a>
            ))}
          </nav>
        </div>
      </header>
      <main className="wrap">
        {tab === 'check' && <Checker />}
        {tab === 'clinic' && <Clinic />}
        {tab === 'why' && <Learn />}
      </main>
      <footer className="wrap muted small no-print">
        Recount is an educational tool, not medical advice or a diagnosis. Only your care team and transplant center can
        confirm your eGFR history and wait time. Your data never leaves this browser.
      </footer>
    </>
  )
}
