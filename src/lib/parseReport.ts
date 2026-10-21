// Turn OCR text from a photographed lab report into structured readings.
// OCR only supplies the numbers printed on the page; every eGFR shown in the app is still
// recomputed from creatinine with the published equations.

import { UMOL_PER_MGDL, ageOn, ckdEpi2009, mdrd, type LegacyEquation, type Sex } from './egfr'

export interface FoundReading {
  date: string
  /** mg/dL, converted if the report used µmol/L. */
  scr?: number
  /** The printed "eGFR if African American" value. */
  reportedBlack?: number
  /** The printed "eGFR if non-African American" value. */
  reportedOther?: number
  /** The OCR line(s) the values came from, so the user can see why. */
  source: string
}

export interface FoundReport {
  dob?: string
  sex?: Sex
  readings: FoundReading[]
  /** Which old equation reproduces the printed eGFR, when the report shows both creatinine and eGFR. */
  equation?: LegacyEquation
  warnings: string[]
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

function iso(y: number, m: number, d: number): string | undefined {
  if (y < 100) y += y <= 40 ? 2000 : 1900
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900 || y > 2100) return undefined
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** All dates on a line, in order. US reports print M/D/Y. */
export function findDates(line: string): { date: string; index: number; end: number }[] {
  const out: { date: string; index: number; end: number }[] = []
  const add = (date: string | undefined, m: RegExpExecArray) => {
    if (date) out.push({ date, index: m.index, end: m.index + m[0].length })
  }
  let m: RegExpExecArray | null
  const numeric = /\b(\d{1,4})[/.-](\d{1,2})[/.-](\d{2,4})\b/g
  while ((m = numeric.exec(line))) {
    const [a, b, c] = [+m[1], +m[2], +m[3]]
    add(m[1].length === 4 ? iso(a, b, c) : iso(c, a, b), m)
  }
  const named = /\b([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})\b/g
  while ((m = named.exec(line))) {
    const month = MONTHS.indexOf(m[1].toLowerCase())
    if (month >= 0) add(iso(+m[3], month + 1, +m[2]), m)
  }
  return out.sort((x, y) => x.index - y.index)
}

/** Undo the usual OCR slips inside numbers: O for 0, l or I for 1, a comma for the decimal point. */
function cleanNumbers(line: string): string {
  return line
    .replace(/(?<=\d)[oO](?=[\d.]|\b)|(?<=[\s:]|^)[oO](?=[.,]\d)/g, '0')
    .replace(/(?<=\d)[lI|](?=[\d.]|\b)|(?<=[\s:]|^)[lI|](?=[.,]\d)/g, '1')
    .replace(/(?<=\d),(?=\d{1,2}\b)/g, '.')
}

/** The first number after `from`, skipping one written as a bound like ">60". */
function numberAfter(line: string, from: number): number | undefined {
  const m = /(^|[^\d.])([<>]?)(\d+(?:\.\d+)?)/.exec(line.slice(from))
  if (!m || m[2]) return undefined
  return parseFloat(m[3])
}

type Kind = 'scr' | 'black' | 'other'

/** What a test line reports, and where its name ends. */
function classify(lower: string): { kind: Kind; end: number } | undefined {
  const creat = /creat[a-z]*/.exec(lower)
  if (creat && !/ratio|urine|clearance|kinase/.test(lower)) return { kind: 'scr', end: creat.index + creat[0].length }
  const gfr = /e?gfr/.exec(lower)
  if (!gfr) return undefined
  // Read past the qualifier ("if non-African Am") so its letters aren't mistaken for the value.
  const qualifier = /(non[\s-]*)?(afr[a-z]*\.?\s*am[a-z]*\.?|african|black|\baa\b|a\.a\.)/.exec(lower.slice(gfr.index))
  if (!qualifier) return undefined
  const end = gfr.index + qualifier.index + qualifier[0].length
  return { kind: qualifier[1] ? 'other' : 'black', end }
}

export function parseReport(text: string): FoundReport {
  const lines = text
    .split(/\r?\n/)
    .map((l) => cleanNumbers(l.trim()))
    .filter(Boolean)
  const warnings: string[] = []
  let dob: string | undefined
  let sex: Sex | undefined
  let collected: string | undefined
  let fallbackDate: string | undefined
  let umol = false
  const main: Omit<FoundReading, 'date'> = { source: '' }
  const table = new Map<string, FoundReading>()
  // Column order of a results-history table, once we've seen its header.
  let columns: Kind[] | undefined

  for (const line of lines) {
    const lower = line.toLowerCase()
    const dates = findDates(line)
    if (/µmol|umol|μmol|mmol/.test(lower) && /creat/.test(lower)) umol = true

    if (/\b(dob|d\.o\.b|birth)\b/.test(lower) && dates.length) dob = dates[0].date
    const sexMatch = /\b(sex|gender)\b\s*[:-]?\s*(female|male|f|m)\b/.exec(lower)
    if (sexMatch) sex = sexMatch[2].startsWith('f') ? 'female' : 'male'
    if (/collect|drawn|specimen|date of service/.test(lower) && dates.length) collected ??= dates[0].date
    if (!fallbackDate && dates.length && !/\b(dob|birth)\b/.test(lower)) fallbackDate = dates[0].date

    // A history table header, e.g. "DATE  CREATININE  eGFR AFR AM".
    if (/\bdate\b/.test(lower) && /creat|gfr/.test(lower) && !dates.length) {
      columns = []
      for (const m of lower.matchAll(/creat[a-z]*|e?gfr[^a-z]*(non[\s-]*)?(afr[a-z]*\.?\s*am[a-z]*|african|black|aa)?/g)) {
        columns.push(m[0].startsWith('creat') ? 'scr' : m[1] ? 'other' : 'black')
      }
      continue
    }

    // A history row: a date, then values in the header's column order. Photos often add a stray
    // character or two from the table border before the date, so allow a short prefix with no digits.
    if (columns && dates.length && /^[^\d]{0,8}$/.test(line.slice(0, dates[0].index))) {
      const values = [...line.slice(dates[0].end).matchAll(/(?<![\d.])(\d+(?:\.\d+)?)/g)].map((m) => parseFloat(m[1]))
      const row: FoundReading = { date: dates[0].date, source: line }
      columns.forEach((kind, i) => {
        const v = values[i]
        if (v === undefined) return
        if (kind === 'scr') row.scr = v
        else if (kind === 'black') row.reportedBlack = v
        else row.reportedOther = v
      })
      if (row.scr || row.reportedBlack) table.set(row.date, row)
      continue
    }

    const test = classify(lower)
    if (!test) continue
    const value = numberAfter(line, test.end)
    if (value === undefined) continue
    if (test.kind === 'scr' && main.scr === undefined) main.scr = value
    else if (test.kind === 'black' && main.reportedBlack === undefined) main.reportedBlack = value
    else if (test.kind === 'other' && main.reportedOther === undefined) main.reportedOther = value
    else continue
    main.source = main.source ? `${main.source}\n${line}` : line
  }

  const readings: FoundReading[] = [...table.values()]
  if (main.scr !== undefined || main.reportedBlack !== undefined) {
    const date = collected ?? fallbackDate
    if (!date) warnings.push("Couldn't find the date the blood was drawn. Add it before using this result.")
    if (!collected && date) warnings.push('No collection date was labeled, so the first date on the report was used. Check it.')
    if (date) readings.push({ date, ...main })
  }
  if (umol) {
    for (const r of readings) if (r.scr !== undefined) r.scr = +(r.scr / UMOL_PER_MGDL).toFixed(2)
  }
  readings.sort((a, b) => a.date.localeCompare(b.date))

  // Keep one reading per date; the main result wins over a history row for the same day.
  const byDate = new Map(readings.map((r) => [r.date, r]))
  const unique = [...byDate.values()]
  if (!unique.length) warnings.push("Couldn't find a creatinine or an eGFR result on this report.")

  return { dob, sex, readings: unique, equation: inferEquation(unique, dob, sex), warnings }
}

/**
 * Work out which old equation the lab used by recomputing each printed "African American" eGFR from its
 * creatinine. Labs round to whole numbers and the two equations converge at low eGFR, so only answer
 * when one clearly fits better across the results we have.
 */
export function inferEquation(readings: FoundReading[], dob?: string, sex?: Sex): LegacyEquation | undefined {
  if (!dob || !sex) return undefined
  const pairs = readings.filter((r) => r.scr && r.reportedBlack)
  if (!pairs.length) return undefined
  const meanError = (f: (scr: number, age: number) => number) =>
    pairs.reduce((sum, r) => sum + Math.abs(f(r.scr!, ageOn(dob, r.date)) - r.reportedBlack!), 0) / pairs.length
  const e2009 = meanError((scr, age) => ckdEpi2009(scr, age, sex, true))
  const eMdrd = meanError((scr, age) => mdrd(scr, age, sex, true))
  const [best, bestErr, otherErr] = e2009 <= eMdrd ? (['ckdepi2009', e2009, eMdrd] as const) : (['mdrd', eMdrd, e2009] as const)
  // With only one or two results, one rounded number can't separate them unless the gap is wide.
  const margin = pairs.length >= 3 ? 0.25 : 0.75
  return bestErr <= 0.55 && otherErr - bestErr >= margin ? best : undefined
}
