<script>
  import { toast } from "svelte-sonner";
  import { api } from "$stores/sessionManager.js";
  import * as Card from "$lib/components/ui/card";
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import * as Field from "$lib/components/ui/field/index.js";
  import * as Input from "$lib/components/ui/input";
  import * as Select from "$lib/components/ui/select";
  import ToolTip from "$lib/components/form/ToolTip.svelte";

  let {
    user = null,
    notification = null,
    onSaved = () => {},
  } = $props();

  const SCHEDULE_OPTIONS = [
    { value: "never", label: "Never" },
    { value: "6h", label: "Every 6 hours" },
    { value: "daily", label: "Daily" },
  ];

  const SCHEDULE_HELP =
    "This schedule applies only to comment notifications (batched digests). Other events—such as submission confirmed, proposal withdrawn by an admin, or voting milestones—are sent instantly when they occur. Select Never if you don’t want to receive notification emails at all.";

  let submitting = $state(false);
  let email = $state("");
  let schedule = $state("daily");
  let localNotification = $state(null);
  const EMAIL_ERROR_MESSAGE = "Please enter a valid email address.";

  const selectedScheduleLabel = $derived(
    SCHEDULE_OPTIONS.find((option) => option.value === schedule)?.label ?? "Never",
  );

  const statusLabel = $derived.by(() => {
    const n = localNotification ?? {};
    if (n.pendingEmail) return "Pending confirmation";
    if (n.email) return "Verified";
    return "Not configured";
  });

  const statusDetail = $derived.by(() => {
    const n = localNotification ?? {};
    if (n.pendingEmail) return "Check your inbox to confirm your email.";
    if (n.email) return "Email is verified and ready for notifications.";
    return "Add an email to receive updates.";
  });

  const canResend = $derived(Boolean(localNotification?.pendingEmail));
  const emailValidationError = $derived.by(() => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) return "";
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
    return isValidEmail ? "" : EMAIL_ERROR_MESSAGE;
  });

  $effect(() => {
    localNotification = notification ?? null;
    email = notification?.pendingEmail ?? notification?.email ?? "";
    schedule = notification?.schedule ?? "daily";
  });

  async function saveSettings() {
    if (!user?.userId || submitting) return;
    if (emailValidationError) return;
    submitting = true;
    try {
      const res = await api.fetch(fetch, "/notifications", {
        method: "PUT",
        body: JSON.stringify({
          email: email.trim(),
          schedule,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(payload?.message ?? "Could not save notification settings.");
        return;
      }
      localNotification = payload;
      email = payload?.pendingEmail ?? payload?.email ?? "";
      schedule = payload?.schedule ?? "daily";
      toast.success("Notification settings saved.");
      if (payload?.emailSendFailed) {
        toast.warning("Saved, but verification email could not be sent.");
      }
      onSaved?.(payload);
    } catch (error) {
      toast.error(error?.message ?? "Could not save notification settings.");
    } finally {
      submitting = false;
    }
  }

  async function resendVerification() {
    if (!canResend || submitting) return;
    submitting = true;
    try {
      const res = await api.fetch(fetch, "/notifications/resend", {
        method: "POST",
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(payload?.message ?? "Could not resend verification email.");
        return;
      }
      if (payload?.emailSendFailed) {
        toast.warning("Resend requested, but the email could not be sent.");
      } else {
        toast.success("Verification email sent.");
      }
    } catch (error) {
      toast.error(error?.message ?? "Could not resend verification email.");
    } finally {
      submitting = false;
    }
  }
</script>

<Card.Root>
  <Card.Header>
    <Card.Title>Notifications</Card.Title>
  </Card.Header>
  <Card.Content class="space-y-4">
    <Field.Field class="gap-2">
      <Field.Label
        for="notifications-email"
        class="flex flex-row items-center gap-1 mb-0 pb-0 text-sm font-medium shrink-0 w-fit"
      >
        Email
      </Field.Label>
      <Input.Root
        id="notifications-email"
        type="email"
        bind:value={email}
        placeholder="name@example.com"
        autocomplete="email"
        disabled={submitting}
        aria-invalid={emailValidationError ? true : false}
        class="aria-invalid:border-destructive aria-invalid:ring-destructive/20 aria-invalid:ring-[3px]"
      />
      {#if emailValidationError}
        <Field.Error class="text-xs">{emailValidationError}</Field.Error>
      {/if}
    </Field.Field>

    <Field.Field class="gap-2">
      <Field.Label
        for="notifications-schedule"
        class="flex flex-row items-center gap-1 mb-0 pb-0 text-sm font-medium shrink-0 w-fit"
      >
        Schedule
        <ToolTip content={SCHEDULE_HELP} fieldLabel="Schedule" />
      </Field.Label>
      <Select.Root
        type="single"
        value={schedule}
        onValueChange={(value) => value != null && (schedule = value)}
      >
        <Select.Trigger id="notifications-schedule" disabled={submitting} class="w-full">
          <span class="line-clamp-1">{selectedScheduleLabel}</span>
        </Select.Trigger>
        <Select.Content>
          {#each SCHEDULE_OPTIONS as option (option.value)}
            <Select.Item value={option.value}>{option.label}</Select.Item>
          {/each}
        </Select.Content>
      </Select.Root>
    </Field.Field>

    <div class="space-y-1 text-sm">
      <div class="flex items-center gap-2">
        <span class="text-muted-foreground">Status:</span>
        <Badge
          variant="secondary"
          class={statusLabel === "Verified" ? "bg-green-600 text-white border-transparent" : undefined}
        >
          {statusLabel}
        </Badge>
      </div>
      <p class="text-muted-foreground">{statusDetail}</p>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <Button type="button" disabled={submitting} onclick={saveSettings} class="cursor-pointer">
        {submitting ? "Saving…" : "Save"}
      </Button>
      {#if canResend}
        <Button
          type="button"
          variant="outline"
          disabled={submitting}
          onclick={resendVerification}
          class="cursor-pointer"
        >
          {submitting ? "Sending…" : "Resend"}
        </Button>
      {/if}
    </div>
  </Card.Content>
</Card.Root>
