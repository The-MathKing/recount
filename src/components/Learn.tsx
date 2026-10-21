export function Learn() {
  return (
    <article className="learn">
      <figure className="formula">
        <figcaption className="label">CKD-EPI 2009, the standard eGFR formula until 2021</figcaption>
        <p className="mono" aria-label="eGFR equals 141 times creatinine terms times 0.993 to the power of age, times 1.018 if female, times 1.159 if Black">
          eGFR = 141 × min(S<sub>cr</sub>/κ, 1)<sup>α</sup> × max(S<sub>cr</sub>/κ, 1)<sup>−1.209</sup> × 0.993<sup>age</sup> ×
          1.018 <span className="cond">[if female]</span> <span className="race">× 1.159 <span className="cond">[if Black]</span></span>
        </p>
      </figure>

      <section className="learn-row">
        <h2>A multiplier in the math</h2>
        <div className="prose">
          <p>
            eGFR is the number doctors use to judge how well your kidneys filter. For more than 20 years, the standard
            formulas added extra points for any patient recorded as Black: <b>15.9%</b> in CKD-EPI 2009 and <b>21.2%</b> in
            MDRD. The adjustment came from an old assumption about muscle mass, not from anything measured in the patient.
          </p>
          <p>
            A higher eGFR looks like healthier kidneys. The same blood test could keep a Black patient above the line for a
            CKD diagnosis, a specialist referral or the transplant wait list while a white patient with the identical result
            crossed it. Black Americans are already more than three times as likely as white Americans to develop kidney
            failure.
          </p>
        </div>
      </section>

      <section className="learn-row">
        <h2>What changed</h2>
        <div className="prose">
          <dl className="years">
            <div>
              <dt className="mono">2021</dt>
              <dd>
                The National Kidney Foundation and the American Society of Nephrology recommend the race-free CKD-EPI 2021
                formula.
              </dd>
            </div>
            <div>
              <dt className="mono">2022</dt>
              <dd>The OPTN, which runs the US transplant system, bans race-based eGFR for wait-listing.</dd>
            </div>
            <div>
              <dt className="mono">2023</dt>
              <dd>
                Kidney transplant programs must review their registered Black candidates and request a wait-time change for
                anyone whose time was cut short. By early 2024, more than 14,000 candidates had their wait time changed.
              </dd>
            </div>
          </dl>
          <p>
            The fix depends on someone finding you. Patients who moved, switched clinics, aren't listed yet, or only have old
            paper results can be missed. People who were never referred have no wait time to restore at all: their delay
            happened earlier, at diagnosis or referral.
          </p>
        </div>
      </section>

      <section className="learn-row">
        <h2>Why Recount</h2>
        <div className="prose">
          <p>
            <b>Patients</b> can check their own history in a minute and get a letter that cites the policy. <b>Clinics and
            community health workers</b> can screen a whole panel and find who to call first. Everything runs in the browser.
            Health data never leaves the device and there are no accounts.
          </p>
          <p>
            <b>AI reads; formulas decide.</b> Most old results are on paper, so Recount uses an on-device AI model to read a
            photo of a lab report. The photo is never uploaded. The AI never computes a medical number: every eGFR is
            recalculated from creatinine with the published formulas. Where a report prints both values, the formula checks
            the AI's reading and flags any mismatch. A biased formula caused this harm, so we kept AI out of the math and made
            every result something you can check by hand.
          </p>
        </div>
      </section>

      <section className="learn-row">
        <h2>The same pattern elsewhere</h2>
        <div className="prose">
          <dl className="years">
            <div>
              <dt>Lung function</dt>
              <dd>
                Spirometry used race-specific "normal" values. The American Thoracic Society recommended race-neutral
                reference equations in 2023.
              </dd>
            </div>
            <div>
              <dt>VBAC calculator</dt>
              <dd>
                It predicted lower odds of a vaginal birth after a C-section for Black and Hispanic mothers. Race was removed
                in 2021.
              </dd>
            </div>
            <div>
              <dt>Pulse oximeters</dt>
              <dd>
                They miss low oxygen about three times as often in Black patients (NEJM, 2020). The FDA has since proposed
                testing across skin tones.
              </dd>
            </div>
          </dl>
          <p className="fine">
            Formulas: Levey et al., <i>Ann Intern Med</i> 2009 (CKD-EPI); Levey et al., <i>Clin Chem</i> 2007 (MDRD); Inker et
            al., <i>NEJM</i> 2021 (CKD-EPI 2021). Thresholds: KDIGO CKD guidelines; OPTN policies on race-neutral eGFR.
          </p>
        </div>
      </section>
    </article>
  )
}
