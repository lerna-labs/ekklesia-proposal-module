<script>
  import { Button } from "$lib/components/ui/button";
  import { ArrowLeft } from "lucide-svelte";
</script>

<section class="container mx-auto max-w-4xl px-4 py-8">
  <div>
    <h1 class="mb-6">Login</h1>
    <p>Whoopsies, you'll need to login to continue.</p>
    <Button href="/" class="mt-4">
      <ArrowLeft class="size-4" />
      Go Home
    </Button>
  </div>
</section>
