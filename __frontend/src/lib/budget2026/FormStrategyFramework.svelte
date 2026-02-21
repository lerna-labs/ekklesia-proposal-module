<script>
  import * as Field from "$lib/components/ui/field/index.js";
  import Textarea from "$lib/form/Textarea.svelte";
  import ToolTip from "$lib/form/ToolTip.svelte";
  import { page } from "$app/state";
  let {
    validationErrors = $bindable(),
    pillars = $bindable(),
    pillarRationale = $bindable(),
    kpiAlignment = $bindable(),
  } = $props();

  let categories = $derived(page.data.categories);
  let sfErrors = $derived(validationErrors?.properties?.strategyFramework);
  let pillarsError = $derived(sfErrors?.properties?.pillars?.errors?.[0]);
  let pillarRationaleError = $derived(
    sfErrors?.properties?.pillarRationale?.errors?.[0],
  );
  let kpiAlignmentError = $derived(
    sfErrors?.properties?.kpiAlignment?.errors?.[0],
  );
</script>

<Field.Set class="space-y-2">
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
        : 'border-input'}"
      aria-invalid={pillarsError ? true : false}
    >
      {#each categories as category (category._id)}
        <button
          type="button"
          class="w-full text-left p-4 rounded-md border items-start cursor-pointer space-y-2 {pillars.includes(
            category._id,
          )
            ? 'bg-(--mbo-electric-blue) text-white border-(--mbo-electric-blue) hover:opacity-90'
            : 'border-muted-foreground/20 bg-muted-foreground/10 hover:bg-muted-foreground/20'}"
          onclick={() => {
            if (pillars.includes(category._id)) {
              pillars.splice(pillars.indexOf(category._id), 1);
            } else {
              pillars.push(category._id);
            }
          }}
        >
          <div class="text-lg font-medium w-full">{category.title}</div>
          <p
            class="text-sm {pillars.includes(category._id)
              ? 'text-white/80'
              : 'text-muted-foreground'}"
          >
            {category.description}
          </p>
        </button>
      {/each}
    </div>
    {#if pillarsError}
      <Field.Error class="text-xs">{pillarsError}</Field.Error>
    {/if}
  </Field.Field>

  <Field.Field class="gap-2">
    <h2 class="text-lg font-medium mt-2">
      Why have you selected those pillars?
    </h2>

    <p class="text-sm text-muted-foreground mb-4">
      Provide a rationale about why those pillars align the most to your
      proposal and how your proposal supports them. Look also at the focus areas
      provided as example for each pillar.
    </p>

    <Textarea
      id="pillarRationale"
      bind:value={pillarRationale}
      label="Rationale for your selection"
      description="Focus on how your proposal provides value towards those pillars"
      required
      maxLength={150000}
      validationErrors={sfErrors}
    />
  </Field.Field>

  <Field.Field class="gap-2">
    <h2 class="text-lg font-medium mt-2">
      Does your proposal support any of the KPIs of the strategy framework?
    </h2>
    <p class="text-sm text-muted-foreground">
      Looking at the KPIs provided in the strategy framwork, explain:
    </p>
    <ul class="list-disc list-inside text-sm text-muted-foreground mb-4">
      <li>if your proposal directly supports any of those and how</li>
      <li>
        AND / OR propose other additional to the existing list, describe why
        they are relevant and how your proposal relates to them.
      </li>
    </ul>
    <Textarea
      id="kpiAlignment"
      bind:value={kpiAlignment}
      label="Alignment to KPIs"
      description="Align to existing KPI or describe additional KPIs"
      required
      maxLength={100000}
      validationErrors={sfErrors}
    />
  </Field.Field>
</Field.Set>
