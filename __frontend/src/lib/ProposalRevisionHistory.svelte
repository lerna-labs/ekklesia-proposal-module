<script>
  import * as Sheet from "$lib/components/ui/sheet";
  import * as Button from "$lib/components/ui/button";
  import { api } from "$stores/sessionManager.js";
  import { getChangedSectionLabels } from "$lib/proposalRevisionUtils.js";
  import { sectionMapping as budget2026SectionMapping, sectionOrder as budget2026SectionOrder } from "$lib/forms/budget2026/revisionSectionMapping.js";
  import HistoryIcon from "@lucide/svelte/icons/history";
  import FileTextIcon from "@lucide/svelte/icons/file-text";
  import ClockIcon from "@lucide/svelte/icons/clock";

  let { proposal, vote, pillars = [], open = $bindable(false) } = $props();

  /** Versions from the proposal prop (e.g. when opened from proposal detail page). */
  const propVersions = $derived(
    Array.isArray(proposal?.versions) && proposal.versions.length > 0
      ? [...proposal.versions].sort(
          (a, b) =>
            new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0),
        )
      : [],
  );

  const voteSlug = $derived(vote?.slug ?? "");
  const proposalId = $derived(proposal?._id ?? proposal?.id ?? null);
  const hasVersionInfo = $derived((proposal?.version ?? 1) > 1);

  let archivedDocs = $state([]);
  let loading = $state(false);
  /** When opened from list, proposal may not include versions; we fetch full proposal and store its versions here. */
  let fetchedVersions = $state([]);

  $effect(() => {
    if (!open) {
      archivedDocs = [];
      fetchedVersions = [];
    }
  });

  /** Effective list of version entries to use (from prop or from fetched full proposal). */
  const versions = $derived(
    propVersions.length > 0 ? propVersions : fetchedVersions,
  );

  async function fetchFullProposalIfNeeded() {
    if (!proposalId || !hasVersionInfo || propVersions.length > 0) return;
    loading = true;
    try {
      const res = await api.fetch(fetch, `/proposals/${proposalId}`);
      if (!res.ok) return;
      const full = await res.json();
      const raw = full?.versions ?? [];
      fetchedVersions = raw.length > 0
        ? [...raw].sort(
            (a, b) =>
              new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0),
          )
        : [];
    } finally {
      loading = false;
    }
  }

  async function loadArchivedVersions() {
    if (versions.length === 0) return;
    loading = true;
    archivedDocs = [];
    try {
      const results = await Promise.all(
        versions.map((v) =>
          api.fetch(fetch, `/proposals/${v._id}`).then(async (res) => {
            if (!res.ok) return null;
            return res.json();
          }),
        ),
      );
      archivedDocs = results.filter(Boolean);
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    if (!open) return;
    if (propVersions.length > 0) {
      if (archivedDocs.length === 0 && !loading) loadArchivedVersions();
      return;
    }
    if (hasVersionInfo && proposalId && fetchedVersions.length === 0 && !loading) {
      loading = true;
      fetchFullProposalIfNeeded();
      return;
    }
    if (fetchedVersions.length > 0 && archivedDocs.length === 0 && !loading) {
      loadArchivedVersions();
    }
  });

  const currentVersion = $derived(proposal?.version ?? 1);

  /** Changes in the current version compared to the previous one (when there are prior versions). */
  const currentVersionChangedLabels = $derived.by(() => {
    if (!proposal || archivedDocs.length === 0) return [];
    const previousVersion = archivedDocs[0];
    return getChangedSectionLabels(proposal, previousVersion, revisionOptions);
  });

  const revisionOptions = $derived(
    vote?.form === "budget2026"
      ? { sectionMapping: budget2026SectionMapping, sectionOrder: budget2026SectionOrder }
      : {},
  );

  /** For each version entry: { versionNumber, createdAt, changedLabels } (changes in this version vs the previous one; v1 has none). */
  const versionEntries = $derived.by(() => {
    if (!proposal || archivedDocs.length === 0) return [];
    const entries = [];
    for (let i = 0; i < versions.length; i++) {
      const ver = versions[i];
      const archived = archivedDocs[i];
      const previousVersion = i + 1 < archivedDocs.length ? archivedDocs[i + 1] : null;
      const changedLabels =
        archived && previousVersion
          ? getChangedSectionLabels(archived, previousVersion, revisionOptions)
          : [];
      const versionNumber = currentVersion - 1 - i;
      entries.push({
        _id: ver._id,
        versionNumber,
        createdAt: ver.createdAt,
        changedLabels,
      });
    }
    return entries;
  });

  function formatTimestamp(d) {
    if (!d) return "";
    return new Date(d).toLocaleString(undefined, {
      dateStyle: "long",
      timeStyle: "short",
    });
  }
</script>

<Sheet.Root bind:open>
  <Sheet.Content side="right" class="w-full sm:max-w-md flex flex-col p-0 gap-0">
    <Sheet.Header class="p-4 border-b">
      <Sheet.Title class="flex items-center gap-2">
        <HistoryIcon class="size-4" aria-hidden="true" />
        Revision history
      </Sheet.Title>
      <Sheet.Description class="sr-only">
        List of previous versions with timestamps and changed sections.
      </Sheet.Description>
    </Sheet.Header>
    <div class="flex-1 overflow-y-auto p-4 space-y-4">
      <!-- Current version (reference) -->
      <div class="rounded-lg border bg-muted/30 p-3 pb-4 pl-4">
        <div class="flex items-center justify-between gap-2">
          <span class="text-sm font-medium">Version {currentVersion} (current)</span>
          <Button.Root
            href={voteSlug && proposalId ? `/votes/${voteSlug}/${proposalId}` : undefined}
            target="_blank"
            rel="noopener noreferrer"
            variant="outline"
            size="sm"
            aria-label="View current version in new tab"
          >
            <FileTextIcon class="size-3.5 mr-1" aria-hidden="true" />
            View
          </Button.Root>
        </div>
        {#if currentVersionChangedLabels.length > 0}
          <div class="pt-1">
            <span class="text-xs font-medium text-muted-foreground">Changed from v{currentVersion - 1}:</span>
            <ul class="text-xs text-muted-foreground list-disc list-inside mt-0.5 space-y-0.5 pl-3">
              {#each currentVersionChangedLabels as label}
                <li>{label}</li>
              {/each}
            </ul>
          </div>
        {/if}
      </div>

      {#if versions.length === 0}
        <p class="text-sm text-muted-foreground">No previous versions.</p>
      {:else if loading}
        <p class="text-sm text-muted-foreground">Loading versions…</p>
      {:else}
        {#each versionEntries as entry (entry._id)}
          <div class="rounded-lg border p-3 pb-4 pl-4 space-y-2">
            <div class="flex items-center justify-between gap-2">
              <span class="text-sm font-medium">Version {entry.versionNumber}</span>
              <Button.Root
                href={voteSlug ? `/votes/${voteSlug}/${entry._id}` : undefined}
                target="_blank"
                rel="noopener noreferrer"
                variant="outline"
                size="sm"
                aria-label="View version {entry.versionNumber} in new tab"
              >
                <FileTextIcon class="size-3.5 mr-1" aria-hidden="true" />
                View
              </Button.Root>
            </div>
            <div class="flex items-center gap-1 text-xs text-muted-foreground">
              <ClockIcon
                class="size-3.5 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              {formatTimestamp(entry.createdAt)}
            </div>
            {#if entry.changedLabels.length > 0}
              <div class="pt-1">
                <span class="text-xs font-medium text-muted-foreground">Changed:</span>
                <ul class="text-xs text-muted-foreground list-disc list-inside mt-0.5 space-y-0.5 pl-3">
                  {#each entry.changedLabels as label}
                    <li>{label}</li>
                  {/each}
                </ul>
              </div>
            {/if}
          </div>
        {/each}
      {/if}
    </div>
  </Sheet.Content>
</Sheet.Root>
