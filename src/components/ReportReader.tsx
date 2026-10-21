import { useEffect, useState } from 'react'
import { ageOn, legacy } from '../lib/egfr'
import { readImage, type OcrProgress } from '../lib/ocr'
import { parseReport, type FoundReading, type FoundReport } from '../lib/parseReport'
import { fmtDate } from './format'

type State =
  | { step: 'idle' }
  | { step: 'reading'; preview: string; progress: OcrProgress }
  | { step: 'review'; preview: string; text: string; found: FoundReport; picked: Set<string> }
  | { step: 'error'; message: string }

const SAMPLE_URL = 'sample-lab-report.png'

/** Does the printed "African American" eGFR match what the old equation gives for the printed creatinine? */
function printedCheck(r: FoundReading, found: FoundReport): 'match' | 'mismatch' | undefined {
  if (!r.scr || !r.reportedBlack || !found.dob || !found.sex) return undefined
  const expected = legacy(found.equation ?? 'ckdepi2009', r.scr, ageOn(found.dob, r.date), found.sex, true)
  return Math.abs(expected - r.reportedBlack) <= Math.max(1.5, r.reportedBlack * 0.05) ? 'match' : 'mismatch'
}

export function ReportReader({ onAdd }: { onAdd: (found: FoundReport, readings: FoundReading[]) => void }) {
  const [state, setState] = useState<State>({ step: 'idle' })
  const preview = state.step === 'reading' || state.step === 'review' ? state.preview : undefined

  useEffect(() => {
    // Object URLs hold the image in memory until revoked.
    return () => {
      if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview)
    }
  }, [preview])

  const read = async (image: Blob, previewUrl: string) => {
    setState({ step: 'reading', preview: previewUrl, progress: { stage: 'loading', fraction: 0 } })
    try {
      const text = await readImage(image, (progress) =>
        setState((s) => (s.step === 'reading' ? { ...s, progress } : s)),
      )
      const found = parseReport(text)
      setState({ step: 'review', preview: previewUrl, text, found, picked: new Set(found.readings.map((r) => r.date)) })
    } catch {
      setState({ step: 'error', message: "The reader couldn't open that image. Try a JPEG or PNG photo." })
    }
  }

  const onFile = (file?: File) => {
    if (file) read(file, URL.createObjectURL(file))
  }

  const trySample = async () => {
    const res = await fetch(SAMPLE_URL)
    read(await res.blob(), SAMPLE_URL)
  }

  if (state.step === 'reading') {
    const pct = Math.round(state.progress.fraction * 100)
    return (
      <section className="reader" aria-live="polite">
        <ReaderHead />
        <div className="reader-busy">
          <img src={state.preview} alt="The lab report being read" />
          <div>
            <p>{state.progress.stage === 'loading' ? 'Loading the reader…' : `Reading the report… ${pct}%`}</p>
            <progress max={1} value={state.progress.stage === 'reading' ? state.progress.fraction : undefined} />
            <p className="fine">Running on this device. The photo isn't uploaded.</p>
          </div>
        </div>
      </section>
    )
  }

  if (state.step === 'review') {
    const { found, picked } = state
    const toggle = (date: string) => {
      const next = new Set(picked)
      if (next.has(date)) next.delete(date)
      else next.add(date)
      setState({ ...state, picked: next })
    }
    const chosen = found.readings.filter((r) => picked.has(r.date))
    return (
      <section className="reader" aria-labelledby="reader-found">
        <ReaderHead />
        <div className="reader-found">
          <img src={state.preview} alt="The lab report that was read" />
          <dl>
            <div>
              <dt>Born</dt>
              <dd>{found.dob ? fmtDate(found.dob) : 'not found'}</dd>
            </div>
            <div>
              <dt>Sex</dt>
              <dd>{found.sex ?? 'not found'}</dd>
            </div>
            <div>
              <dt>Lab's formula</dt>
              <dd>
                {found.equation === 'mdrd' ? 'MDRD' : found.equation === 'ckdepi2009' ? 'CKD-EPI 2009' : 'not sure'}
              </dd>
            </div>
          </dl>
        </div>
        <h3 id="reader-found" className="label">
          {found.readings.length ? `Found ${found.readings.length} result${found.readings.length === 1 ? '' : 's'}` : 'No results found'}
        </h3>
        {found.readings.length > 0 && (
          <ul className="found-list">
            {found.readings.map((r) => {
              const check = printedCheck(r, found)
              return (
                <li key={r.date}>
                  <label>
                    <input type="checkbox" checked={picked.has(r.date)} onChange={() => toggle(r.date)} />
                    <span className="mono">{fmtDate(r.date)}</span>
                    <span className="mono">
                      {r.scr ? `creatinine ${r.scr.toFixed(2)}` : `eGFR (Black) ${r.reportedBlack}`}
                    </span>
                  </label>
                  {check === 'match' && <span className="check ok">printed eGFR {r.reportedBlack} checks out</span>}
                  {check === 'mismatch' && (
                    <span className="check bad">printed eGFR {r.reportedBlack} doesn't match. Check this creatinine.</span>
                  )}
                </li>
              )
            })}
          </ul>
        )}
        {found.warnings.map((w) => (
          <p key={w} className="row-problem">
            {w}
          </p>
        ))}
        <details>
          <summary className="fine">What the reader saw</summary>
          <pre className="ocr-text">{state.text}</pre>
        </details>
        <div className="actions">
          <button
            type="button"
            className="btn primary"
            disabled={!chosen.length}
            onClick={() => {
              onAdd(found, chosen)
              setState({ step: 'idle' })
            }}
          >
            Add {chosen.length} result{chosen.length === 1 ? '' : 's'}
          </button>
          <button type="button" className="btn" onClick={() => setState({ step: 'idle' })}>
            Discard
          </button>
        </div>
        <p className="fine">Check each number against the report. You can still edit them after adding.</p>
      </section>
    )
  }

  return (
    <section className="reader">
      <ReaderHead />
      <p className="fine">
        Photograph a printed lab report. Text recognition runs in this browser and the photo is never uploaded. Recount still
        computes every eGFR from the creatinine with the published formulas.
      </p>
      {state.step === 'error' && <p className="row-problem">{state.message}</p>}
      <div className="actions">
        <label className="btn file-btn">
          Choose a photo
          <input id="report-photo" type="file" accept="image/*" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
        <button type="button" className="link-btn" onClick={trySample}>
          Try a sample report
        </button>
      </div>
    </section>
  )
}

function ReaderHead() {
  return (
    <div className="intake-head">
      <h2 className="label">Read a lab report</h2>
      <span className="ai-chip">On-device AI</span>
    </div>
  )
}
