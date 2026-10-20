import { useEffect, useState } from 'react'
import { Checker } from './components/Checker'
import { Clinic } from './components/Clinic'
import { Learn } from './components/Learn'
import { analyze } from './lib/analyze'
import { SAMPLE_PATIENT, SAMPLE_READINGS } from './lib/samples'

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

// One real line from the example patient: the reading where the multiplier hid a wait-list-eligible eGFR.
const SPECIMEN = analyze(SAMPLE_PATIENT, SAMPLE_READINGS).points.find((p) => p.raceFree <= 20 && p.reported > 20)!

function Printout() {
  return (
    <figure className="printout" aria-label="Example lab result recalculated without race">
      <div className="printout-row">
        <span>CREATININE, SERUM</span>
        <b>{SPECIMEN.scr.toFixed(2)} mg/dL</b>
      </div>
      <div className="printout-row">
        <span>eGFR IF AFRICAN AMERICAN</span>
        <b className="old">{SPECIMEN.reported.toFixed(1)}</b>
      </div>
      <div className="printout-row fixed">
        <span>eGFR, RACE-FREE (2021)</span>
        <b>{SPECIMEN.raceFree.toFixed(1)}  ≤ 20</b>
      </div>
      <figcaption>Same blood test. Only the race-free number qualifies for the transplant wait list.</figcaption>
    </figure>
  )
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
