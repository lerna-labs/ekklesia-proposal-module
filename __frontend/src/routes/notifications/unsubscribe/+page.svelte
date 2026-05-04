<script>
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";

  let { data } = $props();

  let token = $derived(data?.token ?? null);
  let state = $derived(
    data?.state ??
      (data?.processing ? "processing" : token ? "processing" : "invalid"),
  );

  let isSuccess = $derived(state === "success");
  let isInvalid = $derived(state === "invalid");
  let isUnexpected = $derived(!isSuccess && !isInvalid && state !== "processing");

  let title = $derived.by(() => {
    if (isSuccess) return "Unsubscribed";
    if (isInvalid) return "Link invalid or expired";
    return "Something went wrong";
  });

  let message = $derived.by(() => {
    if (isSuccess) {
      return "You will no longer receive proposal and vote notification emails. You can turn notifications back on anytime from your dashboard.";
    }
    if (isInvalid) {
      return data?.message ??
        "This link is no longer valid. Open your dashboard to change notification settings.";
    }
    return data?.message ??
      "We could not complete unsubscribe. Please try again from your dashboard.";
  });
</script>

<div class="container mx-auto flex min-h-[70vh] max-w-xl items-center justify-center px-4 py-8">
  <Card.Root class="w-full">
    <Card.Header>
      <Card.Title>{title}</Card.Title>
    </Card.Header>
    <Card.Content class="space-y-4">
      <p class="text-sm text-muted-foreground">{message}</p>
      {#if data?.message && isUnexpected}
        <p class="text-sm text-destructive">{data.message}</p>
      {/if}
      <Button href="/dashboard" class="w-full sm:w-auto">Back to dashboard</Button>
    </Card.Content>
  </Card.Root>
</div>
