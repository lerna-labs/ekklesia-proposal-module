<script>
  import Logo from "$lib/base/Logo.svelte";
</script>

<footer class="bg-(--mbo-tangy-blue) text-white">
  <div class="container mx-auto max-w-4xl py-8 px-4">
    <div class="space-y-2">
      <Logo />
      <div class="text-xs">&copy; 2026. Intersect. All Rights Reserved.</div>
    </div>
    <div class=" text-xs mt-4">
      <ul class="flex items-center gap-2">
        <li>
          <a
            href="https://docs.intersectmbo.org/legal/policies-and-conditions/cookie-policy"
            class="underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Cookie Policy
          </a>
        </li>
        <li>
          <a
            href="https://docs.intersectmbo.org/legal/policies-and-conditions/privacy-policy"
            class="underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Privacy Policy
          </a>
        </li>
        <li>
          <a
            href="https://docs.intersectmbo.org/legal/policies-and-conditions/terms-of-use"
            class="underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Terms of Use
          </a>
        </li>
      </ul>
    </div>
  </div>
</footer>
