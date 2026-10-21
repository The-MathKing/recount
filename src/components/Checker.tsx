import { useMemo, useState } from 'react'
import { analyze, formatDuration, type Analysis, type Patient, type Reading } from '../lib/analyze'
import { STAGE_LABEL, UMOL_PER_MGDL, type LegacyEquation, type Sex } from '../lib/egfr'
import type { FoundReading, FoundReport } from '../lib/parseReport'
import { SAMPLE_PATIENT, SAMPLE_READINGS } from '../lib/samples'
import { isoToday, readingProblem } from '../lib/validate'
import { Chart } from './Chart'
import { fmtDate, fmtMonth } from './format'
import { Letter } from './Letter'
import { ReportReader } from './ReportReader'

type Kind = 'scr' | 'reported'
interface Row {
  id: number
  date: string
  value: string
  kind: Kind
}

let nextId = 1
const blankRow = (): Row => ({ id: nextId++, date: '', value: '', kind: 'scr' })
const sampleRows = (): Row[] => SAMPLE_READINGS.map((r) => ({ id: nextId++, date: r.date, value: String(r.scr), kind: 'scr' }))

export function Checker() {
  // Open on the example patient so the first view shows what Recount does.
  const [isSample, setIsSample] = useState(true)
  const [dob, setDob] = useState(SAMPLE_PATIENT.dob)
  const [sex, setSex] = useState<Sex>(SAMPLE_PATIENT.sex)
  const [equation, setEquation] = useState<LegacyEquation>(SAMPLE_PATIENT.equation)
  const [waitStart, setWaitStart] = useState('')
  const [umol, setUmol] = useState(false)
  const [rows, setRows] = useState<Row[]>(sampleRows)
  const [showLetter, setShowLetter] = useState(false)
  const [letterSignal, setLetterSignal] = useState(0)

  const loadSample = () => {
    setIsSample(true)
    setDob(SAMPLE_PATIENT.dob)
    setSex(SAMPLE_PATIENT.sex)
    setEquation(SAMPLE_PATIENT.equation)
    setWaitStart('')
    setUmol(false)
    setRows(sampleRows())
  }

  const startOwn = () => {
    setIsSample(false)
    setDob('')
    setWaitStart('')
    setRows([blankRow(), blankRow(), blankRow()])
    setShowLetter(false)
  }

  // Results confirmed from a photographed report replace the example, or merge into what the user typed.
  const addFromReport = (found: FoundReport, readings: FoundReading[]) => {
    if (found.dob) setDob(found.dob)
    if (found.sex) setSex(found.sex)
    if (found.equation) setEquation(found.equation)
    const dates = new Set(readings.map((r) => r.date))
    const kept = isSample ? [] : rows.filter((r) => r.value.trim() && !dates.has(r.date))
    const added: Row[] = readings.map((r) => ({
      id: nextId++,
      date: r.date,
      kind: r.scr ? 'scr' : 'reported',
      value: r.scr ? (umol ? String(Math.round(r.scr * UMOL_PER_MGDL)) : String(r.scr)) : String(r.reportedBlack),
    }))
    setRows([...kept, ...added].sort((a, b) => a.date.localeCompare(b.date)))
    if (isSample) {
      setIsSample(false)
      setWaitStart('')
    }
  }

  const update = (id: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)))

  // Convert values already typed so switching units never silently changes what they mean.
  const switchUnits = () => {
    setRows((rs) =>
      rs.map((r) => {
        const v = parseFloat(r.value)
        if (r.kind !== 'scr' || !(v > 0)) return r
        return { ...r, value: umol ? (v / UMOL_PER_MGDL).toFixed(2) : String(Math.round(v * UMOL_PER_MGDL)) }
      }),
    )
    setUmol((u) => !u)
  }

  const today = isoToday()
  const dobProblem = dob > today ? 'Date of birth is in the future.' : undefined

  // Each row becomes a reading, a problem to show beside it, or nothing yet (still being typed).
  const parsed = useMemo(
    () =>
      rows.map((r) => {
        const v = parseFloat(r.value)
        if (!r.date || !(v > 0)) return { id: r.id }
        const reading: Reading =
          r.kind === 'scr' ? { date: r.date, scr: umol ? v / UMOL_PER_MGDL : v } : { date: r.date, reported: v }
        const problem = readingProblem(reading, dob, today)
        return problem ? { id: r.id, problem } : { id: r.id, reading }
      }),
    [rows, umol, dob, today],
  )

  const patient: Patient = { dob, sex, equation, waitStart: waitStart || undefined }
  const analysis = useMemo(() => {
    if (!dob || dobProblem) return null
    const readings = parsed.flatMap((p) => (p.reading ? [p.reading] : []))
    const a = analyze({ dob, sex, equation, waitStart: waitStart || undefined }, readings)
    return a.points.length ? a : null
  }, [dob, dobProblem, sex, equation, waitStart, parsed])
  const skipped = parsed.filter((p) => p.problem).length

  return (
    <div className="workbench">
      <aside className="intake" aria-labelledby="intake-h">
        <ReportReader onAdd={addFromReport} />
        <div className="intake-head">
          <h2 id="intake-h" className="label">
            Your results
          </h2>
          {isSample ? (
            <button type="button" className="link-btn" onClick={startOwn}>
              Enter my own
            </button>
          ) : (
            <button type="button" className="link-btn" onClick={loadSample}>
              Show example
            </button>
          )}
        </div>
        {isSample && <p className="sample-note">Example patient. Change any value to see the results update.</p>}

        <div className="field-grid">
          <label className="field">
            <span>Date of birth</span>
            <input
              id="dob"
              type="date"
              value={dob}
              max={today}
              aria-invalid={!!dobProblem}
              onChange={(e) => setDob(e.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>Sex on lab report</span>
            <select id="sex" value={sex} onChange={(e) => setSex(e.target.value as Sex)}>
              <option value="female">Female</option>
              <option value="male">Male</option>
            </select>
          </label>
          <label className="field">
            <span>Lab's old formula</span>
            <select id="equation" value={equation} onChange={(e) => setEquation(e.target.value as LegacyEquation)}>
              <option value="ckdepi2009">CKD-EPI 2009</option>
              <option value="mdrd">MDRD</option>
            </select>
          </label>
          <label className="field">
            <span>
              Wait-list start <em>(optional)</em>
            </span>
            <input id="wait-start" type="date" value={waitStart} onChange={(e) => setWaitStart(e.target.value)} />
          </label>
        </div>

        <div className="entry-head">
          <span className="label">Lab results</span>
          <button type="button" className="link-btn" onClick={switchUnits}>
            Creatinine in {umol ? 'µmol/L' : 'mg/dL'} · switch
          </button>
        </div>
        <ol className="entries">
          {rows.map((r, i) => {
            const problem = parsed[i]?.problem
            return (
              <li key={r.id} className={problem ? 'has-problem' : undefined}>
                <input
                  id={`date-${r.id}`}
                  type="date"
                  aria-label={`Result ${i + 1} date`}
                  value={r.date}
                  onChange={(e) => update(r.id, { date: e.target.value })}
                />
                <input
                  id={`value-${r.id}`}
                  inputMode="decimal"
                  aria-label={`Result ${i + 1} value`}
                  aria-invalid={!!problem}
                  aria-describedby={problem ? `problem-${r.id}` : undefined}
                  placeholder={r.kind === 'scr' ? (umol ? '290' : '3.30') : '23'}
                  value={r.value}
                  onChange={(e) => update(r.id, { value: e.target.value })}
                />
                <select
                  id={`kind-${r.id}`}
                  aria-label={`Result ${i + 1} type`}
                  value={r.kind}
                  // A creatinine is never a valid eGFR (or the reverse), so start the value over.
                  onChange={(e) => update(r.id, { kind: e.target.value as Kind, value: '' })}
                >
                  <option value="scr">Creatinine</option>
                  <option value="reported">eGFR (Black)</option>
                </select>
                <button
                  type="button"
                  className="remove"
                  aria-label={`Remove result ${i + 1}`}
                  onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))}
                >
                  ×
                </button>
                {problem && (
                  <p className="row-problem" id={`problem-${r.id}`} role="alert">
                    {problem} Left out of the results.
                  </p>
                )}
              </li>
            )
          })}
        </ol>
        <button type="button" className="btn" onClick={() => setRows((rs) => [...rs, blankRow()])}>
          Add a result
        </button>
        <p className="fine">
          No creatinine on your report? Older reports often print two eGFR lines: "African American" and "non-African American".
          Enter the African American one as <b>eGFR (Black)</b> and Recount works back to the creatinine.
        </p>
        <p className="fine">Nothing you type leaves this browser tab.</p>
      </aside>

      <div className="report">
        {dobProblem && <p className="notice">{dobProblem} Check the date to see your results.</p>}
        {skipped > 0 && analysis && (
          <p className="notice">
            {skipped} result{skipped === 1 ? ' was' : 's were'} left out because the value or date doesn't look right. See the
            highlighted row{skipped === 1 ? '' : 's'}.
          </p>
        )}
        {analysis ? (
          <>
            <ReportHeader analysis={analysis} patient={patient} isSample={isSample} />
            <Finding analysis={analysis} />
            {analysis.points.some((p) => p.age < 18) && (
              <p className="notice">These formulas are for adults 18 and over. Results for younger ages are not reliable.</p>
            )}
            <section className="block">
              <h2 className="label">eGFR over time</h2>
              <Chart analysis={analysis} />
            </section>
            <Milestones analysis={analysis} />
            <ReadingsTable analysis={analysis} />
            <section className="block next-step">
              <div>
                <h2>Ask for the time back</h2>
                <p>
                  Recount writes a letter to your doctor or transplant center. It cites the transplant network's policy and asks
                  them to recalculate your results and review your wait time.
                </p>
              </div>
              <button type="button" className="btn primary" onClick={() => {
                  setShowLetter(true)
                  setLetterSignal((n) => n + 1)
                }}>
                Write my letter
              </button>
            </section>
            {showLetter && <Letter patient={patient} analysis={analysis} onClose={() => setShowLetter(false)} scrollSignal={letterSignal} />}
          </>
        ) : (
          <section className="waiting">
            <h2>Enter your date of birth and one result</h2>
            <p>
              Recount works out each eGFR with and without the race multiplier and shows which care milestones came late:
              diagnosis, specialist referral and the transplant wait list.
            </p>
          </section>
        )}
      </div>
    </div>
  )
}

function ReportHeader({ analysis, patient, isSample }: { analysis: Analysis; patient: Patient; isSample: boolean }) {
  const first = analysis.points[0]
  const last = analysis.points.at(-1)!
  return (
    <dl className="report-head">
      <div>
        <dt>Patient</dt>
        <dd>{isSample ? 'Example' : 'You'}</dd>
      </div>
      <div>
        <dt>Born</dt>
        <dd>{fmtDate(patient.dob)}</dd>
      </div>
      <div>
        <dt>Results</dt>
        <dd>
          {analysis.points.length} · {first.date.slice(0, 4)}–{last.date.slice(0, 4)}
        </dd>
      </div>
      <div>
        <dt>Latest eGFR</dt>
        <dd className="corrected">
          <s>{last.reported.toFixed(0)}</s> {last.raceFree.toFixed(0)}
        </dd>
      </div>
    </dl>
  )
}

const POLICY_NOTE =
  'Since 2023, kidney transplant programs must review registered Black candidates and request a wait-time change for those who qualify.'

function Finding({ analysis }: { analysis: Analysis }) {
  const w = analysis.waitlist
  const latest = analysis.points.at(-1)!
  const late = analysis.crossings.filter((c) => c.late)

  if (w && w.countedFromSource === 'none') {
    return (
      <section className="finding critical">
        <p className="label">Wait-list eligible, but not on your reports</p>
        <p className="finding-value">
          <mark>since {fmtMonth(w.qualifiedOn)}</mark>
        </p>
        <p>
          Without the race multiplier, your eGFR was 20 or below on <b>{fmtDate(w.qualifiedOn)}</b>. That is when wait time for a
          deceased-donor kidney can start. Your race-adjusted reports never showed 20 or below, so a transplant referral may not
          have happened. Ask your care team about a transplant evaluation.
        </p>
      </section>
    )
  }
  if (w && w.owedDays > 0) {
    return (
      <section className="finding critical">
        <p className="label">
          {w.countedFromSource === 'patient' ? 'Transplant wait time not counted' : 'Possible missing wait time'}
        </p>
        <p className="finding-value">
          <mark>{formatDuration(w.owedDays)}</mark>
        </p>
        <p>
          Without the race multiplier, your eGFR reached 20 on <b>{fmtDate(w.qualifiedOn)}</b>. That is when wait time for a
          deceased-donor kidney can start.{' '}
          {w.countedFromSource === 'patient' ? (
            <>
              Your center counts your wait time from <b>{fmtDate(w.countedFrom!)}</b>.
            </>
          ) : (
            <>
              Your reports didn't show 20 until <b>{fmtDate(w.countedFrom!)}</b>. If you're registered for a kidney transplant,
              ask your center which date your wait time counts from.
            </>
          )}{' '}
          {POLICY_NOTE}
        </p>
      </section>
    )
  }
  if (late.length) {
    return (
      <section className="finding serious">
        <p className="label">Care milestones reached late</p>
        <p className="finding-value">
          <mark>
            {late.length} milestone{late.length === 1 ? '' : 's'}
          </mark>
        </p>
        <p>
          Without the race multiplier, your eGFR crossed{' '}
          {late.map((c, i) => (
            <span key={c.threshold.value}>
              {i > 0 && (i === late.length - 1 ? ' and ' : ', ')}
              <b>{c.threshold.title.toLowerCase()}</b> ({c.threshold.inclusive ? '≤' : '<'}
              {c.threshold.value})
            </span>
          ))}{' '}
          earlier than your reports showed. The table below has the dates.
        </p>
      </section>
    )
  }
  // No delay found, but a low eGFR still isn't good news, so only use the green style above Stage 4.
  return (
    <section className={`finding ${latest.raceFree < 30 ? 'neutral' : 'good'}`}>
      <p className="label">No late milestones found</p>
      <p className="finding-value">{latest.raceFree.toFixed(0)}</p>
      <p>
        Your latest race-free eGFR: {STAGE_LABEL[latest.raceFreeStage].toLowerCase()}. The race multiplier didn't move any of
        these results across a care threshold. Ask your care team to use race-free results from now on.
      </p>
    </section>
  )
}

function Milestones({ analysis }: { analysis: Analysis }) {
  if (!analysis.crossings.length) return null
  return (
    <section className="block">
      <h2 className="label">Care milestones</h2>
      <div className="table-wrap">
        <table className="results">
          <thead>
            <tr>
              <th>Threshold</th>
              <th>What it triggers</th>
              <th>Race-free</th>
              <th>On reports</th>
              <th className="num">Delay</th>
              <th>Flag</th>
            </tr>
          </thead>
          <tbody>
            {analysis.crossings.map((c) => (
              <tr key={c.threshold.value} className={c.late ? 'is-late' : undefined}>
                <td className="mono">
                  {c.threshold.inclusive ? '≤' : '<'}
                  {c.threshold.value}
                </td>
                <td className="wrap-cell">
                  <b>{c.threshold.title}</b>
                  <span className="why">{c.threshold.why}</span>
                </td>
                <td className="mono">{fmtMonth(c.raceFreeOn!)}</td>
                <td className="mono">{c.reportedOn ? fmtMonth(c.reportedOn) : 'not yet'}</td>
                <td className="mono num">{c.delayDays > 0 ? `${c.ongoing ? '≥ ' : ''}${formatDuration(c.delayDays)}` : '—'}</td>
                <td>
                  {!c.late ? (
                    <span className="flag">OK</span>
                  ) : c.delayDays > 0 ? (
                    <span className="flag late">LATE</span>
                  ) : (
                    <span className="flag late">HIDDEN</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function ReadingsTable({ analysis }: { analysis: Analysis }) {
  return (
    <section className="block">
      <details>
        <summary className="label">Every result, recalculated</summary>
        <div className="table-wrap">
          <table className="results">
            <thead>
              <tr>
                <th>Date</th>
                <th className="num">Creatinine</th>
                <th className="num">Reported</th>
                <th className="num">CKD-EPI 2021</th>
                <th className="num">Race term removed</th>
                <th>Stage</th>
              </tr>
            </thead>
            <tbody>
              {analysis.points.map((p) => (
                <tr key={p.date}>
                  <td className="mono">{fmtDate(p.date)}</td>
                  <td className="mono num">
                    {p.scr.toFixed(2)}
                    {p.inferred && <span title="Worked out from the reported eGFR">*</span>}
                  </td>
                  <td className="mono num struck">
                    <s>{p.reported.toFixed(1)}</s>
                  </td>
                  <td className="mono num">
                    <b>{p.raceFree.toFixed(1)}</b>
                  </td>
                  <td className="mono num">{p.legacyNoRace.toFixed(1)}</td>
                  <td className="mono">
                    {p.reportedStage === p.raceFreeStage ? p.raceFreeStage : `${p.reportedStage} → ${p.raceFreeStage}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="fine">eGFR in mL/min/1.73m². Creatinine in mg/dL. * Creatinine worked out from the reported eGFR.</p>
      </details>
    </section>
  )
}
