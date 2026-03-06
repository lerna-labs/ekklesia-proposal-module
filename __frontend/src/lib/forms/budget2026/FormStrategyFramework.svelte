<script>
  /** @see __frontend/docs/budget2026/form-strategy-framework.md Version: 1.0.0 */
  import * as Field from "$lib/components/ui/field/index.js";
  import Textarea from "$lib/components/form/Textarea.svelte";
  import ToolTip from "$lib/components/form/ToolTip.svelte";

  let {
    formData = $bindable(),
    vote,
    pillars: pillarOptions = [],
    proposal,
    validationErrors,
  } = $props();

  let sfErrors = $derived(
    validationErrors?.properties?.metaData?.properties?.strategyFramework ??
      validationErrors?.properties?.strategyFramework,
  );
  let pillarsError = $derived(sfErrors?.properties?.pillars?.errors?.[0]);
  let pillarRationaleError = $derived(
    sfErrors?.properties?.pillarRationale?.errors?.[0],
  );
  let kpiAlignmentError = $derived(
    sfErrors?.properties?.kpiAlignment?.errors?.[0],
  );
</script>

<Field.Set class="space-y-1">
  <div>
    <h2 class="text-lg! font-medium">
      To which strategic pillar does your proposal align the most?
    </h2>

    <p class="text-muted-foreground mb-0!">
      Looking at the <a
        href="https://ipfs.io/ipfs/bafkreiewgqs6c25nk7gtzlf5udrqumpiqnbxhix7tu4yvssr2lgxgs3k2m"
        target="_blank"
        class="link"
      >
        strategy pillars
      </a>
      supported by DReps in this
      <a
        href="https://gov.tools/outcomes/governance_actions/3a5be93bafd26d0dbb9bfe19f4acecaa38cef75e50201d19199e6cc856db6601#0"
        target="_blank"
        class="link"
      >
        info action
      </a>, which one does your proposal support or relate to the most. Before
      selecting read the whole
      <a
        href="https://ipfs.io/ipfs/bafkreiewgqs6c25nk7gtzlf5udrqumpiqnbxhix7tu4yvssr2lgxgs3k2m"
        target="_blank"
        class="link"
      >
        strategy framework
      </a>
      and review the pillars details. Select one or more
    </p>
  </div>
  <Field.Field class="gap-2">
    <div class="flex items-center gap-1 w-full">
      <Field.Label class="flex gap-0 mb-0 pb-0 text-sm shrink-0 w-fit">
        Strategic Pillars
        <span class="text-(--mbo-electric-blue)">*</span>
      </Field.Label>
      <ToolTip
        content="Select the pillars that align most with your proposal. Look at the focus areas provided as example for each pillar."
      />
      <span class="flex-1 min-w-0" aria-hidden="true"></span>
    </div>
    <div
      class="space-y-2 rounded-md border {pillarsError
        ? 'border-destructive ring-destructive/20 ring-[3px]'
        : 'border-transparent'}"
      aria-invalid={pillarsError ? true : false}
    >
      {#each pillarOptions as pillarOption (pillarOption._id)}
        {@const selectedPillarIds = formData.metaData.strategyFramework?.pillars ?? []}
        <button
          type="button"
          class="w-full text-left p-4 rounded-md border items-start cursor-pointer space-y-2 {selectedPillarIds.includes(
            pillarOption._id,
          )
            ? 'bg-(--mbo-electric-blue) text-white border-(--mbo-electric-blue) hover:opacity-90'
            : 'border-muted-foreground/20 bg-muted-foreground/10 hover:bg-muted-foreground/20'}"
          onclick={() => {
            const arr = formData.metaData.strategyFramework.pillars;
            if (arr.includes(pillarOption._id)) {
              arr.splice(arr.indexOf(pillarOption._id), 1);
            } else {
              arr.push(pillarOption._id);
            }
          }}
        >
          <div class="text font-medium w-full">{pillarOption.title}</div>
          <p
            class="text-xs mb-0! {selectedPillarIds.includes(pillarOption._id)
              ? 'text-white/80'
              : 'text-muted-foreground'}"
          >
            {pillarOption.description}
          </p>
        </button>
      {/each}
    </div>
    {#if pillarsError}
      <Field.Error class="text-xs">{pillarsError}</Field.Error>
    {/if}
  </Field.Field>

  <Field.Field class="gap-2">
    <h3>Why have you selected those pillars?</h3>

    <p>
      Provide a rationale about why those pillars align the most to your
      proposal and how your proposal supports them. Look also at the <a
        href="https://ipfs.io/ipfs/bafkreiewgqs6c25nk7gtzlf5udrqumpiqnbxhix7tu4yvssr2lgxgs3k2m"
        target="_blank"
        class="link"
      >
        focus areas
      </a>
      provided as example for each pillar.
    </p>

    <Textarea
      id="pillarRationale"
      bind:value={formData.metaData.strategyFramework.pillarRationale}
      label="Rationale for your selection"
      description="Focus on how your proposal provides value towards those pillars"
      placeholder="Explain why you chose those pillars..."
      required
      maxLength={15000}
      validationErrors={sfErrors}
    />
  </Field.Field>

  <Field.Field class="gap-2 mb-8">
    <h3>
      Does your proposal support any of the KPIs of the strategy framework?
    </h3>
    <p>
      Looking at the <a
        href="https://ipfs.io/ipfs/bafkreiewgqs6c25nk7gtzlf5udrqumpiqnbxhix7tu4yvssr2lgxgs3k2m"
        target="_blank"
        class="link"
      >
        KPIs
      </a>
      provided in the strategy framwork, explain:
    </p>
    <ul>
      <li>if your proposal directly supports any of those and how</li>
      <li>
        AND / OR propose other additional to the existing list, describe why
        they are relevant and how your proposal relates to them.
      </li>
    </ul>
    <p>
      For each selected KPI, explain the specific actions, methods, or
      approaches you will use to drive meaningful impact.
    </p>
    <Textarea
      id="kpiAlignment"
      bind:value={formData.metaData.strategyFramework.kpiAlignment}
      label="Alignment to KPIs"
      description="Align to existing KPI or describe additional KPIs"
      placeholder="Explain specific actions/methodologies per KPI"
      required
      maxLength={10000}
      validationErrors={sfErrors}
    />
  </Field.Field>
</Field.Set>
