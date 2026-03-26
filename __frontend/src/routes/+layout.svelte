<script>
  import "$lib/css/layout.css";
  import Header from "$lib/base/Header.svelte";
  import Footer from "$lib/base/Footer.svelte";
  import { Toaster } from "$lib/components/ui/sonner/index.js";
  import VersionCheck from "$lib/base/VersionCheck.svelte";
  import SessionExpiryTimer from "$lib/session/SessionExpiryTimer.svelte";

  let { children } = $props();
</script>

<Toaster />
<VersionCheck />
<div class="fixed top-0 left-0 right-0 z-50">
  <SessionExpiryTimer />
</div>
<div class="min-h-dvh flex flex-col">
  <Header />
  <main class="flex-1 flex flex-col">
    {@render children()}
  </main>
  <Footer />
</div>
