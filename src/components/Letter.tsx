import { useState } from 'react'
import { formatDuration, type Analysis, type Patient } from '../lib/analyze'
import { fmtDate } from './format'

export function Letter({ patient, analysis, onClose }: { patient: Patient; analysis: Analysis; onClose: () => void }) {
  const [name, setName] = useState('')
  const [to, setTo] = useState('')
  const [copied, setCopied] = useState(false)
  const w = analysis.waitlist
  const late = analysis.crossings.filter((c) => c.late)
  const [today] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  })

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
  if (w && w.owedDays > 0) {
    paragraphs.push(
      `Under the OPTN policy on race-neutral eGFR calculations (approved December 2022), kidney transplant programs must modify the waiting time of Black candidates whose wait time was affected. A race-neutral eGFR of 20 or below first appears in my records on ${fmtDate(w.qualifiedOn)}. ${
        w.countedFrom ? `My wait time is currently counted from ${fmtDate(w.countedFrom)}, a difference of about ${formatDuration(w.owedDays)}.` : ''
      } Please review my eligibility for a waiting-time modification and tell me in writing what you find.`,
    )
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
        <h2 id="letter-h" className="label">
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
