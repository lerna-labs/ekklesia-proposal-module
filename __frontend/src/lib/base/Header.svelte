<script>
  import { api, user, loggedIn, logout } from "$stores/sessionManager.js";
  import Button from "$lib/components/ui/button/button.svelte";
  import WalletSigner from "$lib/WalletSigner/WalletSigner.svelte";
  import { User, LogOut, FileText } from "lucide-svelte";
  import { shortenString } from "$lib/utils.js";
</script>

<header class="relative bg-(--mbo-tangy-blue) text-white">
  <div class="h-8 bg-(--mbo-tangy-blue)"></div>
  <div
    class="container mx-auto max-w-4xl pt-0 pb-4 px-4 flex justify-between items-end"
  >
    <a href="/">
      <img src="/images/logo.svg" alt="Intersect Logo" class="h-12 sm:h-18" />
    </a>
    <nav>
      <ul class="flex items-center gap-2">
        <li>
          <Button
            href="/votes/cardano-budget-2026"
            variant="outline"
            size="sm"
            class="text-xs text-black"
          >
            <FileText class="size-4" />
            <span class="hidden sm:block">View Proposals</span>
          </Button>
        </li>
        <li class="flex items-center gap-2">
          {#if !$loggedIn}
            <WalletSigner mode="login" dark={true} />
          {:else}
            <div class="flex items-center gap-2">
              <Button
                href="/dashboard"
                size="sm"
                class="bg-white text-black hover:bg-gray-200 text-xs"
              >
                <User />
                <div class="hidden sm:block">My Dashboard</div>
              </Button>
              <Button
                size="sm"
                variant="destructive"
                class="text-white text-xs cursor-point"
                onclick={() => logout()}
                aria-label="Log out"
              >
                <LogOut class="size-4" />
                <span class="hidden sm:inline">Log out</span>
              </Button>
            </div>
          {/if}
        </li>
      </ul>
    </nav>
  </div>
</header>
