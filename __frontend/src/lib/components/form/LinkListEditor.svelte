<script>
  /**
   * Reusable component for listing, adding, editing, and deleting links (title + URL).
   * Each item is { title: string, url: string }. Validated with zod: title required (max 100), url required and valid.
   */
  import { z } from "zod";
  import * as Field from "$lib/components/ui/field/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import Input from "$lib/components/form/Input.svelte";
  import ToolTip from "$lib/components/form/ToolTip.svelte";
  import PrivateFieldIndicator from "$lib/components/form/PrivateFieldIndicator.svelte";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import TrashIcon from "@lucide/svelte/icons/trash-2";
  import PencilIcon from "@lucide/svelte/icons/pencil";
  import PlusIcon from "@lucide/svelte/icons/plus";
  import ExternalLinkIcon from "@lucide/svelte/icons/external-link";

  const TITLE_MAX_LENGTH = 100;

  function normalizeUrl(val) {
    const trimmed = (val ?? "").trim();
    if (!trimmed) return trimmed;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  }

  const linkSchema = z.object({
    title: z
      .string()
      .min(1, "Title is required")
      .max(
        TITLE_MAX_LENGTH,
        `Title must be at most ${TITLE_MAX_LENGTH} characters`,
      ),

    url: z
      .string()
      .min(1, "URL is required")
      .transform(normalizeUrl)
      .pipe(z.string().url("Enter a valid URL")),
  });

  let {
    value = $bindable([]),
    label = "Links",
    description = "",
    notPublic = false,
    validationErrors,
    addButtonLabel = "Add Link",
    emptyMessage,
    class: className = "",
  } = $props();

  let addDialogOpen = $state(false);
  let deleteDialogOpen = $state(false);
  let indexToDelete = $state(null);
  let editingIndex = $state(null);
  let draftTitle = $state("");
  let draftUrl = $state("");
  let draftErrors = $state({ title: "", url: "" });

  const links = $derived(Array.isArray(value) ? value : []);
  const schemaError = $derived(validationErrors?.errors?.[0]);

  function openAddDialog(index = null) {
    const link = index != null ? links[index] : null;
    if (link) {
      draftTitle = link.title ?? "";
      draftUrl = link.url ?? "";
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
    const result = linkSchema.safeParse({
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
    const item = result.data;
    if (editingIndex != null) {
      value = links.map((it, i) => (i === editingIndex ? item : it));
      editingIndex = null;
    } else {
      value = [...links, item];
    }
    addDialogOpen = false;
  }

  function openLinkUrl(url) {
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

  function deleteFromDialog() {
    if (editingIndex != null) {
      indexToDelete = editingIndex;
      editingIndex = null;
      addDialogOpen = false;
      deleteDialogOpen = true;
    }
  }
</script>

<div class={[className, "gap-2"].filter(Boolean).join(" ")}>
  {#if label || notPublic || description}
    <div class="flex flex-row items-center gap-1 pb-2">
      {#if label}
        <span class="text-sm font-medium mb-0">{label}</span>
      {/if}
      {#if notPublic}
        <PrivateFieldIndicator />
      {/if}
      {#if description}
        <ToolTip content={description} fieldLabel={label} />
      {/if}
      <span class="flex-1 min-w-0" aria-hidden="true"></span>
    </div>
  {/if}
  <Field.Field class="gap-1">
    {#if links.length > 0}
      <ul class="link-list-editor-list space-y-2 list-none p-0 m-0 mb-1!">
        {#each links as link, index (index)}
          <li>
            <Card.Root class="py-2">
              <Card.Header
                class="flex flex-row items-center gap-2 py-0 pl-4 pr-2 text-sm"
              >
                <button
                  type="button"
                  class="min-w-0 flex-1 font-medium truncate text-left cursor-pointer focus:outline-none"
                  title={link.title}
                  onclick={() => openAddDialog(index)}
                >
                  {link.title}
                </button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  class="shrink-0 size-8 cursor-pointer"
                  aria-label="Open link in new window"
                  onclick={() => openLinkUrl(link.url)}
                >
                  <ExternalLinkIcon class="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  class="shrink-0 size-8 cursor-pointer"
                  aria-label="Edit link"
                  onclick={() => openAddDialog(index)}
                >
                  <PencilIcon class="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  class="shrink-0 size-8 cursor-pointer"
                  aria-label="Remove link"
                  onclick={() => requestDelete(index)}
                >
                  <TrashIcon class="size-4" />
                </Button>
              </Card.Header>
            </Card.Root>
          </li>
        {/each}
      </ul>
    {:else if emptyMessage}
      <p class="text-sm text-muted-foreground">{emptyMessage}</p>
    {/if}

    <div class="flex justify-start">
      <Button
        type="button"
        variant="outline"
        size="sm"
        class="add-item-btn text-xs w-fit cursor-pointer gap-1"
        onclick={openAddDialog}
      >
        <PlusIcon class="size-4" />
        {addButtonLabel}
      </Button>
    </div>

    {#if schemaError}
      <Field.Error class="text-xs">{schemaError}</Field.Error>
    {/if}
  </Field.Field>
</div>

<!-- Add / Edit link (AlertDialog: doesn't close without user action) -->
<AlertDialog.Root bind:open={addDialogOpen}>
  <AlertDialog.Content class="sm:max-w-md">
    <AlertDialog.Header>
      <AlertDialog.Title>
        {editingIndex != null ? "Edit Link" : "Add Link"}
      </AlertDialog.Title>
      <AlertDialog.Description>
        {editingIndex != null
          ? "Update the title and URL for this link."
          : "Enter a title and URL for the link."}
      </AlertDialog.Description>
    </AlertDialog.Header>
    <div class="grid gap-4 py-2">
      <Input
        id="link-list-title"
        label="Title"
        bind:value={draftTitle}
        placeholder="Enter link title"
        description="Enter a descriptive title for the link"
        maxLength={TITLE_MAX_LENGTH}
        required
        validationErrors={{
          properties: {
            "link-list-title": draftErrors.title
              ? { errors: [draftErrors.title] }
              : {},
          },
        }}
      />
      <Input
        id="link-list-url"
        label="URL"
        bind:value={draftUrl}
        type="url"
        placeholder="https://..."
        description="Enter the URL for the link"
        required
        validationErrors={{
          properties: {
            "link-list-url": draftErrors.url
              ? { errors: [draftErrors.url] }
              : {},
          },
        }}
      />
    </div>
    <AlertDialog.Footer class="flex gap-2 flex-wrap">
      {#if editingIndex != null}
        <Button
          type="button"
          variant="destructive"
          class="mr-auto"
          onclick={deleteFromDialog}
        >
          <TrashIcon class="size-4 mr-1" />
          Delete
        </Button>
      {/if}
      <AlertDialog.Cancel class="cursor-pointer">Cancel</AlertDialog.Cancel>
      <Button type="button" class="cursor-pointer" onclick={saveLink}>
        {editingIndex != null ? "Save changes" : "Save"}
      </Button>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

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

<style>
  /* Override form.css form ul styles so this list has no left padding or bullet */
  :global(form ul.link-list-editor-list) {
    padding-left: 0;
    list-style: none;
  }
</style>
