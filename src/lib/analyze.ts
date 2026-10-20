import {
  THRESHOLDS,
  ageOn,
  ckdEpi2021,
  creatinineFromLegacy,
  crosses,
  legacy,
  stage,
  type LegacyEquation,
  type Sex,
  type Stage,
  type Threshold,
} from './egfr'

export interface Patient {
  dob: string
  sex: Sex
  /** Which equation the lab used for the race-adjusted number. */
  equation: LegacyEquation
  /** The date the transplant center currently counts wait time from, if the patient knows it. */
  waitStart?: string
}

/** One lab result. Give the creatinine, or the race-adjusted eGFR if that is all the report shows. */
export interface Reading {
  date: string
  scr?: number
  reported?: number
}

export interface Point {
  date: string
  age: number
  scr: number
  /** eGFR with the race multiplier: what the chart said. */
  reported: number
  /** CKD-EPI 2021, no race term. */
  raceFree: number
  /** The same legacy equation with the race multiplier removed. */
  legacyNoRace: number
  reportedStage: Stage
  raceFreeStage: Stage
  /** Derived from a reported eGFR rather than measured. */
  inferred: boolean
}

export interface Crossing {
  threshold: Threshold
  reportedOn?: string
  raceFreeOn?: string
  /** Days the race multiplier delayed this milestone. A lower bound when `ongoing`. */
  delayDays: number
  /** The race-adjusted number still hasn't crossed as of the latest reading. */
  ongoing: boolean
  /** Reached later on the reports than it should have been, or not reached on them at all. */
  late: boolean
}

export interface Waitlist {
  /** First date a race-neutral eGFR was 20 or below. */
  qualifiedOn: string
  method: 'CKD-EPI 2021' | 'legacy equation without race'
  /** What we compare against: the patient's stated wait-time start, or the first race-adjusted eGFR ≤ 20. */
  countedFrom?: string
  countedFromSource: 'patient' | 'labs' | 'none'
  owedDays: number
}

export interface Analysis {
  points: Point[]
  crossings: Crossing[]
  waitlist?: Waitlist
  /** At least one milestone was reached later than it should have been. */
  affected: boolean
}

const DAY = 86_400_000
const days = (a: string, b: string) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / DAY)

export function analyze(patient: Patient, readings: Reading[]): Analysis {
  const points: Point[] = readings
    .filter((r) => r.date && ((r.scr ?? 0) > 0 || (r.reported ?? 0) > 0))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((r) => {
      const age = ageOn(patient.dob, r.date)
      const inferred = !(r.scr && r.scr > 0)
      const scr = inferred ? creatinineFromLegacy(r.reported!, patient.equation, age, patient.sex) : r.scr!
      // Keep the patient's own number exactly; bisection can land a hair off a threshold.
      const reported = inferred ? r.reported! : legacy(patient.equation, scr, age, patient.sex, true)
      const raceFree = ckdEpi2021(scr, age, patient.sex)
      return {
        date: r.date,
        age,
        scr,
        reported,
        raceFree,
        legacyNoRace: legacy(patient.equation, scr, age, patient.sex, false),
        reportedStage: stage(reported),
        raceFreeStage: stage(raceFree),
        inferred,
      }
    })

  const last = points.at(-1)?.date
  const waitlist = waitlistFor(patient, points)
  const crossings: Crossing[] = []
  for (const t of THRESHOLDS) {
    const reportedOn = points.find((p) => crosses(t, p.reported))?.date
    // The wait-list milestone follows OPTN's rule (any race-neutral equation), so it agrees with `waitlist`.
    const raceFreeOn = t.value === 20 && waitlist ? waitlist.qualifiedOn : points.find((p) => crosses(t, p.raceFree))?.date
    if (!raceFreeOn) continue
    const ongoing = !reportedOn
    const delayDays = days(raceFreeOn, reportedOn ?? last!)
    crossings.push({ threshold: t, reportedOn, raceFreeOn, delayDays: Math.max(0, delayDays), ongoing, late: ongoing || delayDays > 0 })
  }

  const affected = crossings.some((c) => c.late) || (waitlist?.owedDays ?? 0) > 0
  return { points, crossings, waitlist, affected }
}

function waitlistFor(patient: Patient, points: Point[]): Waitlist | undefined {
  // OPTN lets centers use any race-neutral calculation, so take whichever qualified first.
  const by2021 = points.find((p) => p.raceFree <= 20)?.date
  const byLegacy = points.find((p) => p.legacyNoRace <= 20)?.date
  const qualifiedOn = [by2021, byLegacy].filter(Boolean).sort()[0]
  if (!qualifiedOn) return undefined
  const method = qualifiedOn === by2021 ? 'CKD-EPI 2021' : 'legacy equation without race'

  let countedFrom: string | undefined
  let countedFromSource: Waitlist['countedFromSource'] = 'none'
  if (patient.waitStart) {
    countedFrom = patient.waitStart
    countedFromSource = 'patient'
  } else {
    countedFrom = points.find((p) => p.reported <= 20)?.date
    if (countedFrom) countedFromSource = 'labs'
  }
  // With nothing to compare against, the whole stretch to the latest lab is unaccounted for.
  const until = countedFrom ?? points.at(-1)!.date
  return { qualifiedOn, method, countedFrom, countedFromSource, owedDays: Math.max(0, days(qualifiedOn, until)) }
}

export function formatDuration(d: number): string {
  if (d < 45) return `${d} day${d === 1 ? '' : 's'}`
  const months = Math.round(d / 30.44)
  if (months < 18) return `${months} months`
  const years = d / 365.25
  return `${years.toFixed(1)} years`
}
