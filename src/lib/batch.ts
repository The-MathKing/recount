import { analyze, type Analysis, type Patient, type Reading } from './analyze'
import type { LegacyEquation, Sex } from './egfr'

export interface BatchRow {
  id: string
  patient: Patient
  readings: Reading[]
  result: Analysis
}

export interface BatchResult {
  rows: BatchRow[]
  errors: string[]
}

export const CSV_HEADER = 'patient_id,dob,sex,date,creatinine_mg_dl,reported_egfr,equation,wait_start'

function splitLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let quoted = false
  for (const ch of line) {
    if (ch === '"') quoted = !quoted
    else if (ch === ',' && !quoted) {
      out.push(cur.trim())
      cur = ''
    } else cur += ch
  }
  out.push(cur.trim())
  return out
}

function parseSex(v: string): Sex | undefined {
  const s = v.toLowerCase()
  if (s === 'f' || s === 'female') return 'female'
  if (s === 'm' || s === 'male') return 'male'
}

function parseEquation(v: string): LegacyEquation {
  return v.toLowerCase().includes('mdrd') ? 'mdrd' : 'ckdepi2009'
}

const ISO = /^\d{4}-\d{2}-\d{2}$/

/** Parse a clinic export (one row per lab result) and screen every patient in it. Runs entirely in the browser. */
export function runBatch(csv: string): BatchResult {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim())
  if (!lines.length) return { rows: [], errors: ['The file is empty.'] }
  const header = splitLine(lines[0]).map((h) => h.toLowerCase())
  const col = (name: string) => header.findIndex((h) => h.startsWith(name))
  const idx = {
    id: col('patient'),
    dob: col('dob'),
    sex: col('sex'),
    date: col('date'),
    scr: col('creatinine'),
    reported: col('reported'),
    equation: col('equation'),
    waitStart: col('wait'),
  }
  const missing = (['id', 'dob', 'sex', 'date'] as const).filter((k) => idx[k] < 0)
  if (missing.length || (idx.scr < 0 && idx.reported < 0)) {
    return { rows: [], errors: [`Expected columns: ${CSV_HEADER}`] }
  }

  const errors: string[] = []
  const groups = new Map<string, { patient: Patient; readings: Reading[] }>()
  lines.slice(1).forEach((line, i) => {
    const c = splitLine(line)
    const at = `Row ${i + 2}`
    const id = c[idx.id]
    const sex = parseSex(c[idx.sex] ?? '')
    const dob = c[idx.dob]
    const date = c[idx.date]
    const scr = idx.scr >= 0 ? parseFloat(c[idx.scr]) : NaN
    const reported = idx.reported >= 0 ? parseFloat(c[idx.reported]) : NaN
    if (!id) return errors.push(`${at}: missing patient_id`)
    if (!sex) return errors.push(`${at}: sex must be F or M`)
    if (!ISO.test(dob ?? '') || !ISO.test(date ?? '')) return errors.push(`${at}: dates must be YYYY-MM-DD`)
    if (!(scr > 0) && !(reported > 0)) return errors.push(`${at}: needs a creatinine or a reported eGFR`)

    let g = groups.get(id)
    if (!g) {
      const waitStart = idx.waitStart >= 0 && ISO.test(c[idx.waitStart] ?? '') ? c[idx.waitStart] : undefined
      g = { patient: { dob, sex, equation: parseEquation(c[idx.equation] ?? ''), waitStart }, readings: [] }
      groups.set(id, g)
    }
    g.readings.push({ date, scr: scr > 0 ? scr : undefined, reported: reported > 0 ? reported : undefined })
  })

  const rows = [...groups].map(([id, g]) => ({ id, ...g, result: analyze(g.patient, g.readings) }))
  rows.sort((a, b) => (b.result.waitlist?.owedDays ?? 0) - (a.result.waitlist?.owedDays ?? 0))
  return { rows, errors }
}

export function toCsv(rows: BatchRow[]): string {
  const head = 'patient_id,affected,race_neutral_qualified_on,wait_time_counted_from,days_owed,milestones_delayed'
  const body = rows.map((r) => {
    const w = r.result.waitlist
    const delayed = r.result.crossings
      .filter((c) => c.late)
      .map((c) => `eGFR ${c.threshold.inclusive ? '≤' : '<'}${c.threshold.value}: ${c.delayDays}d`)
      .join('; ')
    return [r.id, r.result.affected ? 'yes' : 'no', w?.qualifiedOn ?? '', w?.countedFrom ?? '', w?.owedDays ?? '', `"${delayed}"`].join(',')
  })
  return [head, ...body].join('\n')
}
