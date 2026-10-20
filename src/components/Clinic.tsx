import { useMemo, useState } from 'react'
import { formatDuration } from '../lib/analyze'
import { CSV_HEADER, runBatch, toCsv } from '../lib/batch'
import { SAMPLE_CSV } from '../lib/samples'
import { fmtDate } from './format'

export function Clinic() {
  // Open on the sample panel so the screen shows its output before anyone uploads a file.
  const [csv, setCsv] = useState(SAMPLE_CSV)
  const isSample = csv === SAMPLE_CSV
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
    <div className="workbench">
      <aside className="intake" aria-labelledby="panel-h">
        <div className="intake-head">
          <h2 id="panel-h" className="label">
            Patient panel
          </h2>
          {isSample ? (
            <button type="button" className="link-btn" onClick={() => setCsv('')}>
              Use my own file
            </button>
          ) : (
            <button type="button" className="link-btn" onClick={() => setCsv(SAMPLE_CSV)}>
              Show example
            </button>
          )}
        </div>
        {isSample && <p className="sample-note">Example panel of 5 fictional patients.</p>}
        <p className="fine">
          For dialysis units, community health workers and transplant navigators. Export your Black patients' creatinine
          history and drop it in. Recount screens everyone and ranks who to call first. The file is read in your browser and
          never uploaded.
        </p>
        <label className="drop">
          <input id="csv-file" type="file" accept=".csv,text/csv" onChange={(e) => onFile(e.target.files?.[0])} />
          <span>
            <b>Choose a CSV file</b>
            <br />
            or paste it below
          </span>
        </label>
        <textarea
          id="csv-text"
          aria-label="CSV data"
          rows={9}
          value={csv}
          placeholder={CSV_HEADER}
          onChange={(e) => setCsv(e.target.value)}
          spellCheck={false}
        />
        <p className="fine">
          One row per lab result. Columns: <code>{CSV_HEADER.replaceAll(',', ', ')}</code>. Each row needs a creatinine or a
          reported eGFR; <code>wait_start</code> is optional.
        </p>
      </aside>

      <div className="report">
        {result && result.errors.length > 0 && (
          <section className="notice" role="alert">
            <b>
              {result.errors.length} row{result.errors.length === 1 ? '' : 's'} skipped
            </b>
            <ul>
              {result.errors.slice(0, 5).map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </section>
        )}

        {result && result.rows.length > 0 ? (
          <>
            <dl className="report-head tally">
              <div>
                <dt>Screened</dt>
                <dd>{result.rows.length}</dd>
              </div>
              <div>
                <dt>Late milestone</dt>
                <dd>{affected.length}</dd>
              </div>
              <div className="hot">
                <dt>May be owed wait time</dt>
                <dd>{owed.length}</dd>
              </div>
              <div className="hot">
                <dt>Wait time to review</dt>
                <dd>{formatDuration(totalDays)}</dd>
              </div>
            </dl>
            <section className="block">
              <div className="block-head">
                <h2 className="label">Call list, most wait time first</h2>
                <button type="button" className="btn primary" onClick={download}>
                  Download CSV
                </button>
              </div>
              <div className="table-wrap">
                <table className="results">
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Flag</th>
                      <th>Race-free ≤ 20</th>
                      <th>Counted from</th>
                      <th className="num">To review</th>
                      <th>Other late milestones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((r) => {
                      const w = r.result.waitlist
                      const other = r.result.crossings.filter((c) => c.late && c.threshold.value !== 20)
                      const owes = (w?.owedDays ?? 0) > 0
                      return (
                        <tr key={r.id} className={owes ? 'is-late' : undefined}>
                          <td className="mono">
                            <b>{r.id}</b>
                          </td>
                          <td>
                            {owes ? (
                              <span className="flag late">WAIT TIME</span>
                            ) : r.result.affected ? (
                              <span className="flag warn">LATE CARE</span>
                            ) : (
                              <span className="flag">CLEAR</span>
                            )}
                          </td>
                          <td className="mono">{w ? fmtDate(w.qualifiedOn) : '—'}</td>
                          <td className="mono">
                            {w?.countedFrom ? fmtDate(w.countedFrom) : w ? 'not yet' : '—'}
                            {w?.countedFromSource === 'patient' && <span className="muted"> on file</span>}
                          </td>
                          <td className="mono num">{owes ? formatDuration(w!.owedDays) : '—'}</td>
                          <td className="mono">
                            {other
                              .map((c) => `<${c.threshold.value} ${c.delayDays > 0 ? formatDuration(c.delayDays) : 'not on reports'}`)
                              .join(', ') || '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : (
          !result?.errors.length && (
            <section className="waiting">
              <h2>Add a CSV to screen a panel</h2>
              <p>Each patient is checked for late milestones and missing transplant wait time, then ranked.</p>
            </section>
          )
        )}
      </div>
    </div>
  )
}
