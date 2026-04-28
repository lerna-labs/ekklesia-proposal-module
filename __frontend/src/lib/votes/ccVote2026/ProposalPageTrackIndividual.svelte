<script>
  import Markdown from "$lib/base/Markdown.svelte";
  import CollapsibleCard from "$lib/components/CollapsibleCard.svelte";
  import ItemContainer from "$lib/votes/budget2026/ItemContainer.svelte";
  import { Badge } from "$lib/components/ui/badge";
  import CopyIcon from "@lucide/svelte/icons/copy";
  import { toast } from "svelte-sonner";
  import { shortenString } from "$lib/utils.js";
  import { hasText, toText } from "./proposalPageUtils.js";

  let { proposal } = $props();

  const individual = $derived(
    proposal?.metaData?.individual && typeof proposal.metaData.individual === "object"
      ? proposal.metaData.individual
      : null,
  );

  const sections = $derived.by(() => {
    const data = individual;
    if (!data) return [];

    const sectionList = [];

    const backgroundFields = [
      {
        id: "professional-background",
        question: "What is your professional background?",
        value: data.professionalBackground,
      },
      {
        id: "governance-experience",
        question: "What governance experience do you have?",
        value: data.governanceExperience,
      },
    ].filter((field) => hasText(field.value));

    if (backgroundFields.length > 0) {
      sectionList.push({
        id: "background-expertise",
        title: "Background & Expertise",
        fields: backgroundFields,
      });
    }

    const governanceFields = [
      {
        id: "brief-biography",
        question: "Tell us about yourself (brief biography)",
        value: data.briefBiography,
      },
      {
        id: "conflict-interest",
        question: "Do you have any conflicts of interest to disclose?",
        value: data.conflictOfInterestStatement,
      },
      {
        id: "contributions",
        question: "What contributions have you made to the ecosystem?",
        value: data.contributionsToCardano,
      },
      {
        id: "motivation",
        question: "Why are you running for this position?",
        value: data.motivation,
      },
      {
        id: "decentralised-importance",
        question: "Why is decentralised governance important to you?",
        value: data.decentralisedGovernanceImportance,
      },
      {
        id: "constitutional-interpretation",
        question: "How will you approach constitutional interpretation?",
        value: data.constitutionalInterpretation,
      },
      {
        id: "perspective",
        question: "What perspective or unique value would you bring?",
        value: data.perspectiveYouWouldBring,
      },
      {
        id: "transparency",
        question: "How will you ensure transparency in your decisions?",
        value: data.transparencyApproach,
      },
    ].filter((field) => hasText(field.value));

    if (governanceFields.length > 0) {
      sectionList.push({
        id: "biography-governance",
        title: "Biography & Governance Statement",
        fields: governanceFields,
      });
    }

    const coldCredentialFields = [
      {
        id: "cold-credential-hash",
        question: "Cold credential hash",
        value: proposal?.metaData?.coldCredentialHash,
        markdown: false,
      },
      {
        id: "cold-credential-type",
        question: "Credential type",
        value:
          proposal?.metaData?.coldCredentialType === "keyCredential"
            ? "Key Credential"
            : proposal?.metaData?.coldCredentialType === "scriptCredential"
              ? "Script Credential"
              : "",
        markdown: false,
      },
    ].filter((field) => hasText(field.value));

    if (coldCredentialFields.length > 0) {
      sectionList.push({
        id: "cold-credentials",
        title: "Cold Credentials",
        fields: coldCredentialFields,
      });
    }

    return sectionList;
  });

  let expanded = $state({});

  function isExpanded(id) {
    return expanded[id] !== false;
  }

  function toggleSection(id) {
    expanded = { ...expanded, [id]: !isExpanded(id) };
  }

  function copyToClipboard(label, value) {
    navigator.clipboard.writeText(value).then(
      () => toast.success(`${label} copied to clipboard`),
      () => toast.error("Failed to copy"),
    );
  }
</script>

{#if sections.length > 0}
  <div class="text-sm space-y-8 mt-8">
    {#each sections as section (section.id)}
      <section id={section.id} class="space-y-3">
        <h2>{section.title}</h2>
        {#if section.id === "cold-credentials"}
          {@const coldHash = toText(proposal?.metaData?.coldCredentialHash)}
          {@const coldType = toText(
            proposal?.metaData?.coldCredentialType === "keyCredential"
              ? "Key Credential"
              : proposal?.metaData?.coldCredentialType === "scriptCredential"
                ? "Script Credential"
                : "",
          )}
          <CollapsibleCard
            expanded={true}
            onToggle={() => {}}
            showButton={false}
            titleClass="text-lg font-medium leading-6"
            titleHeadingLevel={3}
          >
            {#snippet title()}
              Cold credential hash
            {/snippet}
            {#if coldType}
              <Badge class="shrink-0 font-normal text-xs bg-(--mbo-cardano-blue) text-white border-0 mb-3">
                {coldType}
              </Badge>
            {/if}
            {#if coldHash}
              <ItemContainer>
                <div class="flex items-center justify-between gap-2">
                  <p class="text-sm leading-5 wrap-break-word">
                    {shortenString(coldHash, 20, true)}
                  </p>
                  <button
                    type="button"
                    class="shrink-0 inline-flex items-center justify-center rounded border p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Copy cold credential hash"
                    aria-label="Copy cold credential hash"
                    onclick={() => copyToClipboard("Cold credential hash", coldHash)}
                  >
                    <CopyIcon class="size-3.5" aria-hidden="true" />
                  </button>
                </div>
              </ItemContainer>
            {/if}
          </CollapsibleCard>
        {:else}
          <div class="space-y-2">
            {#each section.fields as field (field.id)}
              <CollapsibleCard
                expanded={isExpanded(field.id)}
                onToggle={() => toggleSection(field.id)}
                expandLabel={`Expand ${toText(field.question).toLowerCase()}`}
                collapseLabel={`Collapse ${toText(field.question).toLowerCase()}`}
                titleClass="text-lg font-medium leading-6"
                titleHeadingLevel={3}
              >
                {#snippet title()}
                  {field.question}
                {/snippet}
                <ItemContainer>
                  {#if field.markdown === false}
                    <p class="text-sm leading-5">{toText(field.value)}</p>
                  {:else}
                    <Markdown content={toText(field.value)} class="text-sm leading-5" />
                  {/if}
                </ItemContainer>
              </CollapsibleCard>
            {/each}
          </div>
        {/if}
      </section>
    {/each}
  </div>
{/if}
