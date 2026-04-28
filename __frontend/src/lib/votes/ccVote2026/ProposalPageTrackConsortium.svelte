<script>
  import Markdown from "$lib/base/Markdown.svelte";
  import CollapsibleCard from "$lib/components/CollapsibleCard.svelte";
  import ItemContainer from "$lib/votes/budget2026/ItemContainer.svelte";
  import { buildSocialRows, hasText, toText } from "./proposalPageUtils.js";

  let { proposal } = $props();

  const consortium = $derived(
    proposal?.metaData?.consortium && typeof proposal.metaData.consortium === "object"
      ? proposal.metaData.consortium
      : null,
  );

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
            id: "member-geographic-region",
            label: "Geographic region",
            value: member.geographicRegion,
          },
          {
            id: "member-pool-id",
            label: "Pool ID",
            value: member.poolId,
          },
          {
            id: "member-drep-id",
            label: "DRep ID",
            value: member.drepId,
          },
          {
            id: "member-conflict-interest",
            label: "Conflict of interest statement",
            value: member.conflictOfInterestStatement,
            markdown: true,
          },
        ].filter((field) => hasText(field.value));

        const links = buildSocialRows(member);
        if (fields.length === 0 && links.length === 0) return null;

        return {
          key: `member-${index}-${toText(member.fullNameOrAlias)}`,
          name: toText(member.fullNameOrAlias) || `Member ${index + 1}`,
          fields,
          links,
        };
      })
      .filter(Boolean);
  });

  const hasContent = $derived(governanceFields.length > 0 || members.length > 0);

  let expandedGovernance = $state({});

  let expandedMembers = $state({});

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
                class="bg-white"
                expanded={isMemberExpanded(member.key)}
                onToggle={() => toggleMember(member.key)}
                expandLabel={`Expand ${member.name}`}
                collapseLabel={`Collapse ${member.name}`}
                titleClass="text-base font-medium leading-6"
                titleHeadingLevel={3}
              >
                {#snippet title()}
                  {member.name}
                {/snippet}
                <div class="space-y-4 mt-2">
                  {#each member.fields as field (field.id)}
                    <section>
                      <h4 class="mb-1.5 text-sm">{field.label}</h4>
                      <ItemContainer>
                        {#if field.markdown}
                          <Markdown content={toText(field.value)} class="text-sm leading-5" />
                        {:else}
                          <p class="text-sm leading-5">{toText(field.value)}</p>
                        {/if}
                      </ItemContainer>
                    </section>
                  {/each}

                  {#if member.links.length > 0}
                    <section>
                      <h4 class="mb-1.5 text-sm">Social & Profile links</h4>
                      <ItemContainer>
                        <ul class="space-y-1 list-none p-0 m-0">
                          {#each member.links as link (link.key)}
                            <li>
                              <a
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                class="text-sm text-primary hover:underline"
                              >
                                {link.label}
                              </a>
                            </li>
                          {/each}
                        </ul>
                      </ItemContainer>
                    </section>
                  {/if}
                </div>
              </CollapsibleCard>
            </li>
          {/each}
        </ul>
      </section>
    {/if}
  </div>
{/if}
