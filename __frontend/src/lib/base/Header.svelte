<script>
  import { api, user, loggedIn } from "$stores/sessionManager.js";
  import Button from "$lib/components/ui/button/button.svelte";
  import WalletSigner from "$lib/WalletSigner/WalletSigner.svelte";
  import { User } from "lucide-svelte";
  import { shortenString } from "$lib/utils.js";
  import Logo from "$lib/base/Logo.svelte";
</script>

<header class="bg-(--mbo-tangy-blue) text-white">
  <div
    class="container mx-auto max-w-4xl py-4 px-4 flex justify-between items-center"
  >
    <a href="/">
      <Logo />
    </a>
    <nav>
      <ul class="flex items-center gap-2">
        <li>
          <Button
            href="/votes/test-budget-2026"
            variant="outline"
            size="sm"
            class="text-xs text-black"
          >
            <span class="hidden sm:block">View Proposals</span>
            <span class="block sm:hidden">Proposals</span>
          </Button>
        </li>
        <li>
          {#if !$loggedIn}
            <WalletSigner mode="login" dark={true} />
          {:else}
            <Button
              href="/dashboard"
              size="sm"
              class="bg-white text-black hover:bg-gray-200 text-xs"
            >
              <User />
              <div class="hidden sm:block">
                {shortenString($user?.userId, 10, true)}
              </div>

              <div class="block sm:hidden">
                ...{($user?.userId).slice(-3)}
              </div>
            </Button>
          {/if}
        </li>
      </ul>
    </nav>
  </div>
</header>
