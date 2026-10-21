import type { Reading } from './analyze'
import { UMOL_PER_MGDL } from './egfr'

// Wide enough for real kidney failure, narrow enough to catch a value typed in the wrong units.
export const SCR_MGDL = { min: 0.2, max: 20 }
export const EGFR = { min: 3, max: 150 }

export function isoToday(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Why a reading can't be used, or undefined if it looks plausible. Creatinine is in mg/dL. */
export function readingProblem(r: Reading, dob: string, today = isoToday()): string | undefined {
  if (dob && r.date < dob) return 'This test date is before the date of birth.'
  if (r.date > today) return 'This test date is in the future.'
  if (r.scr !== undefined && (r.scr < SCR_MGDL.min || r.scr > SCR_MGDL.max)) {
    return `Creatinine is usually ${SCR_MGDL.min}–${SCR_MGDL.max} mg/dL (${Math.round(SCR_MGDL.min * UMOL_PER_MGDL)}–${Math.round(
      SCR_MGDL.max * UMOL_PER_MGDL,
    ).toLocaleString('en-US')} µmol/L). Check the value and the units.`
  }
  if (r.reported !== undefined && (r.reported < EGFR.min || r.reported > EGFR.max)) {
    return `eGFR is usually between ${EGFR.min} and ${EGFR.max}. Check the value.`
  }
}
