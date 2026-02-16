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
  import {
    formSchema,
    mainFormSchema,
    declarationsSchema,
    financialAndAdministrativeSchema,
    contractingPartySchema,
    primaryContactSchema,
    signatoryContactSchema,
    kycInfoSchema,
  } from "./Schema.js";
  import { z } from "zod";
  import { getLocalTimeZone } from "@internationalized/date";

  let { budget, categories } = $props();

  /** CalendarDate (from DatePicker) to Date for Zod validation. */
  function toDateForValidation(val) {
    if (val == null) return undefined;
    if (val instanceof Date) return val;
    if (typeof val?.toDate === "function") return val.toDate(getLocalTimeZone());
    return undefined;
  }

  /** Form data with executionRoadmap dates as Date so mainFormSchema.safeParse succeeds. */
  function formDataForValidation() {
    const er = formData.metaData.executionRoadmap;
    return {
      ...formData,
      metaData: {
        ...formData.metaData,
        executionRoadmap: {
          ...er,
          projectStartDate: toDateForValidation(er?.projectStartDate),
          projectEndDate: toDateForValidation(er?.projectEndDate),
        },
      },
    };
  }

  /** Form data with executionRoadmap dates as ISO 8601 strings for API request body. */
  function formDataToApiPayload(data) {
    const er = data.metaData?.executionRoadmap;
    if (!er) return data;
    const toIso = (val) => {
      if (val == null) return undefined;
      if (val instanceof Date) return val.toISOString();
      if (typeof val?.toDate === "function") return val.toDate(getLocalTimeZone()).toISOString();
      return undefined;
    };
    return {
      ...data,
      metaData: {
        ...data.metaData,
        executionRoadmap: {
          ...er,
          projectStartDate: toIso(er.projectStartDate),
          projectEndDate: toIso(er.projectEndDate),
        },
      },
    };
  }

  const initialLegalDeclarations = () => ({
    dataProtection: false,
    publicVisibilityConsent: false,
    authorizationEntity: false,
    authorizationAttestation: false,
    submitterName: "",
    submitterRole: "",
    submitterEmail: "",
  });

  const initialWorkPackage = () => ({
    title: "WP1 Example Work Package",
    scope: "Example scope: key activities and deliverables for testing the form.",
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
      { costCategory: "Development", description: "Backend API development", quantity: 1, unitPrice: 10000, total: 10000 },
    ],
  });

  let formData = $state({
    title: "",
    summary: "",
    status: "draft",
    metaData: {
      trackRecord: "",
      strategicFocusArea: "",
      keyPerformanceIndicators: [],
      executionRoadmap: {
        projectStartDate: undefined,
        projectEndDate: undefined,
        workPackages: [initialWorkPackage()],
      },
      financialAndAdministrative: {
        conversionRate: 0.25,
        intersectAdministrator: true,
        otherAdministrators: "",
        initiativeType: "",
        priorFunding: "",
        treasuryRepayment: undefined,
        treasuryRepaymentCondition: "",
        treasuryDonationHash: "",
        thirdPartyAssurers: "",
        supportingDocuments: [],
      },
      contractingParty: {
        legalEntityType: undefined,
        legalEntityName: "",
        legalEntityRegistrationNumber: "",
        legalEntityCountry: "",
        legalEntityAddress: "",
        countryOfResidence: "",
        govtIssuedIdNumber: "",
        fullResidentialAddress: "",
      },
      primaryContact: { name: "", title: "", email: "", socialMedia: "" },
      signatoryContact: { name: "", title: "", email: "", authorization: false },
      proposalType: "",
      kycInfo: { submitted: false, email: "" },
      legalDeclarations: initialLegalDeclarations(),
    },
  });

  let validationErrors = $state(null);
  let declarationsDialogOpen = $state(false);
  let declarationValidationErrors = $state(null);

  function handleSubmit(e) {
    e.preventDefault();
    const result = mainFormSchema.safeParse(formDataForValidation());
    if (result.success) {
      validationErrors = null;
      declarationsDialogOpen = true;
      declarationValidationErrors = null;
    } else {
      validationErrors = z.treeifyError(result.error);
    }
  }

  function confirmDeclarations() {
    const result = declarationsSchema.safeParse(formData.metaData.legalDeclarations);
    if (!result.success) {
      declarationValidationErrors = z.treeifyError(result.error);
      return;
    }
    declarationValidationErrors = null;
    declarationsDialogOpen = false;
    // TODO: submit to API with body = formDataToApiPayload(formData) (dates as ISO 8601)
  }

  // Snapshot so the effect re-runs when any part of formData changes (main fields only for revalidation)
  const formDataSnapshot = $derived(
    JSON.stringify({ title: formData.title, summary: formData.summary, status: formData.status, metaData: formData.metaData }),
  );

  // When validation has failed and the user changes form data, revalidate main form only
  $effect(() => {
    formDataSnapshot;
    if (untrack(() => !validationErrors)) return;
    const result = mainFormSchema.safeParse(formDataForValidation());
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
            bind:value={formData.metaData.trackRecord}
            formSchema={formSchema.shape.metaData}
            validationErrors={validationErrors?.properties?.metaData}
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
            id="strategicFocusArea"
            {categories}
            formSchema={formSchema.shape.metaData}
            validationErrors={validationErrors?.properties?.metaData}
            bind:value={formData.metaData.strategicFocusArea}
            hasKpis={(formData.metaData.keyPerformanceIndicators?.length ?? 0) > 0}
            onUpdate={(newCategory) => {
              formData.metaData.strategicFocusArea = newCategory;
              formData.metaData.keyPerformanceIndicators = [];
            }}
          />
          {#if formData.metaData.strategicFocusArea}
            {#key formData.metaData.strategicFocusArea}
              <FormFocusAreaKPI
                id="keyPerformanceIndicators"
                {categories}
                formSchema={formSchema.shape.metaData}
                validationErrors={validationErrors?.properties?.metaData}
                category={formData.metaData.strategicFocusArea}
                bind:value={formData.metaData.keyPerformanceIndicators}
                class="mt-4"
                onUpdate={(kpis) => {
                  formData.metaData.keyPerformanceIndicators = kpis;
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
            formSchema={formSchema.shape.metaData}
            validationErrors={validationErrors?.properties?.metaData}
            bind:value={formData.metaData.executionRoadmap}
          />

          <FormWorkPackages
            formSchema={formSchema.shape.metaData?.shape?.executionRoadmap?.shape?.workPackages != null ? { shape: { workPackages: formSchema.shape.metaData?.shape?.executionRoadmap?.shape?.workPackages } } : undefined}
            validationErrors={validationErrors?.properties?.metaData?.properties?.executionRoadmap}
            bind:value={formData.metaData.executionRoadmap.workPackages}
          />

          <FormFinancialSummary
            formSchema={formSchema.shape.metaData?.shape?.financialAndAdministrative}
            validationErrors={validationErrors?.properties?.metaData?.properties?.financialAndAdministrative}
            formData={formData.metaData}
          />
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
            formSchema={formSchema.shape.metaData}
            validationErrors={validationErrors?.properties?.metaData}
            sectionSchemas={{
              financialAndAdministrative: financialAndAdministrativeSchema,
              contractingParty: contractingPartySchema,
              primaryContact: primaryContactSchema,
              signatoryContact: signatoryContactSchema,
              kycInfo: kycInfoSchema,
            }}
            bind:value={formData.metaData}
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
