# Recount ↺

**For 20+ years, kidney tests added points to Black patients' scores. Recount shows each patient whether that delayed their diagnosis, specialist referral or transplant wait time. It also writes the letter that asks for the time back.**

Built for the Black Code Collective Hacktoberfest.
**Track 2: Modern Healthcare Outcomes**, with a strong **Track 1: AI Ethics & Access** angle (an audit of a biased clinical algorithm).

---

## The problem

eGFR is the number doctors use to judge kidney function. It's calculated from a creatinine blood test, and for decades the standard equations multiplied the result by **1.159 (CKD-EPI 2009)** or **1.212 (MDRD)** if the patient was Black. A higher eGFR looks like healthier kidneys, so the same blood test kept Black patients above the cut-offs that trigger care:

| eGFR | What it unlocks |
|---|---|
| < 60 | CKD diagnosis, kidney-protective medicines |
| < 45 / < 30 | Metformin safety limits, nephrologist referral |
| ≤ 20 | **Kidney transplant wait time starts counting** |

In 2021 the NKF and ASN recommended the race-free CKD-EPI 2021 equation. In 2023 the OPTN required kidney programs to review their registered Black candidates and request a wait-time change for anyone affected. **But the fix only works if someone finds you.** People who changed clinics, who aren't listed yet, or who only have old results can be missed. So can people whose delay happened earlier, at diagnosis or referral, where no policy restores anything.

## What Recount does

1. **Check my labs (patients).** Enter your creatinine history, or just the "eGFR if African American" line from old portal reports; Recount works backwards from that. You get:
   - A headline: how much transplant wait time may be missing.
   - A timeline chart of race-adjusted vs race-free eGFR, with the uncounted wait time shaded.
   - Every care milestone, marked *on time* or *N months late*.
   - **A ready-to-send letter** to your doctor or transplant center that cites the OPTN policy. Print it, save it as a PDF, or copy it into a patient portal.
2. **Screen a clinic panel (dialysis units, CHWs, navigators).** Drop in a CSV export. Recount screens every patient, ranks them by wait time owed, and exports a call list.
3. **Why this matters.** Plain-language background, plus the same pattern in other algorithms (spirometry, VBAC, pulse oximetry).

### Ethics by design
- **Health data never leaves the browser.** No server, no accounts, no analytics.
- **No black box.** Every number comes from a published, peer-reviewed equation (cited in the app), not a model's guess. Unit tests check it against reference values.
- It's an advocacy tool, not a diagnosis. It helps patients ask the right question of the people who can act on it.

## Run it

```bash
cd recount
npm install
npm run dev        # http://localhost:5173
npm test           # equation + analysis tests (vitest)
npm run build      # static site in dist/, deploy anywhere (Netlify, Vercel, GitHub Pages)
```

## How it works

```
src/lib/egfr.ts      CKD-EPI 2009, MDRD, CKD-EPI 2021, inverse solver, KDIGO staging, thresholds
src/lib/analyze.ts   per-patient timeline: threshold crossings, OPTN wait-time gap
src/lib/batch.ts     CSV parsing + panel screening + export
src/components/      Checker, Chart (hand-built SVG), Letter, Clinic, Learn
```

- **Wait-time rule:** following OPTN, the qualifying date is the first lab where *any* race-neutral calculation (CKD-EPI 2021, or the same legacy equation with the race term removed) is ≤ 20. It's compared with the patient's stated wait-time start, or else the first race-adjusted result ≤ 20.
- **Reported-eGFR-only input:** both legacy equations fall steadily as creatinine rises, so Recount recovers creatinine by bisection and then recalculates.

### Sources
Levey et al., *Ann Intern Med* 2009 (CKD-EPI) · Levey et al., *Clin Chem* 2007 (MDRD) · Inker et al., *NEJM* 2021 (CKD-EPI 2021) · NKF-ASN Task Force 2021 · KDIGO CKD guidelines · OPTN race-neutral eGFR policies (2022–2023) · Sjoding et al., *NEJM* 2020 (pulse oximetry).

*Recount is educational and is not medical advice. Only a care team or transplant center can confirm a patient's eGFR history and wait time.*
