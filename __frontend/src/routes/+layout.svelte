<script>
  import "$lib/css/layout.css";
  import Header from "$lib/base/Header.svelte";
  import Footer from "$lib/base/Footer.svelte";
  import { Toaster } from "$lib/components/ui/sonner/index.js";
  import VersionCheck from "$lib/base/VersionCheck.svelte";
  import SessionExpiryTimer from "$lib/session/SessionExpiryTimer.svelte";

  let { children } = $props();
  const maintenanceModeEnabled = import.meta.env.VITE_MAINTENANCE_MODE === "true";
</script>

<Toaster />
<VersionCheck />
<div class="fixed top-0 left-0 right-0 z-50">
  <SessionExpiryTimer />
</div>
<div class="min-h-dvh flex flex-col">
  {#if maintenanceModeEnabled}
    <div class="bg-orange-500 px-4 py-2 text-center text-sm font-medium text-white">
      Ongoing Maintenance until 20:00 UTC. You may experience intermittent issues. Please check back later.
    </div>
  {/if}
  <Header />
  <main class="flex-1 flex flex-col">
    {@render children()}
  </main>
  <Footer />
</div>
