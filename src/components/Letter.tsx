import { useEffect, useRef, useState } from 'react'
import { formatDuration, type Analysis, type Patient } from '../lib/analyze'
import { isoToday } from '../lib/validate'
import { fmtDate } from './format'

interface Props {
  patient: Patient
  analysis: Analysis
  onClose: () => void
  /** Bumped each time "Write my letter" is clicked, so the letter scrolls into view even if it's already open. */
  scrollSignal: number
}

export function Letter({ patient, analysis, onClose, scrollSignal }: Props) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    headingRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' })
    headingRef.current?.focus({ preventScroll: true })
  }, [scrollSignal])

  const [name, setName] = useState('')
  const [to, setTo] = useState('')
  const [copied, setCopied] = useState(false)
  const w = analysis.waitlist
  // The wait-list milestone gets its own paragraph below.
  const late = analysis.crossings.filter((c) => c.late && c.threshold.value !== 20)
  const [today] = useState(isoToday)

  const paragraphs: string[] = [
    `Dear ${to || 'Care Team'},`,
    `I am writing about how my kidney function (eGFR) has been calculated. My past lab reports used ${
      patient.equation === 'mdrd' ? 'the MDRD equation' : 'the 2009 CKD-EPI equation'
    }, which raises the eGFR of Black patients by ${patient.equation === 'mdrd' ? '21.2%' : '15.9%'}. In 2021 the National Kidney Foundation and the American Society of Nephrology recommended replacing it with the race-free CKD-EPI 2021 equation.`,
    `When my results from ${fmtDate(analysis.points[0].date)} to ${fmtDate(analysis.points.at(-1)!.date)} are recalculated without the race multiplier, my latest eGFR is ${analysis.points.at(-1)!.raceFree.toFixed(0)} rather than ${analysis.points.at(-1)!.reported.toFixed(0)}.`,
  ]
  if (late.length) {
    paragraphs.push(
      'Without the race multiplier, these milestones would have been reached earlier:\n' +
        late
          .map(
            (c) =>
              `• ${c.threshold.title} (eGFR ${c.threshold.inclusive ? '≤' : '<'} ${c.threshold.value}): reached ${fmtDate(c.raceFreeOn!)}, ${
                c.ongoing ? 'not yet shown on my reports' : `shown on my reports ${fmtDate(c.reportedOn!)}`
              }`,
          )
          .join('\n'),
    )
  }
  if (w && (w.owedDays > 0 || w.countedFromSource === 'none')) {
    const first = `A race-neutral eGFR of 20 or below first appears in my records on ${fmtDate(w.qualifiedOn)}. That is when waiting time for a deceased-donor kidney can begin.`
    const policy =
      'Under OPTN policy approved in December 2022, kidney transplant programs must review registered Black candidates whose waiting time was affected by race-based eGFR and request a waiting-time modification for those who qualify.'
    if (w.countedFromSource === 'patient') {
      paragraphs.push(
        `${first} My waiting time is counted from ${fmtDate(w.countedFrom!)}, about ${formatDuration(w.owedDays)} later. ${policy} Please review whether I qualify for a waiting-time modification and tell me in writing what you find.`,
      )
    } else if (w.countedFromSource === 'labs') {
      paragraphs.push(
        `${first} My race-adjusted reports did not show 20 or below until ${fmtDate(w.countedFrom!)}, about ${formatDuration(w.owedDays)} later. ${policy} If I am registered on the kidney wait list, please tell me which date my waiting time is counted from and whether I qualify for a modification.`,
      )
    } else {
      paragraphs.push(
        `${first} My race-adjusted reports have not shown 20 or below. Please tell me whether I should be referred for a kidney transplant evaluation.`,
      )
    }
  }
  paragraphs.push(
    'Could you please:\n• Recalculate my past results using a race-free equation and add them to my record\n• Use race-free eGFR for all of my future results\n• Review whether any referrals, medication decisions or transplant steps should be revisited',
    'Thank you. I look forward to hearing from you.',
    `Sincerely,\n${name || '[Your name]'}\nDate of birth: ${fmtDate(patient.dob)}`,
  )
  const text = `${fmtDate(today)}\n\n${paragraphs.join('\n\n')}\n\nCalculated with Recount, which uses the published CKD-EPI and MDRD equations. This is not a diagnosis.`

  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section className="block letter-block" aria-labelledby="letter-h">
      <div className="block-head no-print">
        <h2 id="letter-h" className="label" ref={headingRef} tabIndex={-1}>
          Your letter
        </h2>
        <button type="button" className="link-btn" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="field-grid no-print">
        <label className="field">
          <span>Your name</span>
          <input id="letter-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jordan Smith" />
        </label>
        <label className="field">
          <span>Addressed to</span>
          <input id="letter-to" value={to} onChange={(e) => setTo(e.target.value)} placeholder="Transplant Center" />
        </label>
      </div>
      <article className="letter print-only-target">
        {text.split('\n\n').map((p, i) => (
          <p key={i}>
            {p.split('\n').map((line, j) => (
              <span key={j}>
                {line}
                <br />
              </span>
            ))}
          </p>
        ))}
      </article>
      <div className="actions no-print">
        <button type="button" className="btn primary" onClick={() => window.print()}>
          Print or save PDF
        </button>
        <button type="button" className="btn" onClick={copy}>
          {copied ? 'Copied' : 'Copy for patient portal'}
        </button>
      </div>
    </section>
  )
}
