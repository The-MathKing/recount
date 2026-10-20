// Kidney function equations. Creatinine is always in mg/dL here; convert at the edges.

export type Sex = 'female' | 'male'

/** The equation a lab used to produce the number on the patient's report. */
export type LegacyEquation = 'ckdepi2009' | 'mdrd'

export const UMOL_PER_MGDL = 88.4

/** CKD-EPI 2009 (Levey et al., Ann Intern Med 2009). Includes the 1.159 multiplier for Black patients. */
export function ckdEpi2009(scr: number, age: number, sex: Sex, black: boolean): number {
  const k = sex === 'female' ? 0.7 : 0.9
  const a = sex === 'female' ? -0.329 : -0.411
  const r = scr / k
  let gfr = 141 * Math.min(r, 1) ** a * Math.max(r, 1) ** -1.209 * 0.993 ** age
  if (sex === 'female') gfr *= 1.018
  if (black) gfr *= 1.159
  return gfr
}

/** IDMS-traceable 4-variable MDRD (Levey et al., Clin Chem 2007). Includes the 1.212 multiplier for Black patients. */
export function mdrd(scr: number, age: number, sex: Sex, black: boolean): number {
  let gfr = 175 * scr ** -1.154 * age ** -0.203
  if (sex === 'female') gfr *= 0.742
  if (black) gfr *= 1.212
  return gfr
}

/** CKD-EPI 2021 race-free refit (Inker et al., NEJM 2021), recommended by the NKF-ASN Task Force. */
export function ckdEpi2021(scr: number, age: number, sex: Sex): number {
  const k = sex === 'female' ? 0.7 : 0.9
  const a = sex === 'female' ? -0.241 : -0.302
  const r = scr / k
  let gfr = 142 * Math.min(r, 1) ** a * Math.max(r, 1) ** -1.2 * 0.9938 ** age
  if (sex === 'female') gfr *= 1.012
  return gfr
}

export function legacy(eq: LegacyEquation, scr: number, age: number, sex: Sex, black: boolean): number {
  return eq === 'mdrd' ? mdrd(scr, age, sex, black) : ckdEpi2009(scr, age, sex, black)
}

/**
 * Recover the creatinine behind a race-adjusted eGFR, for patients whose portal only shows
 * the "African American" eGFR line. Both legacy equations fall as creatinine rises, so bisect.
 */
export function creatinineFromLegacy(egfr: number, eq: LegacyEquation, age: number, sex: Sex): number {
  let lo = 0.05
  let hi = 40
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2
    if (legacy(eq, mid, age, sex, true) > egfr) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

export type Stage = 'G1' | 'G2' | 'G3a' | 'G3b' | 'G4' | 'G5'

/** KDIGO 2012 GFR categories. */
export function stage(gfr: number): Stage {
  if (gfr >= 90) return 'G1'
  if (gfr >= 60) return 'G2'
  if (gfr >= 45) return 'G3a'
  if (gfr >= 30) return 'G3b'
  if (gfr >= 15) return 'G4'
  return 'G5'
}

export const STAGE_LABEL: Record<Stage, string> = {
  G1: 'Stage 1 (normal or high)',
  G2: 'Stage 2 (mildly decreased)',
  G3a: 'Stage 3a (mild to moderate)',
  G3b: 'Stage 3b (moderate to severe)',
  G4: 'Stage 4 (severely decreased)',
  G5: 'Stage 5 (kidney failure)',
}

export interface Threshold {
  value: number
  /** True when "at or below" counts as crossing (the OPTN wait-list rule), false for strictly below. */
  inclusive: boolean
  title: string
  why: string
}

// Clinical decision points where the race multiplier can push a patient onto the wrong side.
export const THRESHOLDS: Threshold[] = [
  {
    value: 60,
    inclusive: false,
    title: 'Chronic kidney disease diagnosis',
    why: 'eGFR below 60 for 3+ months defines CKD (KDIGO). It starts monitoring, blood pressure targets and kidney-protective medicines like SGLT2 inhibitors.',
  },
  {
    value: 45,
    inclusive: false,
    title: 'Metformin caution',
    why: 'FDA labeling says not to start metformin below 45 and to reassess the risk of continuing it.',
  },
  {
    value: 30,
    inclusive: false,
    title: 'Nephrologist referral (Stage 4)',
    why: 'KDIGO recommends referral to a kidney specialist below 30. It is also when to start planning for dialysis access and a transplant evaluation. Metformin is contraindicated.',
  },
  {
    value: 20,
    inclusive: true,
    title: 'Kidney transplant wait-list clock',
    why: 'Under OPTN policy, wait time for a deceased-donor kidney can start accruing once eGFR is 20 or below. Wait time is the biggest factor in who gets offered a kidney.',
  },
  {
    value: 15,
    inclusive: false,
    title: 'Kidney failure (Stage 5)',
    why: 'Below 15 is kidney failure; dialysis or a transplant is usually needed soon.',
  },
]

export function crosses(t: Threshold, gfr: number): boolean {
  return t.inclusive ? gfr <= t.value : gfr < t.value
}

export function ageOn(dob: string, date: string): number {
  const b = new Date(dob + 'T00:00:00')
  const d = new Date(date + 'T00:00:00')
  return (d.getTime() - b.getTime()) / (365.2425 * 86_400_000)
}
