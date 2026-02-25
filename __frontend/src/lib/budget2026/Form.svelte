<script>
  import { toast } from "svelte-sonner";
  import { beforeNavigate, goto } from "$app/navigation";
  import Input from "$lib/form/Input.svelte";
  import Textarea from "$lib/form/Textarea.svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import FormStrategyFramework from "./FormStrategyFramework.svelte";
  import FormTimeline from "./FormTimeline.svelte";
  import FormLegalDeclarations from "./FormLegalDeclarations.svelte";
  import FormAdministrative from "./FormAdministrative.svelte";
  import FormWorkPackages from "./FormWorkPackages.svelte";
  import FormFinancialSummary from "./FormFinancialSummary.svelte";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import * as Switch from "$lib/components/ui/switch/index.js";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import { getLocalTimeZone, parseDate } from "@internationalized/date";

  let {
    vote,
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
      estimatedDuration: "",
      trackRecord: "",
      strategyFramework: { pillars: [], pillarRationale: "", kpiAlignment: "" },
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

  /** Snapshot of form for dirty check (dates normalized to ISO). */
  const formDataSnapshot = $derived(
    JSON.stringify(formDataToApiPayload({ ...formData })),
  );
  let initialSnapshot = $state(null);
  $effect(() => {
    if (initialSnapshot !== null) return;
    if (proposal && !prefilled) return;
    initialSnapshot = formDataSnapshot;
  });
  const isDirty = $derived(
    initialSnapshot !== null && formDataSnapshot !== initialSnapshot,
  );
  const dirtyRef = { current: false };
  $effect(() => {
    dirtyRef.current = isDirty;
  });

  /** Leave-confirm: intercept in-app navigation when dirty; show dialog and optionally goto. */
  let leaveConfirmOpen = $state(false);
  let pendingNavigateUrl = $state(null);
  beforeNavigate(({ to, cancel }) => {
    if (!to || !dirtyRef.current) return;
    cancel();
    pendingNavigateUrl = to.url.href;
    leaveConfirmOpen = true;
  });

  $effect(() => {
    if (!isDirty) return;
    const handler = (e) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  });

  function confirmLeave() {
    const url = pendingNavigateUrl;
    leaveConfirmOpen = false;
    pendingNavigateUrl = null;
    if (!url) return;
    // Clear dirty so beforeNavigate doesn't cancel this goto
    dirtyRef.current = false;
    initialSnapshot = formDataSnapshot;
    goto(url);
  }

  function stayOnPage() {
    leaveConfirmOpen = false;
    pendingNavigateUrl = null;
  }

  /** Save Draft: no frontend validation; backend validates. On 400 parent sets validationErrors from body.errors. */
  function saveDraft() {
    if (onSave) {
      const payload = formDataToApiPayload({ ...formData, status: "draft" });
      Promise.resolve(onSave(payload))
        .then(() => {
          initialSnapshot = formDataSnapshot;
        })
        .catch(() => {});
    }
  }

  /** Submit (go live): no frontend validation. */
  function handleSubmit(e) {
    e.preventDefault();
    validationErrors = null;
    if (onSave) {
      const payload = formDataToApiPayload({ ...formData, status: "live" });
      Promise.resolve(onSave(payload))
        .then(() => {
          initialSnapshot = formDataSnapshot;
        })
        .catch(() => {});
    }
  }

  // Backend validation errors persist until the next submit (parent sets validationErrors from API response)
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

          <h2 class="text-lg font-medium mt-8">
            Please describe your whole proposal at high level
          </h2>

          <p>
            Provide an high-level overview of the problem, proposed solution and
            value your overall proposal is providing with reference to Cardano's
            vision. Remember this is the first thing DReps will see.
          </p>

          <p>
            Current Drep supported Cardano's Vision: "Cardano is the most
            secure, reliable and censorship-resistant blockchain for mission
            critical applications to power economies and societies of the
            future." read more
          </p>

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

          <h2 class="text-lg font-medium mt-8">
            Why are you the best suited to deliver this work?
          </h2>
          <p>
            Describe what previous experience and expertise you or your team
            have which is relevant for your proposal. Focus on proven history of
            delivery, mention previous successful proposals, mainnet
            deployments, or relevant enterprise experience.
          </p>

          <Textarea
            id="trackRecord"
            bind:value={formData.metaData.trackRecord}
            label="Track Record"
            description="Proven history of delivery. Mention previous successful proposals, mainnet deployments, or relevant enterprise experience."
            placeholder="Enter Track Record Here"
            maxLength={650}
            validationErrors={validationErrors?.properties?.metaData}
          />

          <h2 class="text-lg font-medium mt-8">
            How long will your proposal need to be fully delivered? Or if you
            are requesting funding for operations, how many months will this
            budget cover?
          </h2>
          <p>
            Provide an estimated duration from the start of the work to
            completion. Or if your proposal covers ongoing operations or
            services, specify the number of months this budget is intended to
            support.
          </p>

          <!-- estimated duration input -->
          <Input
            id="estimatedDuration"
            bind:value={formData.metaData.estimatedDuration}
            label="Estimated Duration"
            type="number"
            min={1}
            description="Estimated duration of the project proposal in months"
            placeholder="Enter Duration in Months"
            required
            class="sm: w-1/4"
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
            2. Alignment to Strategy framework
          </Card.Title>
        </Card.Header>
        <Card.Content class="mt-0 pt-0">
          <FormStrategyFramework
            validationErrors={validationErrors?.properties?.metaData}
            bind:pillars={formData.metaData.strategyFramework.pillars}
            bind:pillarRationale={
              formData.metaData.strategyFramework.pillarRationale
            }
            bind:kpiAlignment={formData.metaData.strategyFramework.kpiAlignment}
          />
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

          {#if (formData.metaData.executionRoadmap.workPackages?.length ?? 0) > 0}
            <FormFinancialSummary
              validationErrors={validationErrors?.properties?.metaData
                ?.properties?.financialAndAdministrative}
              formData={formData.metaData}
            />
          {/if}
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
      <FormLegalDeclarations
        validationErrors={validationErrors?.properties?.metaData?.properties
          ?.legalDeclarations ?? null}
        bind:value={formData.metaData.legalDeclarations}
      />
    </div>
  </section>

  <section
    class="bg-(--mbo-orange) w-full sticky bottom-0 shadow-lg z-10 shadow-black/50 py-6"
    id="controls"
  >
    <div class="max-w-4xl mx-auto flex flex-wrap items-center gap-2">
      {#if formData.status === "draft"}
        <Button type="button" class="cursor-pointer" onclick={saveDraft}>
          Save Draft
        </Button>
      {/if}
      <Button type="submit" class="cursor-pointer">
        {formData.status === "draft" ? "Submit Proposal" : "Re-Submit Proposal"}
      </Button>
      {#if formData.status === "draft" && onSave}
        <label
          class="ml-auto flex h-9 items-center gap-2 rounded-md border bg-white px-4 py-2 shadow-xs cursor-pointer select-none text-sm font-medium"
        >
          <Switch.Root bind:checked={autoSaveEnabled} />
          <span>Auto-save every 5 min</span>
        </label>
      {/if}
    </div>
  </section>
</form>

<AlertDialog.Root bind:open={leaveConfirmOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Unsaved changes</AlertDialog.Title>
      <AlertDialog.Description>
        You have unsaved changes. Are you sure you want to leave?
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer class="flex gap-2">
      <AlertDialog.Cancel class="cursor-pointer" onclick={stayOnPage}>
        Stay
      </AlertDialog.Cancel>
      <AlertDialog.Action class="cursor-pointer" onclick={confirmLeave}>
        Leave
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
