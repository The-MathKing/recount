import { describe, expect, it } from 'vitest'
import { ageOn, mdrd } from './egfr'
import { findDates, parseReport } from './parseReport'

// What OCR returns for the bundled sample report, including a couple of typical misreads.
const SAMPLE_OCR = `NORTHSIDE COMMUNITY CLINIC LABORATORY        SAMPLE REPORT
Patient: SAMPLE, JORDAN        DOB: 04/12/1966     Sex: M
MRN: 0000000                   Collected: 06/16/2020 08:42
Ordering: A. Rivera, MD        Reported: 06/16/2020 14:10
TEST                     RESULT   FLAG   UNITS            REFERENCE
Creatinine, Serum        3.6O     H      mg/dL            0.76-1.27
BUN                      48       H      mg/dL            6-24
eGFR If NonAfricn Am     18       L      mL/min/1.73      >59
eGFR If Africn Am        21       L      mL/min/1.73      >59
CREATININE HISTORY
DATE           CREATININE (mg/dL)   eGFR AFRICN AM
08/21/2018     3.05                 26
03/12/2019     3.3O                 23
10/08/2019     3,45                 22`

describe('findDates', () => {
  it('reads US numeric, ISO and written dates', () => {
    expect(findDates('Collected: 06/16/2020 08:42').map((d) => d.date)).toEqual(['2020-06-16'])
    expect(findDates('98/21/2018')).toEqual([])
    expect(findDates('on 2019-10-08').map((d) => d.date)).toEqual(['2019-10-08'])
    expect(findDates('Drawn Mar 4, 2014').map((d) => d.date)).toEqual(['2014-03-04'])
    expect(findDates('DOB 4/12/66').map((d) => d.date)).toEqual(['1966-04-12'])
    expect(findDates('13/45/2020')).toEqual([])
  })
})

describe('parseReport', () => {
  const r = parseReport(SAMPLE_OCR)

  it('finds the patient details', () => {
    expect(r.dob).toBe('1966-04-12')
    expect(r.sex).toBe('male')
  })

  it('reads the main result on the collection date, fixing OCR slips', () => {
    const main = r.readings.find((x) => x.date === '2020-06-16')!
    expect(main.scr).toBe(3.6)
    expect(main.reportedBlack).toBe(21)
    expect(main.reportedOther).toBe(18)
  })

  it('reads the history table', () => {
    expect(r.readings.map((x) => [x.date, x.scr, x.reportedBlack])).toEqual([
      ['2018-08-21', 3.05, 26],
      ['2019-03-12', 3.3, 23],
      ['2019-10-08', 3.45, 22],
      ['2020-06-16', 3.6, 21],
    ])
  })

  it('works out the lab used CKD-EPI 2009 from the printed eGFR', () => {
    expect(r.equation).toBe('ckdepi2009')
    expect(r.warnings).toEqual([])
  })

  it('spots MDRD, and says nothing when the printed values could be either', () => {
    // At creatinine 1.3 the equations differ by several points; at 3.6 they round to almost the same number.
    const head = 'DOB: 04/12/1966 Sex: M\nCollected: 06/16/2020\n'
    const age = ageOn('1966-04-12', '2020-06-16')
    const printed = Math.round(mdrd(1.3, age, 'male', true))
    expect(parseReport(`${head}Creatinine 1.3 mg/dL\neGFR African American ${printed}`).equation).toBe('mdrd')
    expect(parseReport(`${head}Creatinine 3.6 mg/dL\neGFR African American 21`).equation).toBeUndefined()
  })

  it('reads history rows behind stray border marks from a photo', () => {
    const m = parseReport('DATE   CREATININE (mg/dL)   ©GFR AFRICN AM\ni      03/12/2019     3.30    23\n|  10/08/2019  3.45  22')
    expect(m.readings.map((x) => [x.date, x.scr, x.reportedBlack])).toEqual([
      ['2019-03-12', 3.3, 23],
      ['2019-10-08', 3.45, 22],
    ])
  })

  it('converts µmol/L', () => {
    const m = parseReport('Collected 2020-06-16\nCreatinine 318 umol/L')
    expect(m.readings[0].scr).toBeCloseTo(3.6, 1)
  })

  it('keeps a report that only prints the African American eGFR, and skips ">60"', () => {
    const m = parseReport('Date collected: 07/09/2019\neGFR non-Afr. American >60\neGFR Afr. American 24')
    expect(m.readings).toEqual([{ date: '2019-07-09', reportedBlack: 24, source: 'eGFR Afr. American 24' }])
  })

  it('ignores creatine kinase and urine creatinine', () => {
    const m = parseReport('Collected 01/02/2020\nCreatine Kinase 140\nCreatinine, Urine 120\nCreatinine 1.1')
    expect(m.readings[0].scr).toBe(1.1)
  })

  it('warns instead of guessing when there is nothing to read', () => {
    const m = parseReport('Lipid panel\nCholesterol 180')
    expect(m.readings).toEqual([])
    expect(m.warnings[0]).toMatch(/creatinine/)
  })
})
