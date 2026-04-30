<script>
  import Markdown from "$lib/base/Markdown.svelte";
  import CollapsibleCard from "$lib/components/CollapsibleCard.svelte";
  import ItemContainer from "$lib/votes/budget2026/ItemContainer.svelte";
  import LinkWarningDialog from "$lib/components/LinkWarningDialog.svelte";
  import ExternalLinkIcon from "@lucide/svelte/icons/external-link";
  import CopyIcon from "@lucide/svelte/icons/copy";
  import UsersRoundIcon from "@lucide/svelte/icons/users-round";
  import { toast } from "svelte-sonner";
  import { shortenString } from "$lib/utils.js";
  import { buildSocialRows, hasText, toText } from "./proposalPageUtils.js";

  let { proposal } = $props();

  const consortium = $derived(
    proposal?.metaData?.consortium && typeof proposal.metaData.consortium === "object"
      ? proposal.metaData.consortium
      : null,
  );
  const apiUrl =
    typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL ? import.meta.env.VITE_API_URL : "/api/v0";
  let regionsById = $state({});

  $effect(() => {
    let cancelled = false;
    fetch(`${apiUrl}/regions`)
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText || "Failed to load regions");
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        const raw = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        /** @type {Record<string, string>} */
        const map = {};
        for (const region of raw) {
          const id = region?._id != null ? String(region._id) : "";
          const name = region?.name != null ? String(region.name) : "";
          if (id && name) map[id] = name;
        }
        regionsById = map;
      })
      .catch(() => {
        if (!cancelled) regionsById = {};
      });
    return () => {
      cancelled = true;
    };
  });

  const governanceFields = $derived.by(() => {
    const data = consortium;
    if (!data) return [];
    return [
      {
        id: "consortium-conflict-interest",
        question: "Do you have any conflicts of interest to disclose?",
        value: data.conflictOfInterestStatement,
      },
      {
        id: "consortium-contributions",
        question: "What contributions have consortium members made?",
        value: data.contributionsToCardano,
      },
      {
        id: "consortium-motivation",
        question: "Why is your consortium applying?",
        value: data.motivation,
      },
      {
        id: "consortium-decentralised-importance",
        question: "Why is decentralised governance important to your consortium?",
        value: data.decentralisedGovernanceImportance,
      },
      {
        id: "consortium-constitutional-interpretation",
        question: "How will you approach constitutional interpretation?",
        value: data.constitutionalInterpretation,
      },
      {
        id: "consortium-perspective",
        question: "What perspective or unique value would your consortium bring?",
        value: data.perspectiveYouWouldBring,
      },
      {
        id: "consortium-transparency",
        question: "How will your consortium ensure transparency in your decisions?",
        value: data.transparencyApproach,
      },
      {
        id: "consortium-internal-decisions",
        question: "How does your consortium make internal decisions?",
        value: data.internalDecisionMakingProcess,
      },
    ].filter((field) => hasText(field.value));
  });

  const members = $derived.by(() => {
    const rawMembers = Array.isArray(consortium?.members) ? consortium.members : [];
    return rawMembers
      .map((member, index) => {
        if (!member || typeof member !== "object") return null;
        const regionId = toText(member.geographicRegion);
        const poolId = toText(member.poolId);
        const drepId = toText(member.drepId);
        const geographicRegion = regionId ? (regionsById[regionId] ?? "Unknown region") : "";
        const fields = [
          {
            id: "member-brief-biography",
            label: "Brief biography",
            value: member.briefBiography,
            markdown: true,
          },
          {
            id: "member-professional-background",
            label: "Professional background",
            value: member.professionalBackground,
            markdown: true,
          },
          {
            id: "member-governance-experience",
            label: "Governance experience",
            value: member.governanceExperience,
            markdown: true,
          },
          {
            id: "member-conflict-interest",
            label: "Conflict of interest statement",
            value: member.conflictOfInterestStatement,
            markdown: true,
          },
        ].filter((field) => hasText(field.value));

        const links = buildSocialRows(member);
        if (
          fields.length === 0 &&
          links.length === 0 &&
          !hasText(geographicRegion) &&
          !hasText(poolId) &&
          !hasText(drepId)
        ) {
          return null;
        }

        return {
          key: `member-${index}-${toText(member.fullNameOrAlias)}`,
          name: toText(member.fullNameOrAlias) || `Member ${index + 1}`,
          fields,
          links,
          geographicRegion,
          poolId,
          drepId,
        };
      })
      .filter(Boolean);
  });

  const hasContent = $derived(governanceFields.length > 0 || members.length > 0);

  let expandedGovernance = $state({});

  let expandedMembers = $state({});
  let linkWarningDialog;

  function isGovernanceExpanded(key) {
    return expandedGovernance[key] !== false;
  }

  function toggleGovernance(key) {
    expandedGovernance = {
      ...expandedGovernance,
      [key]: !isGovernanceExpanded(key),
    };
  }

  function isMemberExpanded(key) {
    return expandedMembers[key] !== false;
  }

  function toggleMember(key) {
    expandedMembers = {
      ...expandedMembers,
      [key]: !isMemberExpanded(key),
    };
  }

  function copyToClipboard(label, value) {
    navigator.clipboard.writeText(value).then(
      () => toast.success(`${label} copied to clipboard`),
      () => toast.error("Failed to copy"),
    );
  }
</script>

{#if hasContent}
  <div class="text-sm space-y-8 mt-8">
    {#if governanceFields.length > 0}
      <section id="consortium-governance-statement" class="space-y-3">
        <h2>Consortium Governance Statement</h2>
        <div class="space-y-2">
          {#each governanceFields as field (field.id)}
            <CollapsibleCard
              expanded={isGovernanceExpanded(field.id)}
              onToggle={() => toggleGovernance(field.id)}
              expandLabel={`Expand ${toText(field.question).toLowerCase()}`}
              collapseLabel={`Collapse ${toText(field.question).toLowerCase()}`}
              titleClass="text-lg font-medium leading-6"
              titleHeadingLevel={3}
            >
              {#snippet title()}
                {field.question}
              {/snippet}
              <ItemContainer>
                <Markdown content={toText(field.value)} class="text-sm leading-5" />
              </ItemContainer>
            </CollapsibleCard>
          {/each}
        </div>
      </section>
    {/if}

    {#if members.length > 0}
      <section id="consortium-members" class="space-y-3">
        <h2>Consortium Members</h2>
        <ul class="space-y-2 list-none p-0 m-0 mt-2">
          {#each members as member (member.key)}
            <li>
              <CollapsibleCard
                expanded={isMemberExpanded(member.key)}
                onToggle={() => toggleMember(member.key)}
                expandLabel={`Expand ${member.name}`}
                collapseLabel={`Collapse ${member.name}`}
                titleClass="text-base font-medium leading-6"
                titleHeadingLevel={3}
              >
                {#snippet titleLeading()}
                  <UsersRoundIcon class="size-5 shrink-0" />
                {/snippet}
                {#snippet title()}
                  {member.name}
                {/snippet}
                <div class="space-y-4 mt-2">
                  {#if member.geographicRegion}
                    <section>
                      <h4 class="mb-2">Geographic region</h4>
                      <ItemContainer>
                        <p class="text-sm leading-5">{member.geographicRegion}</p>
                      </ItemContainer>
                    </section>
                  {/if}

                  {#if member.poolId || member.drepId}
                    <section>
                      <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {#if member.poolId}
                          <div>
                            <h4 class="mb-2">Pool ID</h4>
                            <ItemContainer>
                              <div class="flex items-center justify-between gap-2">
                                <p class="text-sm leading-5 wrap-break-word">
                                  {shortenString(member.poolId, 20, true)}
                                </p>
                                <button
                                  type="button"
                                  class="shrink-0 inline-flex items-center justify-center rounded border p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                                  title="Copy Pool ID"
                                  aria-label="Copy Pool ID"
                                  onclick={() => copyToClipboard("Pool ID", member.poolId)}
                                >
                                  <CopyIcon class="size-3.5" aria-hidden="true" />
                                </button>
                              </div>
                            </ItemContainer>
                          </div>
                        {/if}
                        {#if member.drepId}
                          <div>
                            <h4 class="mb-2">DRep ID</h4>
                            <ItemContainer>
                              <div class="flex items-center justify-between gap-2">
                                <p class="text-sm leading-5 wrap-break-word">
                                  {shortenString(member.drepId, 20, true)}
                                </p>
                                <button
                                  type="button"
                                  class="shrink-0 inline-flex items-center justify-center rounded border p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                                  title="Copy DRep ID"
                                  aria-label="Copy DRep ID"
                                  onclick={() => copyToClipboard("DRep ID", member.drepId)}
                                >
                                  <CopyIcon class="size-3.5" aria-hidden="true" />
                                </button>
                              </div>
                            </ItemContainer>
                          </div>
                        {/if}
                      </div>
                    </section>
                  {/if}

                  {#if member.links.length > 0}
                    <section>
                      <h4 class="mb-2">Social & Profile links</h4>
                      <ItemContainer>
                        <ul class="space-y-1 list-none p-0 m-0">
                          {#each member.links as link (link.key)}
                            <li>
                              <a
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                class="text-primary hover:underline inline-flex items-start gap-1 text-sm cursor-pointer"
                                onclick={(e) => {
                                  e.preventDefault();
                                  linkWarningDialog.show(link.url, link.label);
                                }}
                              >
                                <ExternalLinkIcon class="size-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                                {link.label}
                              </a>
                            </li>
                          {/each}
                        </ul>
                      </ItemContainer>
                    </section>
                  {/if}

                  {#each member.fields as field (field.id)}
                    <section>
                      <h4 class="mb-2">{field.label}</h4>
                      <ItemContainer>
                        {#if field.markdown}
                          <Markdown content={toText(field.value)} class="text-sm leading-5" />
                        {:else}
                          <p class="text-sm leading-5">{toText(field.value)}</p>
                        {/if}
                      </ItemContainer>
                    </section>
                  {/each}
                </div>
              </CollapsibleCard>
            </li>
          {/each}
        </ul>
      </section>
    {/if}
  </div>
{/if}

<LinkWarningDialog bind:this={linkWarningDialog} />
