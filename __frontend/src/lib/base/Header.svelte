<script>
  import Navigation from "$lib/base/Navigation.svelte";
</script>

<header class="relative bg-(--mbo-tangy-blue) text-white">
  <div class="h-8 bg-(--mbo-tangy-blue)"></div>
  <div class="container mx-auto flex max-w-4xl items-end justify-between px-4 pt-0 pb-4">
    <a href="/" title="Home">
      <img
        src="/images/logo.svg"
        alt="Intersect Logo"
        width="136"
        height="52"
        class="h-12 w-auto sm:h-18"
      />
    </a>
    <Navigation />
  </div>
</header>
