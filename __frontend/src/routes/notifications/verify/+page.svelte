<script>
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";

  let { data } = $props();

  let token = $derived(data?.token ?? null);
  let state = $derived(
    data?.state ??
      data?.result ??
      data?.status ??
      (data?.processing ? "processing" : token ? "processing" : "invalid"),
  );

  let isSuccess = $derived(state === "success" || state === "verified");
  let isProcessing = $derived(state === "processing");
  let isInvalid = $derived(state === "invalid" || state === "expired");
  let isUnexpected = $derived(!isSuccess && !isProcessing && !isInvalid);

  let title = $derived.by(() => {
    if (isSuccess) return "Email verified";
    if (isProcessing) return "Verifying email";
    if (isInvalid) return "Link invalid or expired";
    return "Something went wrong";
  });

  let message = $derived.by(() => {
    if (isSuccess) return "Your notification email is confirmed. You can manage settings in your dashboard.";
    if (isProcessing) return "Please wait while we confirm your email address.";
    if (isInvalid) return "This verification link is no longer valid. Request a new email from dashboard settings.";
    return "We could not complete verification. Please try again from your dashboard.";
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
