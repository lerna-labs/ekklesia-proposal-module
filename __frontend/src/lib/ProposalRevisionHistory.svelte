<script>
  import * as Sheet from "$lib/components/ui/sheet";
  import { Button } from "$lib/components/ui/button";
  import { api } from "$stores/sessionManager.js";
  import { getChangedSectionLabels, getChangedDetails } from "$lib/proposalRevisionUtils.js";
  import { sectionMapping as budget2026SectionMapping, sectionOrder as budget2026SectionOrder } from "$lib/forms/budget2026/revisionSectionMapping.js";
  import HistoryIcon from "@lucide/svelte/icons/history";
  import FileTextIcon from "@lucide/svelte/icons/file-text";
  import ClockIcon from "@lucide/svelte/icons/clock";

  let { proposal, vote, open = $bindable(false) } = $props();

  const voteSlug = $derived(vote?.slug ?? "");
  const proposalId = $derived(proposal?._id ?? proposal?.id ?? null);
  const currentVersion = $derived(proposal?.version ?? 1);

  /** Versions from proposal (list endpoint now returns versions). Sorted by createdAt desc. */
  const versions = $derived(
    Array.isArray(proposal?.versions) && proposal.versions.length > 0
      ? [...proposal.versions].sort(
          (a, b) =>
            new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0),
        )
      : [],
  );

  const revisionOptions = $derived(
    vote?.form === "budget2026"
      ? { sectionMapping: budget2026SectionMapping, sectionOrder: budget2026SectionOrder }
      : {},
  );

  let fullCurrentProposal = $state(null);
  let cachedArchivedDocs = $state(new Map());
  let firstArchivedDoc = $state(null);
  let loadingCurrent = $state(false);
  let expandedVersionId = $state(null);
  let expandedEntryChanges = $state(/** @type {{ labels: string[], details: Array<{ path: string, type: string, value?: unknown, oldValue?: unknown }>, isFirstVersion?: boolean } | null */ (null));
  let loadingExpanded = $state(false);

  $effect(() => {
    if (!open) {
      fullCurrentProposal = null;
      cachedArchivedDocs = new Map();
      firstArchivedDoc = null;
      expandedVersionId = null;
      expandedEntryChanges = null;
    }
  });

  /** Fetch full current proposal when drawer is open and we need it for the current-vs-previous diff. */
  async function ensureFullCurrentProposal() {
    if (!proposalId || !open || versions.length === 0 || fullCurrentProposal != null) return;
    loadingCurrent = true;
    try {
      const res = await api.fetch(fetch, `/proposals/${proposalId}`);
      if (!res.ok) return;
      const full = await res.json();
      if (open && (proposal?._id ?? proposal?.id) === proposalId) {
        fullCurrentProposal = full;
      }
    } finally {
      if (open && (proposal?._id ?? proposal?.id) === proposalId) {
        loadingCurrent = false;
      }
    }
  }

  /** Return archived doc from cache or fetch and cache. Guard: only update cache if still open and same proposal context. */
  async function ensureArchivedDoc(id) {
    const key = String(id);
    const cached = cachedArchivedDocs.get(key);
    if (cached) return cached;
    const res = await api.fetch(fetch, `/proposals/${id}`);
    if (!res.ok) return null;
    const doc = await res.json();
    if (open) {
      cachedArchivedDocs = new Map(cachedArchivedDocs);
      cachedArchivedDocs.set(key, doc);
    }
    return doc;
  }

  /** Fetch first (most recent) archived doc for current-vs-previous diff. */
  async function ensureFirstArchivedDoc() {
    if (!open || versions.length === 0) return;
    const id = versions[0]._id;
    if (firstArchivedDoc != null && (firstArchivedDoc._id ?? firstArchivedDoc.id) === id) return;
    loadingCurrent = true;
    try {
      const doc = await ensureArchivedDoc(id);
      if (open && doc && (proposal?._id ?? proposal?.id) === proposalId) {
        firstArchivedDoc = doc;
      }
    } finally {
      if (open && (proposal?._id ?? proposal?.id) === proposalId) {
        loadingCurrent = false;
      }
    }
  }

  $effect(() => {
    if (!open || versions.length === 0) return;
    ensureFullCurrentProposal();
    ensureFirstArchivedDoc();
  });

  const effectiveCurrentProposal = $derived(fullCurrentProposal ?? proposal);

  const currentVersionChangedLabels = $derived.by(() => {
    if (!effectiveCurrentProposal || !firstArchivedDoc) return [];
    return getChangedSectionLabels(effectiveCurrentProposal, firstArchivedDoc, revisionOptions);
  });

  const currentVersionChangedDetails = $derived.by(() => {
    if (!effectiveCurrentProposal || !firstArchivedDoc) return [];
    return getChangedDetails(effectiveCurrentProposal, firstArchivedDoc);
  });

  /** Version entries from versions array only (no precomputed changes). */
  const versionEntries = $derived.by(() => {
    if (!proposal) return [];
    return versions.map((ver, i) => ({
      _id: ver._id,
      versionNumber: currentVersion - 1 - i,
      createdAt: ver.createdAt,
      index: i,
    }));
  });

  async function loadAndCompare(entry) {
    const i = entry.index;
    expandedVersionId = entry._id;
    expandedEntryChanges = null;
    if (i + 1 >= versions.length) {
      expandedEntryChanges = { labels: [], details: [], isFirstVersion: true };
      return;
    }
    loadingExpanded = true;
    try {
      const [archived, previous] = await Promise.all([
        ensureArchivedDoc(versions[i]._id),
        ensureArchivedDoc(versions[i + 1]._id),
      ]);
      if (!open || expandedVersionId !== entry._id) return;
      if (archived && previous) {
        expandedEntryChanges = {
          labels: getChangedSectionLabels(archived, previous, revisionOptions),
          details: getChangedDetails(archived, previous),
        };
      } else {
        expandedEntryChanges = { labels: [], details: [] };
      }
    } finally {
      if (open && expandedVersionId === entry._id) {
        loadingExpanded = false;
      }
    }
  }

  function formatTimestamp(d) {
    if (!d) return "";
    return new Date(d).toLocaleString(undefined, {
      dateStyle: "long",
      timeStyle: "short",
    });
  }

  function formatChangeValue(v) {
    if (v === undefined) return "undefined";
    if (v === null) return "null";
    if (typeof v === "object") return JSON.stringify(v).slice(0, 80) + (JSON.stringify(v).length > 80 ? "…" : "");
    return String(v);
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
          <Button
            href={voteSlug && proposalId ? `/votes/${voteSlug}/${proposalId}` : undefined}
            target="_blank"
            rel="noopener noreferrer"
            variant="outline"
            size="sm"
            aria-label="View current version in new tab"
          >
            <FileTextIcon class="size-3.5 mr-1" aria-hidden="true" />
            View
          </Button>
        </div>
        {#if versions.length > 0 && !firstArchivedDoc && loadingCurrent}
          <p class="text-xs text-muted-foreground pt-1">Loading changes…</p>
        {:else if firstArchivedDoc}
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
          {#if currentVersionChangedDetails.length > 0}
            <div class="pt-2 mt-2 border-t border-border">
              <span class="text-xs font-medium text-muted-foreground">Exact changes (temp):</span>
              <ul class="text-xs text-muted-foreground mt-1 space-y-1 pl-0 list-none font-mono break-all">
                {#each currentVersionChangedDetails as d}
                  <li class="rounded bg-muted/50 px-1.5 py-0.5">
                    <span class="text-foreground">{d.path}</span>
                    <span class="text-muted-foreground"> [{d.type}]</span>
                    {#if d.type === "UPDATE"}
                      <span class="block text-muted-foreground mt-0.5">{formatChangeValue(d.oldValue)} → {formatChangeValue(d.value)}</span>
                    {:else if d.type === "ADD"}
                      <span class="block text-muted-foreground mt-0.5">+ {formatChangeValue(d.value)}</span>
                    {:else if d.type === "REMOVE"}
                      <span class="block text-muted-foreground mt-0.5">− {formatChangeValue(d.oldValue)}</span>
                    {/if}
                  </li>
                {/each}
              </ul>
            </div>
          {/if}
        {/if}
      </div>

      {#if versions.length === 0}
        <p class="text-sm text-muted-foreground">No previous versions.</p>
      {:else}
        {#each versionEntries as entry (entry._id)}
          <div class="rounded-lg border p-3 pb-4 pl-4 space-y-2">
            <div class="flex items-center justify-between gap-2">
              <span class="text-sm font-medium">Version {entry.versionNumber}</span>
              <Button
                href={voteSlug ? `/votes/${voteSlug}/${entry._id}` : undefined}
                target="_blank"
                rel="noopener noreferrer"
                variant="outline"
                size="sm"
                aria-label="View version {entry.versionNumber} in new tab"
              >
                <FileTextIcon class="size-3.5 mr-1" aria-hidden="true" />
                View
              </Button>
            </div>
            <div class="flex items-center gap-1 text-xs text-muted-foreground">
              <ClockIcon
                class="size-3.5 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              {formatTimestamp(entry.createdAt)}
            </div>
            {#if entry.index + 1 < versions.length}
              <Button
                variant="ghost"
                size="sm"
                class="h-8 text-xs"
                onclick={() => loadAndCompare(entry)}
                disabled={loadingExpanded && expandedVersionId === entry._id}
                aria-label="Load and compare version {entry.versionNumber}"
              >
                {loadingExpanded && expandedVersionId === entry._id ? "Loading…" : "Load and compare"}
              </Button>
            {:else}
              <span class="text-xs text-muted-foreground">First version</span>
            {/if}
            {#if expandedVersionId === entry._id && expandedEntryChanges !== null}
              {#if expandedEntryChanges.isFirstVersion}
                <p class="text-xs text-muted-foreground">First version (no previous to compare).</p>
              {:else}
                {#if expandedEntryChanges.labels.length > 0}
                  <div class="pt-1">
                    <span class="text-xs font-medium text-muted-foreground">Changed:</span>
                    <ul class="text-xs text-muted-foreground list-disc list-inside mt-0.5 space-y-0.5 pl-3">
                      {#each expandedEntryChanges.labels as label}
                        <li>{label}</li>
                      {/each}
                    </ul>
                  </div>
                {/if}
                {#if expandedEntryChanges.details.length > 0}
                  <div class="pt-2 mt-2 border-t border-border">
                    <span class="text-xs font-medium text-muted-foreground">Exact changes (temp):</span>
                    <ul class="text-xs text-muted-foreground mt-1 space-y-1 pl-0 list-none font-mono break-all">
                      {#each expandedEntryChanges.details as d}
                        <li class="rounded bg-muted/50 px-1.5 py-0.5">
                          <span class="text-foreground">{d.path}</span>
                          <span class="text-muted-foreground"> [{d.type}]</span>
                          {#if d.type === "UPDATE"}
                            <span class="block text-muted-foreground mt-0.5">{formatChangeValue(d.oldValue)} → {formatChangeValue(d.value)}</span>
                          {:else if d.type === "ADD"}
                            <span class="block text-muted-foreground mt-0.5">+ {formatChangeValue(d.value)}</span>
                          {:else if d.type === "REMOVE"}
                            <span class="block text-muted-foreground mt-0.5">− {formatChangeValue(d.oldValue)}</span>
                          {/if}
                        </li>
                      {/each}
                    </ul>
                  </div>
                {/if}
              {/if}
            {/if}
          </div>
        {/each}
      {/if}
    </div>
  </Sheet.Content>
</Sheet.Root>
