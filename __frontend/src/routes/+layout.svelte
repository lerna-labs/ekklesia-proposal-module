<script>
  import "$lib/css/layout.css";
  import Header from "$lib/base/Header.svelte";
  import Footer from "$lib/base/Footer.svelte";
  import { Toaster } from "$lib/components/ui/sonner/index.js";
  import VersionCheck from "$lib/base/VersionCheck.svelte";

  let { children } = $props();
</script>

<Toaster />
<VersionCheck />
<Header />
{@render children()}
<Footer />
