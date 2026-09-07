<script>
  import * as Dialog from "$lib/components/ui/dialog";
  import * as Card from "$lib/components/ui/card";
  import { Button, buttonVariants } from "$lib/components/ui/button";
  import { formatUtcFullDateTime } from "$lib/formatUtc.js";
  import CheckIcon from "@lucide/svelte/icons/check";
  import ExternalLinkIcon from "@lucide/svelte/icons/external-link";

  let props = $props();

  let dialogOpen = $state(false);

  let phases = $derived.by(() => props.phases ?? []);

  /** Current instant for timeline state: `testNow` when set (ISO string or ms), else wall clock. */
  let effectiveNowMs = $derived.by(() => {
    const tn = props.testNow;
    if (tn !== undefined && tn !== null && tn !== "") {
      const ms = typeof tn === "number" ? tn : new Date(tn).getTime();
      if (!Number.isNaN(ms)) return ms;
    }
    return Date.now();
  });

  /** @param {string | number | null | undefined} v */
  function toMs(v) {
    if (v == null || v === "") return NaN;
    return typeof v === "number" ? v : new Date(v).getTime();
  }

  /**
   * Linear progress through phase window [t0Ms, t1Ms] at nowMs, as 0–100.
   * @param {number} t0Ms
   * @param {number} t1Ms
   * @param {number} nowMs
   */
  function phaseElapsedPercent(t0Ms, t1Ms, nowMs) {
    if (!Number.isFinite(t0Ms) || !Number.isFinite(t1Ms) || t1Ms <= t0Ms) return 0;
    if (nowMs <= t0Ms) return 0;
    if (nowMs >= t1Ms) return 100;
    const p = ((nowMs - t0Ms) / (t1Ms - t0Ms)) * 100;
    return Math.min(100, Math.max(0, p));
  }

  /** Whether phase has a usable end instant (omit "to" row in UI when false). */
  function phaseHasEnd(phase) {
    const e = toMs(phase?.end);
    return Number.isFinite(e);
  }

  /** Index of the phase that contains `effectiveNowMs`, or `null`. */
  let activePhaseIndex = $derived.by(() => {
    const now = effectiveNowMs;
    const list = phases;
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      const s = toMs(p.start);
      const e = toMs(p.end);
      if (Number.isNaN(s)) continue;
      if (!Number.isFinite(e)) {
        if (now >= s) return i;
        continue;
      }
      if (now >= s && now <= e) return i;
    }
    return null;
  });

  /** First phase whose `start` is after `effectiveNowMs`, or `null` if none. */
  let upcomingPhaseIndex = $derived.by(() => {
    const now = effectiveNowMs;
    const list = phases;
    for (let i = 0; i < list.length; i++) {
      const s = toMs(list[i].start);
      if (!Number.isNaN(s) && now < s) return i;
    }
    return null;
  });

  let cardPhaseIndex = $derived.by(() => {
    const list = phases;
    const len = list.length;
    if (len === 0) return null;
    if (activePhaseIndex !== null) return activePhaseIndex;
    if (upcomingPhaseIndex !== null) return upcomingPhaseIndex;
    return len - 1;
  });

  let cardTitlePrefix = $derived.by(() =>
    activePhaseIndex !== null ? "" : upcomingPhaseIndex !== null ? "Upcoming: " : "",
  );
</script>

{#snippet phaseTimelineRow(phase, i, phaseCount, titlePrefix)}
  {@const startMs = toMs(phase.start)}
  {@const endMs = toMs(phase.end)}
  {@const hasEnd = phaseHasEnd(phase)}
  {@const timelineState = Number.isNaN(startMs)
    ? "upcoming"
    : !hasEnd
      ? effectiveNowMs >= startMs
        ? "active"
        : "upcoming"
      : effectiveNowMs > endMs
        ? "finished"
        : effectiveNowMs >= startMs
          ? "active"
          : "upcoming"}
  <div class="grid grid-cols-[auto_minmax(0,1fr)] items-stretch gap-x-3">
    <div class="flex min-h-0 flex-col items-center">
      {#if timelineState === "active"}
        <div
          class="bg-background box-border flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-(--mbo-electric-blue)"
          aria-hidden="true"
        >
          <span class="size-3 shrink-0 animate-pulse rounded-full bg-(--mbo-electric-blue)"></span>
        </div>
      {:else if timelineState === "finished"}
        <div
          class="flex size-5 shrink-0 items-center justify-center rounded-full bg-(--mbo-electric-blue) text-white"
          aria-hidden="true"
        >
          <CheckIcon class="size-3" strokeWidth={2} />
        </div>
      {:else}
        <div
          class="border-border bg-background box-border flex size-5 shrink-0 items-center justify-center rounded-full border-2"
          aria-hidden="true"
        ></div>
      {/if}
      {#if i < phaseCount - 1}
        {@const railProgressPct = hasEnd ? phaseElapsedPercent(startMs, endMs, effectiveNowMs) : 0}
        <div
          class="pointer-events-none relative my-1 min-h-4 w-0.5 flex-1 shrink-0 overflow-hidden rounded-full"
          aria-hidden="true"
        >
          <div class="bg-border absolute inset-0"></div>
          <div
            class="absolute top-0 left-0 w-full bg-(--mbo-electric-blue)"
            style:height="{railProgressPct}%"
          ></div>
        </div>
      {/if}
    </div>
    <div class="w-full space-y-1.5 pt-0.5 pb-6">
      <div
        class="mb-0 text-sm font-medium {timelineState === 'upcoming'
          ? 'text-muted-foreground'
          : 'text-(--mbo-electric-blue)'}"
      >
        {titlePrefix}{phase.title}
      </div>
      <p class="m-0 mt-1 text-xs leading-relaxed">
        <span class="text-muted-foreground font-medium italic">from</span>
        <span
          class="font-medium {timelineState === 'upcoming'
            ? 'text-muted-foreground'
            : 'text-foreground'}"
        >
          {formatUtcFullDateTime(phase.start)}
        </span>
      </p>
      {#if hasEnd}
        <p class="m-0 mt-0.5 text-xs leading-relaxed">
          <span class="text-muted-foreground font-medium italic">to</span>
          <span
            class="font-medium {timelineState === 'upcoming'
              ? 'text-muted-foreground'
              : 'text-foreground'}"
          >
            {formatUtcFullDateTime(phase.end)}
          </span>
        </p>
      {/if}
      {#if phase.link && (timelineState === "active" || timelineState === "finished")}
        <div class="pt-2">
          <Button
            href={phase.link.href}
            target="_blank"
            rel="noopener noreferrer"
            size="sm"
            class="w-fit border border-(--mbo-electric-blue) bg-(--mbo-electric-blue) text-xs text-white hover:border-(--mbo-cardano-blue) hover:bg-(--mbo-cardano-blue)"
          >
            {phase.link.label}
            <ExternalLinkIcon class="size-3" aria-hidden="true" />
          </Button>
        </div>
      {/if}
    </div>
  </div>
{/snippet}

<Card.Root class="h-full min-h-0 min-w-0 gap-3">
  <Card.Header class="pb-0">
    <Card.Title>Timeline</Card.Title>
  </Card.Header>
  <Card.Content class="flex w-full min-w-0 flex-col items-stretch pt-0! text-left text-xs">
    {#if cardPhaseIndex !== null}
      {@render phaseTimelineRow(
        phases[cardPhaseIndex],
        cardPhaseIndex,
        phases.length,
        cardTitlePrefix,
      )}
    {:else}
      <p class="text-muted-foreground m-0 text-xs">No phases to show.</p>
    {/if}
  </Card.Content>
  <Card.Footer>
    <Button
      type="button"
      variant="outline"
      size="sm"
      class="w-full text-xs"
      onclick={() => (dialogOpen = true)}
    >
      See all steps & Key Dates
    </Button>
  </Card.Footer>
</Card.Root>

<Dialog.Root bind:open={dialogOpen}>
  <Dialog.Content class="flex max-h-[85vh] flex-col gap-4 overflow-hidden sm:max-w-lg">
    <Dialog.Header class="pb-[12px]">
      <Dialog.Title>Timeline</Dialog.Title>
      <Dialog.Description>Full list of phases and dates in UTC.</Dialog.Description>
    </Dialog.Header>

    <div class="min-h-0 flex-1 overflow-y-auto pr-1">
      {#each phases as phase, i}
        {@render phaseTimelineRow(phase, i, phases.length, "")}
      {/each}
    </div>

    <Dialog.Footer class="gap-2">
      <Dialog.Close type="button" class={buttonVariants({ variant: "outline" })}>
        Close
      </Dialog.Close>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
