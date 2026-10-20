export function Learn() {
  return (
    <div className="learn">
      <section className="card prose">
        <h2>A multiplier built into the math</h2>
        <p>
          For more than 20 years, the standard formulas that turn a creatinine blood test into an eGFR score (how well your
          kidneys filter) added extra points for any patient recorded as Black: <b>+15.9%</b> in CKD-EPI 2009 and{' '}
          <b>+21.2%</b> in MDRD. The adjustment rested on an old assumption about muscle mass, not on anything measured in
          the patient in front of the doctor.
        </p>
        <p>
          A higher eGFR looks like healthier kidneys. So the same blood test could keep a Black patient above the line for
          a CKD diagnosis, a specialist referral or the transplant wait list, while a white patient with the identical result
          crossed it. Black Americans are already more than three times as likely as white Americans to develop kidney
          failure.
        </p>
      </section>

      <section className="card prose">
        <h2>What changed</h2>
        <ol className="timeline">
          <li>
            <b>2021</b> The National Kidney Foundation and the American Society of Nephrology recommend the race-free CKD-EPI
            2021 equation.
          </li>
          <li>
            <b>2022</b> The OPTN, which runs the US transplant system, bans race-based eGFR for wait-listing.
          </li>
          <li>
            <b>2023</b> Transplant programs must find Black candidates whose wait time was cut short and give it back. OPTN
            later reported more than 14,000 candidates had their wait time changed.
          </li>
        </ol>
        <p>
          But the fix depends on someone finding you. Patients who moved, switched clinics, aren't listed yet, or only have
          old paper results can slip through. People who were never referred have no wait time to restore at all. Their
          delay happened earlier, at diagnosis or referral.
        </p>
      </section>

      <section className="card prose">
        <h2>Why we built Recount</h2>
        <p>
          <b>Patients</b> can check their own history in a minute and get a letter that cites the policy. <b>Clinics and
          community health workers</b> can screen a whole panel at once and find who to call first. Everything runs in the
          browser: health data never leaves the device, there are no accounts, and no AI model guesses at anyone's
          numbers. Every result is a published equation you can check by hand.
        </p>
        <h3>The same pattern is everywhere</h3>
        <ul>
          <li>
            <b>Lung function tests.</b> Race-specific "normal" values for spirometry. The American Thoracic Society
            recommended race-neutral reference equations in 2023.
          </li>
          <li>
            <b>VBAC calculator.</b> It predicted lower chances of a vaginal birth after a C-section for Black and Hispanic
            mothers. Race was removed in 2021.
          </li>
          <li>
            <b>Pulse oximeters.</b> They miss low oxygen levels about three times as often in Black patients (NEJM, 2020). The
            FDA has since proposed testing across skin tones.
          </li>
        </ul>
        <p className="muted small">
          Equations: Levey et al., <i>Ann Intern Med</i> 2009 (CKD-EPI); Levey et al., <i>Clin Chem</i> 2007 (MDRD); Inker et
          al., <i>NEJM</i> 2021 (CKD-EPI 2021). Thresholds: KDIGO 2012 and 2024 CKD guidelines; OPTN Policy 3.7 and 8.
        </p>
      </section>
    </div>
  )
}
