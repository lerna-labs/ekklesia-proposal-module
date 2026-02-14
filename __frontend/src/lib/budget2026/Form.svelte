<script>
  import { untrack } from "svelte";
  import Input from "$lib/form/Input.svelte";
  import Textarea from "$lib/form/Textarea.svelte";
  import { Button, buttonVariants } from "$lib/components/ui/button/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import CategorySelector from "./FormFocusArea.svelte";
  import KPISelector from "./FormFocusAreaKPI.svelte";
  import FormTimeline from "./FormTimeline.svelte";
  import FormLegalDeclarations from "./FormLegalDeclarations.svelte";
  import FormAdministrative from "./FormAdministrative.svelte";
  import FormWorkPackages from "./FormWorkPackages.svelte";
  import FormFinancialSummary from "./FormFinancialSummary.svelte";
  import { formSchema, mainFormSchema, declarationsSchema } from "./Schema.js";
  import { z } from "zod";
  let { budget, categories } = $props();

  const initialLegalDeclarations = () => ({
    dataProcessingConsent: false,
    publicVisibilityConsent: false,
    authorizedToSubmit: false,
    authorizedToAttest: false,
    submitterName: "",
    submitterRole: "",
    submitterEmail: "",
  });

  let formData = $state({
    title: "",
    summary: "",
    trackRecord: "",
    category: "",
    kpis: [],
    timeline: {
      startDate: undefined,
      endDate: undefined,
    },
    adaUsdConversionRate: 0,
    workPackages: [
      {
        name: "WP1 Example Work Package",
        scopeOfWork:
          "Example scope: key activities and deliverables for testing the form.",
        supportingDocumentationLinks: [],
        coreObjectives: ["Validate work package UI and budget flow"],
        expectedValueRoi: "Faster testing and demo of the budget module.",
        metric: "Time to complete a full work package entry.",
        milestones: [
          {
            milestoneName: "Milestone 1 – Design",
            deliverables: "Design doc and mockups",
            acceptanceCriteria: "Approved by stakeholder",
            duration: "2 weeks",
          },
        ],
        budgetRows: [
          {
            costCategory: "Development",
            itemDescription: "Backend API development",
            qty: 1,
            unitCostAda: 10000,
            totalAda: 10000,
          },
        ],
      },
    ],
    administrative: {
      intersectAdministrator: true,
      otherAdministrators: "",
      contractingParty: "",
      legalEntityName: "",
      registrationNumber: "",
      countryOfIncorporation: "",
      registeredAddress: "",
      countryOfResidence: "",
      govtIssuedIdNumber: "",
      fullResidentialAddress: "",
      primaryContactFullName: "",
      primaryContactEmail: "",
      xHandle: "",
      signatoryName: "",
      signatoryTitle: "",
      signatoryEmail: "",
      signatoryAuthorization: false,
      totalProposalsSubmitted: "",
      kycKybSubmitted: undefined,
      kycContactEmail: "",
      treasuryRepayment: undefined,
      repaymentCircumstances: "",
      initiativeType: "",
      typeOfProposal: "",
      priorFunding: "",
      treasuryDonationVerificationHash: "",
      thirdPartyAssurers: "",
      supportingInfoLinks: [],
    },
    legalDeclarations: initialLegalDeclarations(),
  });

  let validationErrors = $state(null);
  let declarationsDialogOpen = $state(false);
  let declarationValidationErrors = $state(null);

  function handleSubmit(e) {
    e.preventDefault();
    const result = mainFormSchema.safeParse(formData);
    if (result.success) {
      validationErrors = null;
      declarationsDialogOpen = true;
      declarationValidationErrors = null;
    } else {
      validationErrors = z.treeifyError(result.error);
    }
  }

  function confirmDeclarations() {
    const result = declarationsSchema.safeParse(formData.legalDeclarations);
    if (!result.success) {
      declarationValidationErrors = z.treeifyError(result.error);
      return;
    }
    declarationValidationErrors = null;
    declarationsDialogOpen = false;
    // TODO: submit to API with full formData (including legalDeclarations)
  }

  // Snapshot so the effect re-runs when any part of formData changes (main fields only for revalidation)
  const formDataSnapshot = $derived(
    JSON.stringify({
      title: formData.title,
      summary: formData.summary,
      trackRecord: formData.trackRecord,
      category: formData.category,
      kpis: formData.kpis,
      timeline: formData.timeline,
      workPackages: formData.workPackages,
      adaUsdConversionRate: formData.adaUsdConversionRate,
      administrative: formData.administrative,
    }),
  );

  // When validation has failed and the user changes form data, revalidate main form only
  $effect(() => {
    formDataSnapshot;
    if (untrack(() => !validationErrors)) return;
    const result = mainFormSchema.safeParse(formData);
    if (result.success) {
      validationErrors = null;
    } else {
      validationErrors = z.treeifyError(result.error);
    }
  });
</script>

<form onsubmit={handleSubmit} class="flex flex-col">
  <section class="w-full bg-muted-foreground/10 py-10" id="project-definition">
    <div class="max-w-4xl mx-auto space-y-4">
      <h2 class="text-2xl font-medium mb-4">1. Project Definition</h2>

      <Input
        id="title"
        bind:value={formData.title}
        {formSchema}
        {validationErrors}
      />

      <Textarea
        id="summary"
        bind:value={formData.summary}
        {formSchema}
        {validationErrors}
      />

      <Textarea
        id="trackRecord"
        bind:value={formData.trackRecord}
        {formSchema}
        {validationErrors}
      />
    </div>
  </section>

  <section
    class="w-full bg-muted-foreground/15 py-10"
    id="strategic-roadmap-alignment"
  >
    <div class="max-w-4xl mx-auto space-y-4">
      <h2 class="text-2xl font-medium">2. Strategic Roadmap Alignment</h2>

      <CategorySelector
        id="category"
        {categories}
        {formSchema}
        {validationErrors}
        bind:value={formData.category}
        onUpdate={(category) => {
          // reset kpis
          formData.kpis = [];
        }}
      />

      {#if formData.category}
        <KPISelector
          id="kpis"
          {categories}
          {formSchema}
          {validationErrors}
          category={formData.category}
          class="mt-4"
          onUpdate={(kpis) => {
            formData.kpis = kpis;
          }}
        />
      {/if}
    </div>
  </section>

  <section class="w-full bg-muted-foreground/5 py-10" id="execution-roadmap">
    <div class="max-w-4xl mx-auto space-y-4">
      <h2 class="text-2xl font-medium">3. Execution Roadmap</h2>

      <FormTimeline
        {formSchema}
        {validationErrors}
        bind:value={formData.timeline}
      />

      <FormWorkPackages
        {formSchema}
        {validationErrors}
        bind:value={formData.workPackages}
      />

      <FormFinancialSummary {formSchema} {validationErrors} {formData} />
    </div>
  </section>

  <section
    class="w-full bg-muted-foreground/15 py-10"
    id="administrative-verification"
  >
    <div class="max-w-4xl mx-auto">
      <h2 class="text-2xl font-medium">4. Administrative & Verification</h2>
      <FormAdministrative
        formSchema={formSchema.shape.administrative}
        validationErrors={validationErrors?.properties?.administrative}
        bind:value={formData.administrative}
      />
    </div>
  </section>

  <section
    class="w-full bg-muted-foreground/30 py-10"
    id="proposal-submission-legal-declarations"
  >
    <div class="max-w-4xl mx-auto">
      <h2 class="text-2xl font-medium">
        5. Proposal Submission Legal Declarations
      </h2>
      <p class="text-sm text-muted-foreground mt-2">
        You will be asked to confirm legal declarations when you submit.
      </p>
    </div>
  </section>

  <section
    class="bg-(--mbo-orange) w-full sticky bottom-0 shadow-lg z-10 shadow-black/50 py-6"
    id="controls"
  >
    <div class="max-w-4xl mx-auto">
      <Button type="submit" class="cursor-pointer">Save Draft</Button>
    </div>
  </section>

  <Dialog.Root bind:open={declarationsDialogOpen}>
    <Dialog.Content class="sm:max-w-2xl max-h-[90vh] flex flex-col">
      <Dialog.Header>
        <Dialog.Title>Proposal Submission Legal Declarations</Dialog.Title>
      </Dialog.Header>
      <FormLegalDeclarations
        bind:value={formData.legalDeclarations}
        formSchema={declarationsSchema}
        validationErrors={declarationValidationErrors}
      />
      <Dialog.Footer class="flex gap-2 shrink-0">
        <Dialog.Close
          class={buttonVariants({ variant: "outline" }) + " cursor-pointer"}
        >
          Cancel
        </Dialog.Close>
        <Button
          type="button"
          class="cursor-pointer"
          onclick={confirmDeclarations}
        >
          Confirm and submit
        </Button>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Root>
</form>
