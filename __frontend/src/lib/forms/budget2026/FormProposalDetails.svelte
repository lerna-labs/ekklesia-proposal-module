<script>
  import * as Field from "$lib/components/ui/field/index.js";
  import InputNumber from "$lib/components/form/InputNumber.svelte";
  import FormWorkPackages from "./FormWorkPackages.svelte";
  let { formData = $bindable(), vote, proposal, validationErrors } = $props();

  const metaErrors = $derived(
    validationErrors?.properties?.metaData?.properties ?? {},
  );
  const conversionRateErrors = $derived({
    properties: {
      conversionRate: metaErrors.proposalDetails?.properties?.conversionRate,
    },
  });
  /** Section-level error (e.g. "At least one work package is required"); outline matches FormStrategyFramework (border-destructive ring-destructive/20). */
  const hasWorkPackagesSectionError = $derived(
    (metaErrors.proposalDetails?.properties?.workPackages?.errors?.length ??
      0) > 0,
  );
  const workPackagesSectionError = $derived(
    metaErrors.proposalDetails?.properties?.workPackages?.errors?.[0],
  );
  const sectionOutlineClass = $derived(
    hasWorkPackagesSectionError
      ? "rounded-md border border-destructive ring-[3px] ring-destructive/20 p-3"
      : "",
  );
</script>

<h3>
  What ADA to USD conversion rate are you using for your overall proposal? *
</h3>

<p class="text-muted-foreground">
  Please specify the rate used for all USD estimations in this proposal. This
  helps DReps understand the approximate dollar value of your budget.
</p>

<InputNumber
  id="conversionRate"
  prefix="$"
  suffix="/ ADA"
  bind:value={formData.metaData.proposalDetails.conversionRate}
  placeholder="0.25"
  decimalComma={false}
  min="0"
  step="0.01"
  inputmode="decimal"
  validationErrors={conversionRateErrors}
  label="ADA/USD conversion rate"
  required
  description="Specify the rate used for all USD estimations in this proposal."
  helperText="*If Intersect is selected as the administrator, this rate is indicative only and does not mean the contract will be set in that dollar value; the contract will be based in ADA, and vendors are responsible for managing market conditions."
/>

<section>
  <div
    class={sectionOutlineClass}
    aria-invalid={hasWorkPackagesSectionError || undefined}
  >
    <h3>How can your proposal be broken down in work packages?</h3>
    <p class="text-muted-foreground">
      One proposal may include one or multiple work packages or work streams.
      Please provide details for each one below.
    </p>

    <FormWorkPackages
      bind:value={formData.metaData.proposalDetails.workPackages}
      conversionRate={formData.metaData.proposalDetails.conversionRate}
      validationErrors={validationErrors?.properties?.metaData?.properties
        ?.proposalDetails}
      hideSectionLevelError
    />
  </div>
  {#if workPackagesSectionError}
    <Field.Error class="text-xs mt-1.5">{workPackagesSectionError}</Field.Error>
  {/if}
</section>
