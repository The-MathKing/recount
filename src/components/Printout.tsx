import { useId, useState } from 'react'
import { analyze } from '../lib/analyze'
import { ckdEpi2009, ckdEpi2021 } from '../lib/egfr'
import { SAMPLE_PATIENT, SAMPLE_READINGS } from '../lib/samples'

// One real line from the example patient: the reading where the multiplier hid a wait-list-eligible eGFR.
const SPECIMEN = analyze(SAMPLE_PATIENT, SAMPLE_READINGS).points.find((p) => p.raceFree <= 20 && p.reported > 20)!

function Eligibility({ gfr }: { gfr: number }) {
  return gfr <= 20 ? <span className="elig yes">≤ 20 · listable</span> : <span className="elig">&gt; 20</span>
}

/** A clipped lab printout the reader can play with: slide the creatinine and watch the two formulas split. */
export function Printout() {
  const [scr, setScr] = useState(SPECIMEN.scr)
  const sliderId = useId()
  const reported = ckdEpi2009(scr, SPECIMEN.age, SAMPLE_PATIENT.sex, true)
  const raceFree = ckdEpi2021(scr, SPECIMEN.age, SAMPLE_PATIENT.sex)
  const split = raceFree <= 20 && reported > 20

  return (
    <figure className="printout" aria-label="Lab result recalculated without race">
      <span className="stamp" aria-hidden>
        Recalculated
      </span>
      <div className="printout-row">
        <span>CREATININE, SERUM</span>
        <b>{scr.toFixed(2)} mg/dL</b>
      </div>
      <div className="printout-row">
        <span>eGFR IF AFRICAN AMERICAN</span>
        <span className="vals">
          <b className="old">{reported.toFixed(1)}</b>
          <Eligibility gfr={reported} />
        </span>
      </div>
      <div className="printout-row fixed">
        <span>eGFR, RACE-FREE (2021)</span>
        <span className="vals">
          <b>{raceFree.toFixed(1)}</b>
          <Eligibility gfr={raceFree} />
        </span>
      </div>
      <label className="slider" htmlFor={sliderId}>
        <span>Try another creatinine</span>
        <input
          id={sliderId}
          type="range"
          min={1}
          max={6}
          step={0.05}
          value={scr}
          onChange={(e) => setScr(parseFloat(e.target.value))}
        />
      </label>
      <figcaption aria-live="polite">
        {split
          ? 'Same blood test. Only the race-free number qualifies for the transplant wait list.'
          : raceFree <= 20
            ? 'Both qualify at this level, but the old formula got there later.'
            : 'Neither qualifies yet. Slide right to see where the two formulas split.'}
      </figcaption>
    </figure>
  )
}
