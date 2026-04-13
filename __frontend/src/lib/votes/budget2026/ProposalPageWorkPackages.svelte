<script>
  import { Badge } from "$lib/components/ui/badge";
  import { buttonVariants } from "$lib/components/ui/button";
  import { cn, formatAda, formatUsd } from "$lib/utils.js";
  import * as Popover from "$lib/components/ui/popover";
  import Markdown from "$lib/base/Markdown.svelte";
  import LinkWarningDialog from "$lib/components/LinkWarningDialog.svelte";
  import BoxIcon from "@lucide/svelte/icons/box";
  import ExternalLinkIcon from "@lucide/svelte/icons/external-link";
  import InfoIcon from "@lucide/svelte/icons/info";
  import ItemContainer from "./ItemContainer.svelte";
  import CollapsibleCard from "$lib/components/CollapsibleCard.svelte";
  let { proposal } = $props();
  let linkWarningDialog;

  const workPackages = $derived(
    proposal?.metaData?.proposalDetails?.workPackages ?? [],
  );

  /** Per–work package total ADA from budgetBreakdown. */
  const wpTotals = $derived.by(() => {
    const list = Array.isArray(workPackages) ? workPackages : [];
    return list.map((wp) => {
      const rows = Array.isArray(wp?.budgetBreakdown) ? wp.budgetBreakdown : [];
      let total = 0;
      for (const row of rows) {
        const t =
          row.total ?? Number(row.quantity || 0) * Number(row.unitPrice || 0);
        if (Number.isFinite(t)) total += t;
      }
      return total;
    });
  });

  /** Which work package cards are expanded. Index -> boolean. */
  let expanded = $state({});
  /** Which milestone cards are expanded. Key "wpIndex-milestoneIndex" -> boolean. */
  let expandedMilestones = $state({});
  /** Which budget row cards are expanded. Key "wpIndex-rowIndex" -> boolean. */
  let expandedBudgetRows = $state({});

  $effect(() => {
    const list = Array.isArray(workPackages) ? workPackages : [];
    if (list.length > 0) {
      expanded = Object.fromEntries(list.map((_, i) => [i, true]));
    }
  });

  function toggle(index) {
    expanded = { ...expanded, [index]: !expanded[index] };
  }

  function milestoneKey(wpIndex, milestoneIndex) {
    return `${wpIndex}-${milestoneIndex}`;
  }

  function toggleMilestone(wpIndex, milestoneIndex) {
    const key = milestoneKey(wpIndex, milestoneIndex);
    expandedMilestones = {
      ...expandedMilestones,
      [key]: !expandedMilestones[key],
    };
  }

  function budgetRowKey(wpIndex, rowIndex) {
    return `${wpIndex}-${rowIndex}`;
  }

  function toggleBudgetRow(wpIndex, rowIndex) {
    const key = budgetRowKey(wpIndex, rowIndex);
    expandedBudgetRows = {
      ...expandedBudgetRows,
      [key]: !expandedBudgetRows[key],
    };
  }

  function rowTotal(row) {
    return row.total ?? Number(row.quantity || 0) * Number(row.unitPrice || 0);
  }

  const hasContent = $derived(workPackages.length > 0);

  const conversionRateNum = $derived.by(() => {
    const v =
      proposal?.metaData?.proposalDetails?.conversionRate ??
      proposal?.metaData?.conversionRate ??
      proposal?.metaData?.financialAndAdministrative?.conversionRate;
    if (v == null || v === "") return null;
    const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
    return Number.isFinite(n) && n > 0 ? n : null;
  });

  function expandFromHash(hash) {
    if (!hash) return;
    const match = hash.match(/^#work-package-(\d+)$/);
    if (!match) return;
    const idx = Number(match[1]) - 1;
    if (!Number.isInteger(idx) || idx < 0 || idx >= workPackages.length) return;
    expanded = { ...expanded, [idx]: true };
  }

  $effect(() => {
    if (typeof window === "undefined") return;
    const handleHashChange = () => {
      expandFromHash(window.location.hash);
    };
    // Run once on mount in case the page loaded with a hash.
    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  });
</script>

{#if hasContent}
  <section class="text-sm space-y-3 mb-2! mt-12" id="proposal-details">
    <h2 class="mb-4">Proposal Details</h2>

    <ul class="work-package-list space-y-2 list-none p-0 mb-1!">
      {#each workPackages as wp, i}
        {@const name =
          (wp?.name ?? "").toString().trim() || `Work package ${i + 1}`}
        {@const totalAda = wpTotals[i] ?? 0}
        {@const isExpanded = expanded[i] === true}
        {@const milestones = Array.isArray(wp?.milestones) ? wp.milestones : []}
        {@const noMilestones = wp?.noMilestonesBreakdown === true}
        {@const milestoneAlt = (wp?.milestoneAlternative ?? "")
          .toString()
          .trim()}
        {@const breakdown = Array.isArray(wp?.budgetBreakdown)
          ? wp.budgetBreakdown
          : []}
        {@const coreObjectives = Array.isArray(wp?.coreObjectives)
          ? wp.coreObjectives
          : []}
        {@const supportingDocs = Array.isArray(wp?.supportingDocuments)
          ? wp.supportingDocuments
          : []}
        <li>
          <CollapsibleCard
            id={`work-package-${i + 1}`}
            expanded={isExpanded}
            onToggle={() => toggle(i)}
            expandLabel="Expand work package"
            collapseLabel="Collapse work package"
            denseCollapsed={true}
            titleClass="text-lg font-medium leading-6"
            titleHeadingLevel={3}
          >
            {#snippet titleEyebrow()}
              <div class="text-muted-foreground text-xs">Work Package</div>
            {/snippet}
            {#snippet title()}
              <div class="mb-1">{name}</div>
            {/snippet}
            {#snippet titleLeading()}
              <BoxIcon class="size-5 shrink-0" />
            {/snippet}
            <div class="mt-4">
              {#if (wp?.summary ?? "").toString().trim()}
                <section class="mb-6">
                  <h4 class="min-w-0 leading-snug mb-2">
                    Please describe this Work Package at a high level
                  </h4>
                  <ItemContainer>
                    <Markdown content={wp.summary} />
                  </ItemContainer>
                </section>
              {/if}

              {#if wp.initiativeType}
                <section class="mb-2">
                  <h4 class="min-w-0 leading-snug mb-2">
                    Is this a new initiative or a continuation of existing work?
                  </h4>
                  <Badge
                    class="shrink-0 font-normal text-xs bg-(--mbo-cardano-blue) text-white border-0 mb-4"
                  >
                    {wp.initiativeType}
                  </Badge>
                </section>
              {/if}

              {#if wp.proposalType}
                <section class="mb-2">
                  <h4 class="min-w-0 leading-snug mb-2">
                    How would you classify the primary nature of this work
                    proposal?
                  </h4>
                  <Badge
                    class="shrink-0 font-normal text-xs bg-(--mbo-cardano-blue) text-white border-0 mb-4"
                  >
                    {wp.proposalType}
                  </Badge>
                </section>
              {/if}

              {#if coreObjectives.length > 0}
                <section class="mb-6">
                  <h4 class="min-w-0 leading-snug mb-2">
                    What is this work package intended to achieve?
                  </h4>
                  <ul class="space-y-1">
                    {#each coreObjectives as obj}
                      <li>
                        <ItemContainer>
                          <strong class="text-sm font-medium inline-block mb-1">
                            Core Objective
                          </strong>
                          <br />
                          {#if typeof obj === "string"}
                            {obj}
                          {:else}
                            {obj?.text ?? String(obj)}
                          {/if}
                        </ItemContainer>
                      </li>
                    {/each}
                  </ul>
                </section>
              {/if}

              <section class="mb-6">
                <div
                  class="mb-2 flex max-w-full flex-wrap items-center gap-x-1 gap-y-0.5"
                >
                  <h4 class="min-w-0 leading-snug">
                    Why does this work matter to Cardano? (Expected Value - ROI)
                  </h4>
                  <Popover.Root>
                    <Popover.Trigger
                      class={cn(
                        buttonVariants({
                          variant: "ghost",
                          size: "icon-sm",
                        }),
                        "size-fit shrink-0 p-0 px-0 py-0 h-auto w-auto min-h-0 gap-0",
                        "-ml-px text-(--mbo-tangy-blue) transition-none",
                        "hover:bg-transparent hover:text-(--mbo-tangy-blue)",
                        "dark:hover:bg-transparent active:bg-transparent dark:active:bg-transparent",
                        "focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2",
                      )}
                      openOnHover={true}
                      openDelay={150}
                      closeDelay={150}
                      aria-label="About Expected Value (ROI)"
                    >
                      <InfoIcon class="size-3" aria-hidden="true" />
                    </Popover.Trigger>
                    <Popover.Content class="p-3 text-sm max-w-sm" align="start">
                      <div class="font-medium">
                        Describe what will change or improve as a result of this
                        Work Package.
                      </div>
                      <p class="text-xs mt-2">
                        This may be qualitative or quantitative and does not
                        need to be financial.
                      </p>
                    </Popover.Content>
                  </Popover.Root>
                </div>
                <ItemContainer>
                  <Markdown content={wp.expectedValue} />
                </ItemContainer>
              </section>

              <section class="mb-6">
                <div
                  class="mb-2 flex max-w-full flex-wrap items-center gap-x-1 gap-y-0.5"
                >
                  <h4 class="min-w-0 leading-snug">
                    How will success be measured?
                  </h4>
                  <Popover.Root>
                    <Popover.Trigger
                      class={cn(
                        buttonVariants({
                          variant: "ghost",
                          size: "icon-sm",
                        }),
                        "size-fit shrink-0 p-0 px-0 py-0 h-auto w-auto min-h-0 gap-0",
                        "-ml-px text-(--mbo-tangy-blue) transition-none",
                        "hover:bg-transparent hover:text-(--mbo-tangy-blue)",
                        "dark:hover:bg-transparent active:bg-transparent dark:active:bg-transparent",
                        "focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2",
                      )}
                      openOnHover={true}
                      openDelay={150}
                      closeDelay={150}
                      aria-label="About success metrics"
                    >
                      <InfoIcon class="size-3" aria-hidden="true" />
                    </Popover.Trigger>
                    <Popover.Content class="p-3 text-sm max-w-sm" align="start">
                      <div class="font-medium">
                        How will success be measured?
                      </div>
                      <p class="text-xs mt-2">
                        Provide one or more metrics that demonstrate whether the
                        expected value has been achieved.
                      </p>
                    </Popover.Content>
                  </Popover.Root>
                </div>
                <ItemContainer>
                  <Markdown content={wp.metric} />
                </ItemContainer>
              </section>

              {#if supportingDocs.length > 0}
                <section class="mb-6">
                  <h4 class="mb-1.5">
                    Is there any extra material you would like to share about
                    this work package?
                  </h4>
                  <ItemContainer>
                    <ul class="space-y-0.5 list-none p-0">
                      {#each supportingDocs as doc}
                        {@const url = (doc?.url ?? "").toString().trim()}
                        {@const title = (doc?.title ?? url ?? "Link")
                          .toString()
                          .trim()}
                        {#if url}
                          <li>
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              class="text-primary hover:underline inline-flex items-start gap-1 text-sm cursor-pointer"
                              onclick={(e) => {
                                e.preventDefault();
                                linkWarningDialog.show(url, title);
                              }}
                            >
                              <ExternalLinkIcon
                                class="size-3.5 shrink-0 mt-0.5"
                                aria-hidden="true"
                              />
                              <span class="min-w-0 wrap-break-word">
                                {title}
                              </span>
                            </a>
                          </li>
                        {/if}
                      {/each}
                    </ul>
                  </ItemContainer>
                </section>
              {/if}

              {#if noMilestones && milestoneAlt}
                <section>
                  <h4 class="mb-2">
                    Milestone alternative
                  </h4>
                  <p class="text-sm text-muted-foreground mb-4">
                    Progress is described as follows (no milestone breakdown).
                  </p>
                  <div
                    class="prose prose-sm max-w-none dark:prose-invert **:first:mt-0"
                  >
                    <Markdown content={milestoneAlt} />
                  </div>
                </section>
              {:else if milestones.length > 0}
                <section>
                  <h4 class="mb-2">
                    How will this work package be delivered?
                  </h4>
                  <ul
                    class="milestone-list-editor-list space-y-2 list-none p-0 m-0 mb-1!"
                  >
                    {#each milestones as m, mi}
                      {@const msExpanded =
                        expandedMilestones[milestoneKey(i, mi)] === true}
                      {@const hasDetails =
                        (m?.deliverables ?? "").toString().trim() ||
                        (m?.acceptanceCriteria ?? "").toString().trim()}
                      <li>
                        <CollapsibleCard
                          expanded={msExpanded}
                          onToggle={() => toggleMilestone(i, mi)}
                          showButton={hasDetails}
                          expandLabel="Expand milestone"
                          collapseLabel="Collapse milestone"
                          class="bg-white"
                          titleClass="text-base font-medium leading-6"
                        >
                          {#snippet title()}
                            {m?.name ?? "Unnamed milestone"}
                          {/snippet}
                          {#if (m?.duration ?? "").toString().trim()}
                            <div
                              class="text-sm text-muted-foreground mt-0 mb-4"
                            >
                              <span class="font-medium text-foreground">
                                How many weeks will you need to complete this
                                milestone?
                              </span>
                              <p>
                                {m.duration} weeks
                              </p>
                            </div>
                          {/if}
                          {#if (m?.deliverables ?? "").toString().trim()}
                            <div
                              class="text-sm text-muted-foreground mt-0 mb-4"
                            >
                              <span class="font-medium text-foreground">
                                What will you deliver in this milestone?
                              </span>
                              <Markdown
                                content={m.deliverables}
                                class="mt-0.5"
                              />
                            </div>
                          {/if}
                          {#if (m?.acceptanceCriteria ?? "").toString().trim()}
                            <div class="text-sm text-muted-foreground mt-4">
                              <span class="font-medium text-foreground">
                                How do you know it's "done"?
                              </span>
                              <Markdown
                                content={m.acceptanceCriteria}
                                class="mt-0.5"
                              />
                            </div>
                          {/if}
                        </CollapsibleCard>
                      </li>
                    {/each}
                  </ul>
                </section>
              {/if}

              {#if breakdown.length > 0}
                {@const totalAda = wpTotals[i] ?? 0}
                {@const totalUsd =
                  conversionRateNum != null && Number.isFinite(totalAda)
                    ? totalAda * conversionRateNum
                    : null}
                <section
                  class={noMilestones || milestones.length > 0 ? "mt-8" : ""}
                >
                  <section class="space-y-2">
                    <h4 class="mb-2">
                      What's the budget estimated for this Work Package?
                    </h4>
                    <p class="text-sm text-muted-foreground mb-4">
                      Budget breakdown by category and item.
                    </p>

                    <ul class="space-y-2 list-none p-0 m-0 mb-1!">
                      {#each breakdown as row, rowIdx}
                        {@const total = rowTotal(row)}
                        {@const isBudgetExpanded =
                          expandedBudgetRows[budgetRowKey(i, rowIdx)] === true}
                        {@const itemName =
                          (row.name ?? row.itemName) ||
                          row.costCategory ||
                          `Item ${rowIdx + 1}`}
                        <li>
                          <CollapsibleCard
                            expanded={isBudgetExpanded}
                            onToggle={() => toggleBudgetRow(i, rowIdx)}
                            expandLabel="Expand budget item"
                            collapseLabel="Collapse budget item"
                            class="bg-white"
                            titleClass="text-base font-medium leading-6"
                          >
                            {#snippet title()}
                              {itemName}
                            {/snippet}
                            <div
                              class="text-sm text-muted-foreground mt-0 mb-1"
                            >
                              <span class="font-medium text-foreground">
                                Cost category:
                              </span>
                              <span>{row.costCategory ?? "—"}</span>
                            </div>
                            <div class="text-sm text-muted-foreground mt-3">
                              <span class="font-medium text-foreground">
                                ADA costs:
                              </span>
                              <span>
                                {formatAda(total)} ADA
                                {#if conversionRateNum != null && Number.isFinite(total)}
                                  <br />
                                  <span class="text-muted-foreground">
                                    USD equivalent ${formatUsd(
                                      total * conversionRateNum,
                                    )}
                                    (ADA/USD {conversionRateNum})
                                  </span>
                                {/if}
                              </span>
                            </div>
                            {#if (row.description ?? "").trim()}
                              <div class="text-sm text-muted-foreground mt-3">
                                <span
                                  class="font-medium text-foreground block mb-1"
                                >
                                  Item description:
                                </span>
                                <Markdown
                                  content={row.description ?? ""}
                                  class="mt-0.5"
                                />
                              </div>
                            {/if}
                          </CollapsibleCard>
                        </li>
                      {/each}
                    </ul>

                    <div
                      class="flex flex-wrap items-center justify-between gap-2 py-3 px-4 rounded-md border bg-(--mbo-cardano-blue) text-white font-medium mt-2"
                    >
                      <span>Total work package budget</span>
                      <div class="flex items-center gap-4 tabular-nums">
                        <span>{formatAda(totalAda)} ADA</span>
                        {#if totalUsd != null}
                          <span>
                            ${formatUsd(totalUsd)} (ADA/USD {conversionRateNum})
                          </span>
                        {/if}
                      </div>
                    </div>
                  </section>
                </section>
              {/if}
            </div>
          </CollapsibleCard>
        </li>
      {/each}
    </ul>
  </section>
{/if}

<LinkWarningDialog bind:this={linkWarningDialog} />
