import { useMemo, useState } from 'react'
import { analyze, formatDuration, type Analysis, type Patient, type Reading } from '../lib/analyze'
import { STAGE_LABEL, UMOL_PER_MGDL, type LegacyEquation, type Sex } from '../lib/egfr'
import { SAMPLE_PATIENT, SAMPLE_READINGS } from '../lib/samples'
import { Chart } from './Chart'
import { fmtDate, fmtMonth } from './format'
import { Letter } from './Letter'

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

  const update = (id: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)))

  const patient: Patient = { dob, sex, equation, waitStart: waitStart || undefined }
  const analysis = useMemo(() => {
    if (!dob) return null
    const readings: Reading[] = rows
      .map((r): Reading | null => {
        const v = parseFloat(r.value)
        if (!r.date || !(v > 0)) return null
        return r.kind === 'scr' ? { date: r.date, scr: umol ? v / UMOL_PER_MGDL : v } : { date: r.date, reported: v }
      })
      .filter((r): r is Reading => r !== null)
    const a = analyze({ dob, sex, equation, waitStart: waitStart || undefined }, readings)
    return a.points.length ? a : null
  }, [dob, sex, equation, waitStart, umol, rows])

  return (
    <div className="workbench">
      <aside className="intake" aria-labelledby="intake-h">
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
            <input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} required />
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
          <button type="button" className="link-btn" onClick={() => setUmol((u) => !u)}>
            Creatinine in {umol ? 'µmol/L' : 'mg/dL'} · switch
          </button>
        </div>
        <ol className="entries">
          {rows.map((r, i) => (
            <li key={r.id}>
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
                placeholder={r.kind === 'scr' ? (umol ? '290' : '3.30') : '23'}
                value={r.value}
                onChange={(e) => update(r.id, { value: e.target.value })}
              />
              <select
                id={`kind-${r.id}`}
                aria-label={`Result ${i + 1} type`}
                value={r.kind}
                onChange={(e) => update(r.id, { kind: e.target.value as Kind })}
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
            </li>
          ))}
        </ol>
        <button type="button" className="btn" onClick={() => setRows((rs) => [...rs, blankRow()])}>
          Add a result
        </button>
        <p className="fine">
          No creatinine on your report? Older reports often print two eGFR lines: "African American" and "non-African
          American". Enter the African American one as <b>eGFR (Black)</b> and Recount works back to the creatinine.
        </p>
        <p className="fine">Nothing you type leaves this browser tab.</p>
      </aside>

      <div className="report">
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
                  Recount writes a letter to your doctor or transplant center. It cites the transplant network's policy and
                  asks them to recalculate your results and review your wait time.
                </p>
              </div>
              <button type="button" className="btn primary" onClick={() => setShowLetter(true)}>
                Write my letter
              </button>
            </section>
            {showLetter && <Letter patient={patient} analysis={analysis} onClose={() => setShowLetter(false)} />}
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

function Finding({ analysis }: { analysis: Analysis }) {
  const w = analysis.waitlist
  const latest = analysis.points.at(-1)!
  const late = analysis.crossings.filter((c) => c.late && c.threshold.value !== 20)

  if (w && w.owedDays > 0) {
    return (
      <section className="finding critical">
        <p className="label">Transplant wait time not counted</p>
        <p className="finding-value">
          <mark>{formatDuration(w.owedDays)}</mark>
        </p>
        <p>
          Without the race multiplier, your eGFR reached 20 on <b>{fmtDate(w.qualifiedOn)}</b>. That is when wait time for a
          deceased-donor kidney can start.{' '}
          {w.countedFromSource === 'patient' && (
            <>Your center counts from <b>{fmtDate(w.countedFrom!)}</b>.</>
          )}
          {w.countedFromSource === 'labs' && (
            <>Your reports didn't show 20 until <b>{fmtDate(w.countedFrom!)}</b>.</>
          )}
          {w.countedFromSource === 'none' && <>Your reports still hadn't shown 20 by your latest result.</>} Since 2023,
          transplant centers must restore wait time lost this way.
        </p>
      </section>
    )
  }
  if (analysis.affected) {
    return (
      <section className="finding serious">
        <p className="label">Care milestones reached late</p>
        <p className="finding-value">
          <mark>
            {late.length} of {analysis.crossings.length}
          </mark>
        </p>
        <p>
          Without the race multiplier, your eGFR crossed {late.map((c) => c.threshold.value).join(', ')} earlier than your
          reports showed. The table below has the dates.
        </p>
      </section>
    )
  }
  return (
    <section className="finding good">
      <p className="label">No late milestones found</p>
      <p className="finding-value">{latest.raceFree.toFixed(0)}</p>
      <p>
        Your latest race-free eGFR, {STAGE_LABEL[latest.raceFreeStage].toLowerCase()}. The multiplier didn't move any of
        these results across a care threshold. Ask for race-free results from now on.
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
                <td className="mono num">
                  {c.delayDays > 0 ? `${c.ongoing ? '≥ ' : ''}${formatDuration(c.delayDays)}` : '—'}
                </td>
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
        <p className="fine">
          eGFR in mL/min/1.73m². Creatinine in mg/dL. * Creatinine worked out from the reported eGFR.
        </p>
      </details>
    </section>
  )
}
