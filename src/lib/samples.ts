import type { Patient, Reading } from './analyze'

// Fictional patient for the demo. Creatinine climbs slowly, as it does in real CKD.
export const SAMPLE_PATIENT: Patient = { dob: '1966-04-12', sex: 'male', equation: 'ckdepi2009' }

export const SAMPLE_READINGS: Reading[] = [
  { date: '2014-03-04', scr: 1.45 },
  { date: '2015-02-17', scr: 1.62 },
  { date: '2016-01-26', scr: 1.95 },
  { date: '2017-02-07', scr: 2.3 },
  { date: '2017-11-14', scr: 2.7 },
  { date: '2018-08-21', scr: 3.05 },
  { date: '2019-03-12', scr: 3.3 },
  { date: '2019-10-08', scr: 3.45 },
  { date: '2020-06-16', scr: 3.6 },
  { date: '2021-02-23', scr: 3.75 },
  { date: '2021-09-28', scr: 4.0 },
  { date: '2022-05-10', scr: 4.4 },
]

// Fictional clinic panel: some patients affected, some not, one with only portal eGFR values.
export const SAMPLE_CSV = `patient_id,dob,sex,date,creatinine_mg_dl,reported_egfr,equation,wait_start
A-1001,1966-04-12,M,2018-08-21,3.05,,CKD-EPI 2009,
A-1001,1966-04-12,M,2019-10-08,3.45,,CKD-EPI 2009,
A-1001,1966-04-12,M,2020-06-16,3.6,,CKD-EPI 2009,
A-1001,1966-04-12,M,2021-02-23,3.75,,CKD-EPI 2009,
A-1001,1966-04-12,M,2021-09-28,4.0,,CKD-EPI 2009,
B-2044,1958-09-30,F,2019-01-15,2.1,,MDRD,2022-03-01
B-2044,1958-09-30,F,2020-01-20,2.35,,MDRD,2022-03-01
B-2044,1958-09-30,F,2021-01-11,2.6,,MDRD,2022-03-01
B-2044,1958-09-30,F,2022-01-24,2.95,,MDRD,2022-03-01
C-3310,1975-12-02,M,2020-05-05,1.1,,CKD-EPI 2009,
C-3310,1975-12-02,M,2022-05-03,1.15,,CKD-EPI 2009,
D-4182,1971-06-18,F,2019-07-09,,24,CKD-EPI 2009,
D-4182,1971-06-18,F,2020-07-14,,22,CKD-EPI 2009,
D-4182,1971-06-18,F,2021-07-13,,20,CKD-EPI 2009,
E-5027,1962-02-27,M,2020-03-03,2.2,,CKD-EPI 2009,
E-5027,1962-02-27,M,2021-03-09,2.45,,CKD-EPI 2009,
E-5027,1962-02-27,M,2022-03-08,2.7,,CKD-EPI 2009,`
