import { useMemo, useState } from 'react'
import { analyze, formatDuration, type Patient, type Reading } from '../lib/analyze'
import { STAGE_LABEL, UMOL_PER_MGDL, type LegacyEquation, type Sex } from '../lib/egfr'
import { SAMPLE_PATIENT, SAMPLE_READINGS } from '../lib/samples'
import { Chart } from './Chart'
import { fmtDate } from './format'
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

export function Checker() {
  const [dob, setDob] = useState('')
  const [sex, setSex] = useState<Sex>('female')
  const [equation, setEquation] = useState<LegacyEquation>('ckdepi2009')
  const [waitStart, setWaitStart] = useState('')
  const [umol, setUmol] = useState(false)
  const [rows, setRows] = useState<Row[]>([blankRow(), blankRow(), blankRow()])
  const [showLetter, setShowLetter] = useState(false)

  const loadSample = () => {
    setDob(SAMPLE_PATIENT.dob)
    setSex(SAMPLE_PATIENT.sex)
    setEquation(SAMPLE_PATIENT.equation)
    setWaitStart('')
    setUmol(false)
    setRows(SAMPLE_READINGS.map((r) => ({ id: nextId++, date: r.date, value: String(r.scr), kind: 'scr' })))
  }

  const reset = () => {
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

  const youngest = analysis?.points.some((p) => p.age < 18)

  return (
    <div className="checker">
      <section className="card form-card" aria-labelledby="your-info">
        <div className="card-head">
          <h2 id="your-info">Your lab results</h2>
          <div className="row-actions">
            <button type="button" className="btn ghost" onClick={loadSample}>
              Load example patient
            </button>
            <button type="button" className="btn ghost" onClick={reset}>
              Clear
            </button>
          </div>
        </div>
        <p className="muted small">
          Everything stays in this browser tab. Nothing is uploaded, stored or sent anywhere.
        </p>

        <div className="fields">
          <label>
            Date of birth
            <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} required />
          </label>
          <label>
            Sex on lab report
            <select value={sex} onChange={(e) => setSex(e.target.value as Sex)}>
              <option value="female">Female</option>
              <option value="male">Male</option>
            </select>
          </label>
          <label>
            Lab's old equation
            <select value={equation} onChange={(e) => setEquation(e.target.value as LegacyEquation)}>
              <option value="ckdepi2009">CKD-EPI 2009 (most common)</option>
              <option value="mdrd">MDRD (older reports)</option>
            </select>
          </label>
          <label>
            Wait time starts on <span className="optional">optional</span>
            <input type="date" value={waitStart} onChange={(e) => setWaitStart(e.target.value)} />
          </label>
        </div>

        <table className="entry">
          <thead>
            <tr>
              <th>Date of test</th>
              <th>Result</th>
              <th>
                What it is
                <button type="button" className="unit-toggle" onClick={() => setUmol((u) => !u)}>
                  creatinine in {umol ? 'µmol/L' : 'mg/dL'} ⇄
                </button>
              </th>
              <th aria-label="Remove" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <input type="date" aria-label="Test date" value={r.date} onChange={(e) => update(r.id, { date: e.target.value })} />
                </td>
                <td>
                  <input
                    inputMode="decimal"
                    aria-label="Result value"
                    placeholder={r.kind === 'scr' ? (umol ? 'e.g. 290' : 'e.g. 3.3') : 'e.g. 23'}
                    value={r.value}
                    onChange={(e) => update(r.id, { value: e.target.value })}
                  />
                </td>
                <td>
                  <select aria-label="Result type" value={r.kind} onChange={(e) => update(r.id, { kind: e.target.value as Kind })}>
                    <option value="scr">Creatinine</option>
                    <option value="reported">eGFR "if African American"</option>
                  </select>
                </td>
                <td>
                  <button type="button" className="icon-btn" aria-label="Remove row" onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))}>
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button type="button" className="btn ghost" onClick={() => setRows((rs) => [...rs, blankRow()])}>
          + Add a result
        </button>
        <p className="muted small hint">
          Don't have creatinine? Many older reports list two eGFR lines, one "if African American" and one "if non-African
          American". Enter the African American line and we'll work backwards.
        </p>
      </section>

      {!analysis && (
        <section className="card empty">
          <h2>What you'll see</h2>
          <p>
            Enter your date of birth and at least one result. Recount works out your kidney numbers with and without the
            race multiplier, then shows which care milestones may have come late: diagnosis, specialist referral, and
            the kidney transplant wait list.
          </p>
          <button type="button" className="btn primary" onClick={loadSample}>
            Try the example patient
          </button>
        </section>
      )}

      {analysis && (
        <>
          <Summary analysis={analysis} />
          {youngest && <p className="notice">These equations are for adults 18 and over. Results for younger ages are not reliable.</p>}
          <section className="card">
            <h2>Your timeline</h2>
            <Chart analysis={analysis} />
          </section>
          <Milestones analysis={analysis} />
          <ReadingsTable analysis={analysis} />
          <section className="card cta">
            <div>
              <h2>Take this to your care team</h2>
              <p>
                We'll write a letter for you to print or send through your patient portal. It asks your doctor or
                transplant center to recalculate using a race-free equation and, if you're eligible, to backdate your
                wait time.
              </p>
            </div>
            <button type="button" className="btn primary" onClick={() => setShowLetter(true)}>
              Write my letter
            </button>
          </section>
          {showLetter && <Letter patient={patient} analysis={analysis} onClose={() => setShowLetter(false)} />}
        </>
      )}
    </div>
  )
}

function Summary({ analysis }: { analysis: NonNullable<ReturnType<typeof analyze>> }) {
  const w = analysis.waitlist
  const latest = analysis.points.at(-1)!
  const delayed = analysis.crossings.filter((c) => c.late && c.threshold.value !== 20)

  if (w && w.owedDays > 0) {
    return (
      <section className="card hero alert">
        <p className="eyebrow">Possible missing transplant wait time</p>
        <p className="big">{formatDuration(w.owedDays)}</p>
        <p>
          A race-free eGFR put you at 20 or below on <b>{fmtDate(w.qualifiedOn)}</b>.{' '}
          {w.countedFromSource === 'patient' && (
            <>Your wait time is counted from <b>{fmtDate(w.countedFrom!)}</b>.</>
          )}
          {w.countedFromSource === 'labs' && (
            <>The race-adjusted number didn't get there until <b>{fmtDate(w.countedFrom!)}</b>.</>
          )}
          {w.countedFromSource === 'none' && <>The race-adjusted number still hadn't got there by your latest result.</>}{' '}
          Since 2023, transplant centers have been required to give back wait time lost to the race multiplier.
        </p>
      </section>
    )
  }
  if (analysis.affected) {
    return (
      <section className="card hero warn">
        <p className="eyebrow">Your care milestones may have come late</p>
        <p className="big">{delayed.length} milestone{delayed.length === 1 ? '' : 's'}</p>
        <p>
          Without the race multiplier, your numbers crossed {delayed.map((c) => c.threshold.value).join(', ')} earlier
          than your reports showed. See the details below.
        </p>
      </section>
    )
  }
  return (
    <section className="card hero ok">
      <p className="eyebrow">No delayed milestones found</p>
      <p className="big">{latest.raceFree.toFixed(0)}</p>
      <p>
        Your latest race-free eGFR ({STAGE_LABEL[latest.raceFreeStage]}). The race multiplier didn't move any of these
        results across a care threshold. It's still worth asking for race-free results from now on.
      </p>
    </section>
  )
}

function Milestones({ analysis }: { analysis: NonNullable<ReturnType<typeof analyze>> }) {
  if (!analysis.crossings.length) return null
  return (
    <section className="card">
      <h2>Care milestones</h2>
      <ol className="milestones">
        {analysis.crossings.map((c) => (
          <li key={c.threshold.value} className={c.late ? 'late' : 'ontime'}>
            <div className="m-head">
              <span className="m-badge">
                eGFR {c.threshold.inclusive ? '≤' : '<'} {c.threshold.value}
              </span>
              <h3>{c.threshold.title}</h3>
              <span className={`m-status ${c.late ? 'late' : 'ontime'}`}>
                {!c.late ? '✓ on time' : c.delayDays > 0 ? `⚠ ${c.ongoing ? 'at least ' : ''}${formatDuration(c.delayDays)} late` : '⚠ not on your reports yet'}
              </span>
            </div>
            <p className="muted">{c.threshold.why}</p>
            <p className="small">
              Race-free: <b>{fmtDate(c.raceFreeOn!)}</b> · Race-adjusted:{' '}
              <b>{c.reportedOn ? fmtDate(c.reportedOn) : 'not yet'}</b>
            </p>
          </li>
        ))}
      </ol>
    </section>
  )
}

function ReadingsTable({ analysis }: { analysis: NonNullable<ReturnType<typeof analyze>> }) {
  return (
    <section className="card">
      <details>
        <summary>
          <h2>Every result, side by side</h2>
        </summary>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Date</th>
                <th>Creatinine</th>
                <th>Race-adjusted</th>
                <th>Race-free 2021</th>
                <th>Race term removed</th>
                <th>Stage change</th>
              </tr>
            </thead>
            <tbody>
              {analysis.points.map((p) => (
                <tr key={p.date}>
                  <td>{fmtDate(p.date)}</td>
                  <td>
                    {p.scr.toFixed(2)}
                    {p.inferred && <span title="Worked out from the reported eGFR">*</span>}
                  </td>
                  <td>{p.reported.toFixed(1)}</td>
                  <td>{p.raceFree.toFixed(1)}</td>
                  <td>{p.legacyNoRace.toFixed(1)}</td>
                  <td>{p.reportedStage === p.raceFreeStage ? '–' : `${p.reportedStage} → ${p.raceFreeStage}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted small">eGFR in mL/min/1.73m². * creatinine worked out from the reported eGFR.</p>
      </details>
    </section>
  )
}
