<script>
  import * as Popover from "$lib/components/ui/popover";
  import { formatUtcInstant } from "$lib/formatUtc.js";

  let { value = null, class: className = "" } = $props();

  let now = $state(new Date());

  $effect(() => {
    const d = value ? new Date(value) : null;
    if (!d || isNaN(d.getTime())) return;
    const diffMin = Math.floor((Date.now() - d.getTime()) / 60_000);
    if (diffMin < 60) {
      const id = setInterval(() => (now = new Date()), 60_000);
      return () => clearInterval(id);
    }
  });

  function formatRelative(date) {
    if (!date || isNaN(date.getTime())) return "—";
    const d = date;
    const n = now;
    const diffMs = n.getTime() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);

    if (diffSec < 60) return "Just now";
    if (diffMin < 60) return diffMin === 1 ? "1 minute ago" : `${diffMin} minutes ago`;
    const sameDay =
      d.getUTCDate() === n.getUTCDate() &&
      d.getUTCMonth() === n.getUTCMonth() &&
      d.getUTCFullYear() === n.getUTCFullYear();
    if (sameDay) return "Today";
    const yesterdayUtc = new Date(n.getTime());
    yesterdayUtc.setUTCDate(yesterdayUtc.getUTCDate() - 1);
    if (
      d.getUTCDate() === yesterdayUtc.getUTCDate() &&
      d.getUTCMonth() === yesterdayUtc.getUTCMonth() &&
      d.getUTCFullYear() === yesterdayUtc.getUTCFullYear()
    ) {
      return "Yesterday";
    }
    return formatUtcInstant(d, {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  function formatExact(date) {
    if (!date || isNaN(date.getTime())) return "—";
    return formatUtcInstant(date, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  const date = $derived(value ? new Date(value) : null);
  const relative = $derived(formatRelative(date));
  const exact = $derived(formatExact(date));
</script>

{#if date}
  <Popover.Root>
    <Popover.Trigger
      class="border-muted-foreground/50 hover:border-muted-foreground font-inherit inline-block min-w-0 cursor-help border-b border-dotted bg-transparent p-0 text-left text-inherit {className}"
    >
      {relative}
    </Popover.Trigger>
    <Popover.Content align="start" class="w-auto p-2 text-xs">
      {exact}
    </Popover.Content>
  </Popover.Root>
{:else}
  <span class={className}>—</span>
{/if}
