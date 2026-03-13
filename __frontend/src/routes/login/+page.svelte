<script>
  import { Button } from "$lib/components/ui/button";
  import { ArrowLeft } from "lucide-svelte";
  import { loggedIn, showLogin } from "$stores/sessionManager.js";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  onMount(() => {
    if ($loggedIn) {
      goto("/dashboard");
    } else {
      showLogin.set(true);
    }
  });
</script>

<section class="container mx-auto max-w-4xl py-8 px-4">
  <div>
    <h1 class="text-2xl font-semibold mb-6">Login</h1>
    <p>Whoopsies, you'll need to login to continue. </p>
    <Button href="/" class="mt-4">
      <ArrowLeft class="size-4" />
      Go Home
    </Button>
  </div>
</section>
