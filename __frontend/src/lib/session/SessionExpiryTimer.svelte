<script>
  import { onMount } from "svelte";
  import { fly } from "svelte/transition";
  import {
    loggedIn,
    sessionExpiresAt,
    sessionExpiryBannerVisible,
    expireSession,
  } from "$stores/sessionManager.js";

  let { warningSeconds = 5 * 60 } = $props();
  let now = $state(Date.now());
  let tick;

  const remainingMs = $derived($sessionExpiresAt ? Math.max(0, $sessionExpiresAt - now) : 0);
  const remainingSeconds = $derived(Math.floor(remainingMs / 1000));
  const shouldShow = $derived(
    Boolean(
      $loggedIn && $sessionExpiresAt && remainingMs > 0 && remainingSeconds <= warningSeconds,
    ),
  );
  const isWarning = $derived(remainingSeconds <= warningSeconds);

  const countdownLabel = $derived.by(() => {
    const secs = remainingSeconds;
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    const seconds = secs % 60;
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  });

  onMount(() => {
    tick = setInterval(() => {
      now = Date.now();
    }, 1000);
    return () => clearInterval(tick);
  });

  let didExpire = $state(false);
  $effect(() => {
    sessionExpiryBannerVisible.set(shouldShow);
  });

  $effect(() => {
    if (!$loggedIn) {
      didExpire = false;
      return;
    }
    if (!didExpire && $sessionExpiresAt && remainingMs === 0) {
      didExpire = true;
      expireSession();
    }
  });
</script>

{#if shouldShow}
  <div
    in:fly={{ y: -16, duration: 220 }}
    out:fly={{ y: -16, duration: 180 }}
    class={`pointer-events-none w-full px-2 py-1 text-center text-[10px] sm:text-xs ${
      isWarning ? "bg-destructive text-white" : "bg-secondary text-secondary-foreground"
    }`}
    title="Session time remaining"
  >
    Your Session is about to expire in {countdownLabel}
  </div>
{/if}
