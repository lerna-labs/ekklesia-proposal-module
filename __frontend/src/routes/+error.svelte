<script>
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";

  const getErrorTitle = () => {
    if (page.status === 404) {
      // Check if it's a vote route
      if (page.url?.pathname?.startsWith("/votes/")) {
        return "Vote Not Found";
      }
      return "Page Not Found";
    }
    if (page.status === 500) return "Server Error";
    if (page.status === 401) return "Unauthorized";
    if (page.status === 403) return "Forbidden";
    return "An Error Occurred";
  };

  const getErrorMessage = () => {
    if (page.status === 404) {
      if (page.url?.pathname?.startsWith("/votes/")) {
        return "The vote you are looking for does not exist or has been removed.";
      }
      return "The page you are looking for does not exist.";
    }
    if (page.status === 500) {
      return "An internal server error occurred. Please try again later.";
    }
    return page.error?.message || "An unexpected error occurred.";
  };
</script>

<div class="flex min-h-screen items-center justify-center p-4">
  <Card.Root class="w-full max-w-md">
    <Card.Header>
      <Card.Title class="text-destructive">
        {getErrorTitle()}
      </Card.Title>
    </Card.Header>
    <Card.Content class="space-y-4">
      <p class="text-muted-foreground">
        {getErrorMessage()}
      </p>
      {#if page.status}
        <p class="text-muted-foreground text-sm">Status Code: {page.status}</p>
      {/if}
    </Card.Content>
    <Card.Footer class="flex gap-2">
      <Button variant="outline" onclick={() => goto("/")}>Go Home</Button>
      {#if page.status !== 404}
        <Button variant="default" onclick={() => window.location.reload()}>Try Again</Button>
      {/if}
    </Card.Footer>
  </Card.Root>
</div>
