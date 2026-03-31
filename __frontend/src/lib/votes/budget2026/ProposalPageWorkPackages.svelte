<script>
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge";
  import { formatAda } from "$lib/utils.js";
  import Markdown from "$lib/base/Markdown.svelte";
  import LinkWarningDialog from "$lib/components/LinkWarningDialog.svelte";
  import BoxIcon from "@lucide/svelte/icons/box";
  import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
  import ChevronUpIcon from "@lucide/svelte/icons/chevron-up";
  import ExternalLinkIcon from "@lucide/svelte/icons/external-link";
  import ItemContainer from "./ItemContainer.svelte";
  import ProposalPageWorkPackageBudgetCards from "./ProposalPageWorkPackageBudgetCards.svelte";
  import CollapsibleCard from "./CollapsibleCard.svelte";
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
    <h2 class="text-2xl font-medium mb-4">Proposal Details</h2>

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
          <Card.Root
            id={`work-package-${i + 1}`}
            class="py-2 {isExpanded ? 'pb-0' : 'pb-2'} bg-slate-50"
          >
            <Card.Header
              class="flex flex-row gap-1 py-0 pl-4 pr-3 text-sm {isExpanded
                ? 'items-start min-h-10'
                : 'items-center h-10 min-h-10'}"
            >
              <div
                class="flex-1 min-w-0 flex {isExpanded
                  ? 'min-h-10 items-start'
                  : 'h-10 items-center'}"
              >
                <button
                  type="button"
                  class="min-w-0 w-full font-medium text-left cursor-pointer focus:outline-none text-lg leading-6 relative pl-7"
                  title={name}
                  onclick={() => toggle(i)}
                >
                  <span
                    class="absolute left-0 {isExpanded ? 'top-2' : 'top-0'}"
                    aria-hidden="true"
                  >
                    <BoxIcon class="size-5 shrink-0 top-0.5 relative" />
                  </span>

                  {#if isExpanded}
                    <span class="block pt-2">{name}</span>
                  {:else}
                    <span class="truncate block">{name}</span>
                  {/if}
                </button>
              </div>

              <Button
                type="button"
                variant="outline"
                size="icon"
                class="shrink-0 size-8 cursor-pointer"
                title={isExpanded
                  ? "Collapse work package"
                  : "Expand work package"}
                aria-expanded={isExpanded}
                aria-label={isExpanded
                  ? "Collapse work package"
                  : "Expand work package"}
                onclick={() => toggle(i)}
              >
                {#if isExpanded}
                  <ChevronUpIcon class="size-4" aria-hidden="true" />
                {:else}
                  <ChevronDownIcon class="size-4" aria-hidden="true" />
                {/if}
              </Button>
            </Card.Header>
            {#if isExpanded}
              <Card.Content class="pl-4 pr-3 pt-0 pb-4 -mt-4">
                {#if (wp?.summary ?? "").toString().trim()}
                  <section class="mb-6">
                    <h4 class="text-md font-medium mb-2 text-(--mbo-tangy-blue)"
                      >Please describe this Work Package at a high level</h4
                    >
                    <ItemContainer>
                      <Markdown content={wp.summary} />
                    </ItemContainer>
                  </section>
                {/if}

                {#if wp.initiativeType}
                  <section class="mb-2">
                    <h4 class="text-md font-medium mb-2 text-(--mbo-tangy-blue)"
                      >Is this a new initiative or a continuation of existing
                      work?</h4
                    >
                    <Badge
                      class="shrink-0 font-normal text-xs bg-(--mbo-cardano-blue) text-white border-0 mb-4"
                    >
                      {wp.initiativeType}
                    </Badge>
                  </section>
                {/if}

                {#if wp.proposalType}
                  <section class="mb-2">
                    <h4 class="text-md font-medium mb-2 text-(--mbo-tangy-blue)"
                      >How would you classify the primary nature of this work
                      proposal?</h4
                    >
                    <Badge
                      class="shrink-0 font-normal text-xs bg-(--mbo-cardano-blue) text-white border-0 mb-4"
                    >
                      {wp.proposalType}
                    </Badge>
                  </section>
                {/if}

                {#if coreObjectives.length > 0}
                  <section class="mb-6">
                    <h4 class="text-md font-medium mb-2 text-(--mbo-tangy-blue)"
                      >What is this work package intended to achieve?</h4
                    >
                    <ul class="space-y-1">
                      {#each coreObjectives as obj}
                        <li>
                          <ItemContainer>
                            <strong
                              class="text-sm font-medium inline-block mb-1"
                              >Core Objective</strong
                            ><br />
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
                  <h4
                    class="text-normal font-medium mb-2 text-(--mbo-tangy-blue)"
                    >Why does this work matter to Cardano, and how will success
                    be measured?</h4
                  >
                  <ItemContainer>
                    <Markdown content={wp.expectedValue} />
                  </ItemContainer>
                </section>

                <section class="mb-6">
                  <h4
                    class="text-normal font-medium mb-2 text-(--mbo-tangy-blue)"
                    >How will success be measured?</h4
                  >
                  <ItemContainer>
                    <Markdown content={wp.metric} />
                  </ItemContainer>
                </section>

                {#if supportingDocs.length > 0}
                  <section class="mb-6">
                    <h4
                      class="text-normal font-medium mb-1.5 text-(--mbo-tangy-blue)"
                      >Is there any extra material you would like to share about
                      this work package?</h4
                    >
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
                    <h4 class="text-normal font-medium mb-2"
                      >Milestone alternative</h4
                    >
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
                    <h4 class="text-lg font-medium mb-2"
                      >How will this work package be delivered?</h4
                    >
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
                            title={m?.name ?? "Unnamed milestone"}
                            expanded={msExpanded}
                            onToggle={() => toggleMilestone(i, mi)}
                            showButton={hasDetails}
                            expandLabel="Expand milestone"
                            collapseLabel="Collapse milestone"
                          >
                            {#if (m?.duration ?? "").toString().trim()}
                              <div
                                class="text-sm text-muted-foreground mt-0 mb-4"
                              >
                                <span class="font-medium text-foreground"
                                  >How many weeks will you need to complete this
                                  milestone?</span
                                >
                                <p>
                                  {m.duration} weeks
                                </p>
                              </div>
                            {/if}
                            {#if (m?.deliverables ?? "").toString().trim()}
                              <div
                                class="text-sm text-muted-foreground mt-0 mb-4"
                              >
                                <span class="font-medium text-foreground"
                                  >What will you deliver in this milestone?</span
                                >
                                <Markdown
                                  content={m.deliverables}
                                  class="mt-0.5"
                                />
                              </div>
                            {/if}
                            {#if (m?.acceptanceCriteria ?? "")
                              .toString()
                              .trim()}
                              <div class="text-sm text-muted-foreground mt-4">
                                <span class="font-medium text-foreground"
                                  >How do you know it's "done"?</span
                                >
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
                  <section
                    class={noMilestones || milestones.length > 0 ? "mt-8" : ""}
                  >
                    <ProposalPageWorkPackageBudgetCards
                      {breakdown}
                      totalAda={wpTotals[i] ?? 0}
                      {conversionRateNum}
                    />
                  </section>
                {/if}
              </Card.Content>
            {/if}
          </Card.Root>
        </li>
      {/each}
    </ul>
  </section>
{/if}

<LinkWarningDialog bind:this={linkWarningDialog} />
