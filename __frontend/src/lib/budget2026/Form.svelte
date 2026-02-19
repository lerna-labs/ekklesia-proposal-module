<script>
  import { untrack } from "svelte";
  import { toast } from "svelte-sonner";
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
  import * as Select from "$lib/components/ui/select/index.js";
  import * as Switch from "$lib/components/ui/switch/index.js";
  import { getLocalTimeZone, parseDate } from "@internationalized/date";

  let {
    budget,
    categories,
    proposal = undefined,
    onSave = undefined,
    validationErrors = $bindable(null),
  } = $props();

  /** CalendarDate (from DatePicker) to Date for Zod validation. */
  function toDateForValidation(val) {
    if (val == null) return undefined;
    if (val instanceof Date) return val;
    if (typeof val?.toDate === "function")
      return val.toDate(getLocalTimeZone());
    return undefined;
  }

  /** Form data with executionRoadmap dates as Date for API payload (ISO strings). */
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
      if (typeof val?.toDate === "function")
        return val.toDate(getLocalTimeZone()).toISOString();
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
    title: "",
    scope: "",
    supportingDocuments: [],
    estimatedDuration: "",
    coreObjectives: [],
    expectedValue: "",
    metric: "",
    milestones: [],
    budgetBreakdown: [
      {
        costCategory: "Development",
        description: "",
        quantity: 1,
        unitPrice: 0,
        total: 0,
      },
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
        workPackages: [],
      },
      financialAndAdministrative: {
        conversionRate: 0,
        intersectAdministrator: true,
        otherAdministrators: "",
        initiativeType: "",
        priorFunding: "",
        treasuryRepayment: false,
        treasuryRepaymentCondition: "",
        treasuryDonationHash: "",
        thirdPartyAssurers: "",
        supportingDocuments: [],
      },
      contractingParty: {
        legalEntityType: "",
        legalEntityName: "",
        legalEntityRegistrationNumber: "",
        legalEntityCountry: "",
        legalEntityAddress: "",
        countryOfResidence: "",
        govtIssuedIdNumber: "",
        fullResidentialAddress: "",
      },
      primaryContact: { name: "", title: "", email: "", socialMedia: "" },
      signatoryContact: {
        name: "",
        title: "",
        email: "",
        authorization: false,
      },
      proposalType: "",
      kycInfo: { submitted: false, email: "", totalProposalsSubmitted: "" },
      legalDeclarations: initialLegalDeclarations(),
    },
  });

  let declarationsDialogOpen = $state(false);
  let declarationValidationErrors = $derived(
    validationErrors?.properties?.metaData?.properties?.legalDeclarations ??
      null,
  );
  let autoSaveEnabled = $state(false);

  const AUTO_SAVE_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

  $effect(() => {
    if (!autoSaveEnabled || formData.status !== "draft" || !onSave) return;
    const id = setInterval(() => {
      const payload = formDataToApiPayload({ ...formData, status: "draft" });
      Promise.resolve(onSave(payload)).catch(() => {});
    }, AUTO_SAVE_INTERVAL_MS);
    return () => clearInterval(id);
  });

  /** Prefill formData from proposal once when editing */
  let prefilled = false;
  $effect(() => {
    const p = proposal;
    if (!p || prefilled) return;
    prefilled = true;
    formData.title = p.title ?? "";
    formData.summary = p.summary ?? "";
    formData.status = p.status ?? "draft";
    if (p.metaData) {
      Object.assign(formData.metaData, p.metaData);
      const er = p.metaData.executionRoadmap;
      if (er) {
        if (typeof er.projectStartDate === "string") {
          try {
            formData.metaData.executionRoadmap.projectStartDate = parseDate(
              er.projectStartDate.slice(0, 10),
            );
          } catch {
            formData.metaData.executionRoadmap.projectStartDate = undefined;
          }
        }
        if (typeof er.projectEndDate === "string") {
          try {
            formData.metaData.executionRoadmap.projectEndDate = parseDate(
              er.projectEndDate.slice(0, 10),
            );
          } catch {
            formData.metaData.executionRoadmap.projectEndDate = undefined;
          }
        }
      }
    }
  });

  /** Save Draft: no frontend validation; backend validates. On 400 parent sets validationErrors from body.errors. */
  function saveDraft() {
    if (onSave) {
      const payload = formDataToApiPayload({ ...formData, status: "draft" });
      Promise.resolve(onSave(payload)).catch(() => {});
    }
  }

  /** Submit (go live): open declarations dialog; no frontend validation. */
  function handleSubmit(e) {
    e.preventDefault();
    validationErrors = null;
    declarationsDialogOpen = true;
  }

  /** After user confirms declarations: send with status "live". Backend validates; on 400 parent sets validationErrors. */
  function confirmDeclarations() {
    declarationsDialogOpen = false;
    if (onSave) {
      const payload = formDataToApiPayload({ ...formData, status: "live" });
      Promise.resolve(onSave(payload)).catch(() => {});
    }
  }

  // Snapshot so the effect re-runs when any part of formData changes (main fields only for revalidation)
  const formDataSnapshot = $derived(
    JSON.stringify({
      title: formData.title,
      summary: formData.summary,
      status: formData.status,
      metaData: formData.metaData,
    }),
  );

  // Clear backend-sourced validation errors when user edits the form (not when errors are first set)
  let prevFormDataSnapshot = $state(undefined);
  $effect(() => {
    const snap = formDataSnapshot;
    const hadErrors = untrack(() => validationErrors);
    if (
      prevFormDataSnapshot !== undefined &&
      snap !== prevFormDataSnapshot &&
      hadErrors
    ) {
      validationErrors = null;
    }
    prevFormDataSnapshot = snap;
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
            label="Proposal Title"
            description="The official name of your project as it will appear in governance voting."
            placeholder="Enter Title Here"
            required
            maxLength={100}
            {validationErrors}
          />
          <Textarea
            id="summary"
            bind:value={formData.summary}
            label="Executive Summary"
            description="A high-level overview of the problem, solution, and impact. This is the first thing voters read."
            placeholder="Enter Summary Here"
            required
            maxLength={2000}
            {validationErrors}
          />
          <Textarea
            id="trackRecord"
            bind:value={formData.metaData.trackRecord}
            label="Track Record"
            description="Proven history of delivery. Mention previous successful proposals, mainnet deployments, or relevant enterprise experience."
            placeholder="Enter Track Record Here"
            maxLength={650}
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
            validationErrors={validationErrors?.properties?.metaData}
            bind:value={formData.metaData.strategicFocusArea}
            hasKpis={(formData.metaData.keyPerformanceIndicators?.length ?? 0) >
              0}
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
            validationErrors={validationErrors?.properties?.metaData}
            bind:value={formData.metaData.executionRoadmap}
          />

          <FormWorkPackages
            validationErrors={validationErrors?.properties?.metaData?.properties
              ?.executionRoadmap}
            bind:value={formData.metaData.executionRoadmap.workPackages}
          />

          <FormFinancialSummary
            validationErrors={validationErrors?.properties?.metaData?.properties
              ?.financialAndAdministrative}
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
            validationErrors={validationErrors?.properties?.metaData}
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
    <div class="max-w-4xl mx-auto flex flex-wrap items-center gap-4">
      <Button type="button" class="cursor-pointer" onclick={saveDraft}>
        Save Draft
      </Button>
      <Button type="submit" class="cursor-pointer">Submit</Button>
      {#if formData.status === "draft" && onSave}
        <label
          class="flex items-center gap-2 cursor-pointer select-none text-sm"
        >
          <Switch.Root bind:checked={autoSaveEnabled} />
          <span>Auto-save every 5 min</span>
        </label>
      {/if}
    </div>
  </section>
</form>

<Dialog.Root bind:open={declarationsDialogOpen}>
  <Dialog.Content class="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
    <Dialog.Header>
      <Dialog.Title>Legal declarations</Dialog.Title>
      <Dialog.Description>
        Confirm the legal declarations below before submitting your proposal.
      </Dialog.Description>
    </Dialog.Header>
    <div class="flex-1 overflow-y-auto min-h-0">
      <FormLegalDeclarations
        validationErrors={declarationValidationErrors}
        bind:value={formData.metaData.legalDeclarations}
      />
    </div>
    <Dialog.Footer class="shrink-0 gap-2">
      <Dialog.Close class={buttonVariants({ variant: "outline" })}>
        Cancel
      </Dialog.Close>
      <Button
        type="button"
        class="cursor-pointer"
        onclick={confirmDeclarations}
      >
        Confirm and Submit
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
