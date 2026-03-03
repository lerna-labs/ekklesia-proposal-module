<script>
  /** @see __frontend/docs/budget2026/form-budget-summary.md Version: 1.0.0 */
  import RadioGroup from "$lib/components/form/RadioGroup.svelte";
  import Textarea from "$lib/components/form/Textarea.svelte";
  let {
    formData = $bindable(),
    vote,
    categories,
    proposal,
    validationErrors,
  } = $props();

  const metaErrors = $derived(
    validationErrors?.properties?.metaData?.properties ?? {},
  );
  const treasuryRepaymentErrors = $derived({
    properties: { treasuryRepayment: metaErrors.treasuryRepayment },
  });
  const treasuryRepaymentCircumstancesErrors = $derived({
    properties: {
      treasuryRepaymentCircumstances: metaErrors.treasuryRepaymentCircumstances,
    },
  });
  const priorFundingErrors = $derived({
    properties: { priorFunding: metaErrors.priorFunding },
  });
</script>

<h3>
  Will any portion of the requested funds be returned to the Cardano Treasury?
</h3>

<p>
  Select whether your proposal includes any form of treasury repayment (for
  example, unused funds, profit-sharing, or conditional returns).
</p>

<RadioGroup
  id="treasuryRepayment"
  bind:value={formData.metaData.treasuryRepayment}
  label="Treasury Repayment"
  description="Select whether your proposal includes any form of treasury repayment (for example, unused funds, profit-sharing, or conditional returns)."
  required
  options={[
    { value: "Yes", label: "Yes" },
    { value: "No", label: "No" },
  ]}
  validationErrors={treasuryRepaymentErrors}
  class="mb-8"
/>

<h3>If yes, under what circumstances would a repayment occur?</h3>

<p>
  Describe the specific conditions or triggers that would result in funds being
  returned to the Treasury (e.g. surplus funds, revenue thresholds, loan,
  project cancellation).
</p>

<Textarea
  id="treasuryRepaymentCircumstances"
  bind:value={formData.metaData.treasuryRepaymentCircumstances}
  label="Repayment Circumstances"
  description="This helps DReps understand downside protection and fiscal responsibility."
  placeholder="Enter Explanation"
  maxLength={10000}
  validationErrors={treasuryRepaymentCircumstancesErrors}
  class="mb-8"
/>

<h3>
  Have you previously received funding from Cardano or related ecosystem
  programs?
</h3>

<p>
  List any prior funding received from Catalyst, Treasury withdrawals, Intersect
  programs, or other Cardano ecosystem grants. If not applicable, you may enter
  “N/A”.
</p>

<Textarea
  id="priorFunding"
  bind:value={formData.metaData.priorFunding}
  label="Prior Funding"
  description="List any funds previously received from Catalyst, Treasury, or other ecosystem grants."
  placeholder="Enter Details or N/A"
  required
  maxLength={10000}
  validationErrors={priorFundingErrors}
  class="mb-8"
/>
