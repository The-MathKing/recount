import { useMemo, useState } from 'react'
import { formatDuration } from '../lib/analyze'
import { CSV_HEADER, runBatch, toCsv } from '../lib/batch'
import { SAMPLE_CSV } from '../lib/samples'
import { fmtDate } from './format'

export function Clinic() {
  const [csv, setCsv] = useState('')
  const result = useMemo(() => (csv.trim() ? runBatch(csv) : null), [csv])
  const affected = result?.rows.filter((r) => r.result.affected) ?? []
  const owed = result?.rows.filter((r) => (r.result.waitlist?.owedDays ?? 0) > 0) ?? []
  const totalDays = owed.reduce((s, r) => s + r.result.waitlist!.owedDays, 0)

  const onFile = async (f?: File) => {
    if (f) setCsv(await f.text())
  }

  const download = () => {
    const blob = new Blob([toCsv(result!.rows)], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'recount-screening.csv'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="checker">
      <section className="card">
        <div className="card-head">
          <h2>Screen a patient panel</h2>
          <button type="button" className="btn ghost" onClick={() => setCsv(SAMPLE_CSV)}>
            Load sample panel
          </button>
        </div>
        <p>
          For dialysis units, community health workers and transplant navigators. Export your Black patients' creatinine
          history, drop it in, and see who may be owed wait time or had care milestones delayed. The file is read in your
          browser and is never uploaded.
        </p>
        <label className="drop">
          <input type="file" accept=".csv,text/csv" onChange={(e) => onFile(e.target.files?.[0])} />
          <span>
            <b>Choose a CSV file</b> or paste it below
          </span>
        </label>
        <textarea
          aria-label="CSV data"
          rows={6}
          value={csv}
          placeholder={CSV_HEADER + '\nA-1001,1966-04-12,M,2019-10-08,3.45,,CKD-EPI 2009,'}
          onChange={(e) => setCsv(e.target.value)}
          spellCheck={false}
        />
        <p className="muted small">
          Columns: <code>{CSV_HEADER}</code>. Give a creatinine or a reported eGFR on each row. <code>wait_start</code> is
          optional.
        </p>
      </section>

      {result && result.errors.length > 0 && (
        <section className="notice" role="alert">
          <b>{result.errors.length} row(s) skipped</b>
          <ul>
            {result.errors.slice(0, 5).map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </section>
      )}

      {result && result.rows.length > 0 && (
        <>
          <div className="stats">
            <div className="stat">
              <span className="stat-n">{result.rows.length}</span>
              <span>patients screened</span>
            </div>
            <div className="stat">
              <span className="stat-n">{affected.length}</span>
              <span>with a delayed milestone</span>
            </div>
            <div className="stat alert">
              <span className="stat-n">{owed.length}</span>
              <span>may be owed wait time</span>
            </div>
            <div className="stat alert">
              <span className="stat-n">{formatDuration(totalDays)}</span>
              <span>total wait time to review</span>
            </div>
          </div>
          <section className="card">
            <div className="card-head">
              <h2>Results, most wait time owed first</h2>
              <button type="button" className="btn primary" onClick={download}>
                Download CSV
              </button>
            </div>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Status</th>
                    <th>Race-free ≤ 20 on</th>
                    <th>Wait time counted from</th>
                    <th>Wait time to review</th>
                    <th>Other delayed milestones</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((r) => {
                    const w = r.result.waitlist
                    const other = r.result.crossings.filter((c) => c.late && c.threshold.value !== 20)
                    return (
                      <tr key={r.id}>
                        <td>
                          <b>{r.id}</b>
                        </td>
                        <td>
                          {(w?.owedDays ?? 0) > 0 ? (
                            <span className="pill alert">⚠ Review wait time</span>
                          ) : r.result.affected ? (
                            <span className="pill warn">• Delayed care</span>
                          ) : (
                            <span className="pill ok">✓ Not affected</span>
                          )}
                        </td>
                        <td>{w ? fmtDate(w.qualifiedOn) : '–'}</td>
                        <td>
                          {w?.countedFrom ? fmtDate(w.countedFrom) : w ? 'not yet' : '–'}
                          {w?.countedFromSource === 'patient' && <span className="muted"> (on file)</span>}
                        </td>
                        <td>{w && w.owedDays > 0 ? formatDuration(w.owedDays) : '–'}</td>
                        <td>{other.map((c) => `<${c.threshold.value}: ${c.delayDays > 0 ? formatDuration(c.delayDays) : 'not on reports'}`).join(', ') || '–'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
