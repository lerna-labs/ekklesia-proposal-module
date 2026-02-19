<script>
  import * as Field from "$lib/components/ui/field/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import TrashIcon from "@lucide/svelte/icons/trash-2";
  import PencilIcon from "@lucide/svelte/icons/pencil";
  import PlusIcon from "@lucide/svelte/icons/plus";
  import ExternalLinkIcon from "@lucide/svelte/icons/external-link";
  import ToolTip from "$lib/form/ToolTip.svelte";
  import PrivateFieldIndicator from "$lib/form/PrivateFieldIndicator.svelte";
  import { supportingInfoLinkSchema } from "$lib/budget2026/Schema.js";
  import { z } from "zod";

  let {
    value = $bindable([]),
    label: labelProp = "Other Supporting Info",
    description: descriptionProp = "External links get the disclaimer text popup before they open. Any other details relevant to the proposal.",
    notPublic = false,
    validationErrors,
    class: className,
  } = $props();

  const label = $derived(labelProp);
  const description = $derived(descriptionProp);

  let addDialogOpen = $state(false);
  let deleteDialogOpen = $state(false);
  let indexToDelete = $state(null);
  let editingIndex = $state(null);

  let draftTitle = $state("");
  let draftUrl = $state("");
  let draftErrors = $state({ title: "", url: "" });

  const links = $derived(Array.isArray(value) ? value : []);
  const schemaError = $derived(
    validationErrors?.properties?.supportingInfoLinks?.errors?.[0],
  );
  const showNotPublic = $derived(notPublic);

  function openAddDialog(index = null) {
    const link = index != null ? links[index] : null;
    if (link) {
      draftTitle = link.title;
      draftUrl = link.url;
      editingIndex = index;
    } else {
      draftTitle = "";
      draftUrl = "";
      editingIndex = null;
    }
    draftErrors = { title: "", url: "" };
    addDialogOpen = true;
  }

  function saveLink() {
    const result = supportingInfoLinkSchema.safeParse({
      title: draftTitle.trim(),
      url: draftUrl.trim(),
    });
    if (!result.success) {
      const tree = z.treeifyError(result.error);
      draftErrors = {
        title: tree.properties?.title?.errors?.[0] ?? "",
        url: tree.properties?.url?.errors?.[0] ?? "",
      };
      return;
    }
    draftErrors = { title: "", url: "" };
    if (editingIndex != null) {
      value = links.map((item, i) => (i === editingIndex ? result.data : item));
      editingIndex = null;
    } else {
      value = [...links, result.data];
    }
    addDialogOpen = false;
  }

  function openLink(url) {
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  function requestDelete(index) {
    indexToDelete = index;
    deleteDialogOpen = true;
  }

  function confirmDelete() {
    if (indexToDelete != null) {
      value = links.filter((_, i) => i !== indexToDelete);
      indexToDelete = null;
    }
    deleteDialogOpen = false;
  }
</script>

<Field.Field class="gap-2 {className}">
  <div class="flex items-center gap-1 w-full">
    <Field.Label class="flex gap-0 mb-0 pb-0 text-sm shrink-0 w-fit">
      {label}
    </Field.Label>
    {#if showNotPublic}
      <PrivateFieldIndicator />
    {/if}
    {#if description}
      <ToolTip content={description} />
    {/if}
    <span class="flex-1 min-w-0" aria-hidden="true"></span>
  </div>

  {#if links.length > 0}
    <ul class="space-y-2 rounded-md border border-input divide-y divide-input">
      {#each links as link, index (index)}
        <li class="flex items-center gap-0 p-2 text-sm bg-(--mbo-sky-blue)/50">
          <span class="min-w-0 flex-1 font-medium truncate" title={link.title}>
            {link.title}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            class="shrink-0 size-8 text-muted-foreground hover:text-primary cursor-pointer"
            aria-label="Open link in new window"
            onclick={() => openLink(link.url)}
          >
            <ExternalLinkIcon class="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            class="shrink-0 size-8 text-muted-foreground hover:text-foreground cursor-pointer"
            aria-label="Edit link"
            onclick={() => openAddDialog(index)}
          >
            <PencilIcon class="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            class="shrink-0 size-8 text-muted-foreground hover:text-destructive cursor-pointer"
            aria-label="Remove link"
            onclick={() => requestDelete(index)}
          >
            <TrashIcon class="size-4" />
          </Button>
        </li>
      {/each}
    </ul>
  {/if}

  <div class="flex justify-start">
    <Button
      type="button"
      variant="outline"
      class="add-item-btn w-fit cursor-pointer gap-1"
      onclick={openAddDialog}
    >
      <PlusIcon class="size-4" />
      Add Link
    </Button>
  </div>

  {#if schemaError}
    <Field.Error class="text-xs">{schemaError}</Field.Error>
  {/if}
</Field.Field>

<!-- Add link dialog -->
<Dialog.Root bind:open={addDialogOpen}>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>
        {editingIndex != null ? "Edit Link" : "Add Link"}
      </Dialog.Title>
      <Dialog.Description>
        {editingIndex != null
          ? "Update the title and URL for this link."
          : "Enter a title and URL for the link. The link will be added to your proposal."}
      </Dialog.Description>
    </Dialog.Header>
    <div class="grid gap-4 py-4">
      <div class="grid gap-2">
        <label for="link-title" class="text-sm font-medium">Title</label>
        <Input
          id="link-title"
          bind:value={draftTitle}
          placeholder="Enter link title"
          class={draftErrors.title ? "border-destructive" : ""}
        />
        {#if draftErrors.title}
          <p class="text-xs text-destructive">{draftErrors.title}</p>
        {/if}
      </div>
      <div class="grid gap-2">
        <label for="link-url" class="text-sm font-medium">URL</label>
        <Input
          id="link-url"
          bind:value={draftUrl}
          type="url"
          placeholder="https://..."
          class={draftErrors.url ? "border-destructive" : ""}
        />
        {#if draftErrors.url}
          <p class="text-xs text-destructive">{draftErrors.url}</p>
        {/if}
      </div>
    </div>
    <Dialog.Footer class="flex gap-2">
      <Button
        type="button"
        variant="outline"
        onclick={() => (addDialogOpen = false)}
      >
        Cancel
      </Button>
      <Button type="button" onclick={saveLink}>
        {editingIndex != null ? "Save changes" : "Save"}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<!-- Delete confirmation -->
<AlertDialog.Root bind:open={deleteDialogOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Remove link</AlertDialog.Title>
      <AlertDialog.Description>
        Are you sure you want to remove this link? This cannot be undone.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer class="flex gap-2">
      <AlertDialog.Cancel class="cursor-pointer">Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
        class="cursor-pointer bg-destructive text-white hover:bg-destructive/90"
        onclick={confirmDelete}
      >
        Delete
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
