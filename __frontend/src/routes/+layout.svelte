<script>
  import Header from "$lib/base/Header.svelte";
  import Footer from "$lib/base/Footer.svelte";
  import "./layout.css";
  import { Toaster } from "$lib/components/ui/sonner/index.js";

  let { children } = $props();
</script>

<Toaster />
<Header />
{@render children()}
<Footer />
