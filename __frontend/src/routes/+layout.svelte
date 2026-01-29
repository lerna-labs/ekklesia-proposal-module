<script>
  import Header from "$lib/base/Header.svelte";
  import Footer from "$lib/base/Footer.svelte";
  import "./layout.css";
  import favicon from "$lib/assets/favicon.svg";

  let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<Header />
{@render children()}
<Footer />
