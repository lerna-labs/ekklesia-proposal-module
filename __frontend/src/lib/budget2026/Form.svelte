<script>
  import { untrack } from "svelte";
  import Input from "$lib/form/Input.svelte";
  import Textarea from "$lib/form/Textarea.svelte";
  import { Button, buttonVariants } from "$lib/components/ui/button/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import FormFocusArea from "./FormFocusArea.svelte";
  import FormFocusAreaKPI from "./FormFocusAreaKPI.svelte";
  import FormTimeline from "./FormTimeline.svelte";
  import FormLegalDeclarations from "./FormLegalDeclarations.svelte";
  import FormAdministrative from "./FormAdministrative.svelte";
  import FormWorkPackages from "./FormWorkPackages.svelte";
  import FormFinancialSummary from "./FormFinancialSummary.svelte";
  import * as Card from "$lib/components/ui/card/index.js";
  import { formSchema, mainFormSchema, declarationsSchema } from "./Schema.js";
  import { z } from "zod";
  let { budget, categories } = $props();

  const initialLegalDeclarations = () => ({
    dataProtection: false,
    publicVisibilityConsent: false,
    authorizationEntity: false,
    authorizationAttestation: false,
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
        title: "WP1 Example Work Package",
        scope:
          "Example scope: key activities and deliverables for testing the form.",
        supportingDocuments: [],
        estimatedDuration: "",
        coreObjectives: ["Validate work package UI and budget flow"],
        expectedValue: "Faster testing and demo of the budget module.",
        metric: "Time to complete a full work package entry.",
        milestones: [
          {
            milestoneName: "Milestone 1 – Design",
            deliverables: "Design doc and mockups",
            acceptanceCriteria: "Approved by stakeholder",
            duration: "2 weeks",
          },
        ],
        budgetBreakdown: [
          {
            costCategory: "Development",
            description: "Backend API development",
            quantity: 1,
            unitPrice: 10000,
            total: 10000,
          },
        ],
      },
    ],
    administrative: {
      intersectAdministrator: true,
      otherAdministrators: "",
      legalEntityType: "",
      legalEntityName: "",
      legalEntityRegistrationNumber: "",
      legalEntityCountry: "",
      legalEntityAddress: "",
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
      treasuryRepaymentCondition: "",
      initiativeType: "",
      proposalType: "",
      priorFunding: "",
      treasuryDonationHash: "",
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

  // Clear declaration errors when the dialog closes (e.g. Cancel) so they don't persist on reopen
  $effect(() => {
    if (!declarationsDialogOpen) declarationValidationErrors = null;
  });
</script>

<form onsubmit={handleSubmit} class="flex flex-col">
  <section class="w-full bg-muted-foreground/5 py-10" id="project-definition">
    <div class="max-w-4xl mx-auto space-y-4">
      <Card.Root>
        <Card.Header>
          <Card.Title class="text-2xl font-medium">
            1. Project Definition
          </Card.Title>
        </Card.Header>
        <Card.Content class="space-y-4">
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
        </Card.Content>
      </Card.Root>
    </div>
  </section>

  <section
    class="w-full bg-muted-foreground/10 py-10"
    id="strategic-roadmap-alignment"
  >
    <div class="max-w-4xl mx-auto space-y-4">
      <Card.Root>
        <Card.Header>
          <Card.Title class="text-2xl font-medium">
            2. Strategic Roadmap Alignment
          </Card.Title>
        </Card.Header>
        <Card.Content class="space-y-4">
          <FormFocusArea
            id="category"
            {categories}
            {formSchema}
            {validationErrors}
            bind:value={formData.category}
            hasKpis={(formData.kpis?.length ?? 0) > 0}
            onUpdate={(newCategory) => {
              formData.category = newCategory;
              formData.kpis = [];
            }}
          />
          {#if formData.category}
            {#key formData.category}
              <FormFocusAreaKPI
                id="kpis"
                {categories}
                {formSchema}
                {validationErrors}
                category={formData.category}
                bind:value={formData.kpis}
                class="mt-4"
                onUpdate={(kpis) => {
                  formData.kpis = kpis;
                }}
              />
            {/key}
          {/if}
        </Card.Content>
      </Card.Root>
    </div>
  </section>

  <section class="w-full bg-muted-foreground/15 py-10" id="execution-roadmap">
    <div class="max-w-4xl mx-auto space-y-4">
      <Card.Root>
        <Card.Header>
          <Card.Title class="text-2xl font-medium">
            3. Execution Roadmap
          </Card.Title>
        </Card.Header>
        <Card.Content class="space-y-4">
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
        </Card.Content>
      </Card.Root>
    </div>
  </section>

  <section
    class="w-full bg-muted-foreground/20 py-10"
    id="administrative-verification"
  >
    <div class="max-w-4xl mx-auto space-y-4">
      <Card.Root>
        <Card.Header>
          <Card.Title class="text-2xl font-medium">
            4. Administrative & Verification
          </Card.Title>
        </Card.Header>
        <Card.Content>
          <FormAdministrative
            formSchema={formSchema.shape.administrative}
            validationErrors={validationErrors?.properties?.administrative}
            bind:value={formData.administrative}
          />
        </Card.Content>
      </Card.Root>
    </div>
  </section>

  <section
    class="w-full bg-muted-foreground/25 py-10"
    id="proposal-submission-legal-declarations"
  >
    <div class="max-w-4xl mx-auto space-y-4">
      <Card.Root>
        <Card.Header>
          <Card.Title class="text-2xl font-medium">
            5. Proposal Submission Legal Declarations
          </Card.Title>
        </Card.Header>
        <Card.Content>
          <p class="text-sm text-muted-foreground mt-2">
            You will be asked to confirm legal declarations when you submit.
          </p>
        </Card.Content>
      </Card.Root>
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
</form>
