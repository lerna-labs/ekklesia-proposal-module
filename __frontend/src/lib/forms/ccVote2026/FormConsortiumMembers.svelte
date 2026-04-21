<script>
  import * as Field from "$lib/components/ui/field/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import FormConsortiumMemberCard from "./FormConsortiumMemberCard.svelte";
  import { getDefaultConsortiumMember } from "./consortiumMemberUtils.js";
  import PlusIcon from "@lucide/svelte/icons/plus";

  let { formData = $bindable(), validationErrors } = $props();

  let deleteDialogOpen = $state(false);
  let indexToDelete = $state(null);

  /** @type {boolean[]} */
  let expandedState = $state([]);

  const members = $derived(
    Array.isArray(formData.metaData.consortium.members)
      ? formData.metaData.consortium.members
      : [],
  );

  const membersErrorsRoot = $derived(
    validationErrors?.properties?.metaData?.properties?.consortium?.properties
      ?.members,
  );

  $effect(() => {
    const n = members.length;
    if (expandedState.length > n) {
      expandedState = expandedState.slice(0, n);
    } else if (expandedState.length < n) {
      expandedState = [
        ...expandedState,
        ...Array(n - expandedState.length).fill(true),
      ];
    }
  });

  function addMember() {
    formData.metaData.consortium.members = [
      ...members,
      getDefaultConsortiumMember(),
    ];
  }

  function requestDelete(index) {
    indexToDelete = index;
    deleteDialogOpen = true;
  }

  function confirmDelete() {
    if (indexToDelete != null) {
      formData.metaData.consortium.members = members.filter(
        (_, i) => i !== indexToDelete,
      );
      indexToDelete = null;
    }
    deleteDialogOpen = false;
  }

  /** @param {number} index */
  function toggleExpanded(index) {
    const next = [...expandedState];
    next[index] = !(next[index] ?? true);
    expandedState = next;
  }
</script>

<div class="flex flex-col gap-3">
  <p
    class="rounded-lg bg-[#ECEBFA] px-4 py-3 text-sm text-foreground dark:bg-violet-950/40 dark:text-violet-50"
  >
    Add each member. Click + Add Member to add more. All member profiles are
    publicly visible.
  </p>

  <div class="flex flex-col gap-1">
    {#if members.length > 0}
      <Field.Field class="gap-1">
        <div class="flex flex-row items-center gap-1 pb-2">
          <span class="text-sm font-medium mb-0">Consortium Members<span class="text-(--mbo-electric-blue)">*</span></span>
          <span class="flex-1 min-w-0" aria-hidden="true"></span>
        </div>
        <ul class="consortium-member-list space-y-2 list-none p-0 m-0">
          {#each members as member, index (index)}
            <li>
              <FormConsortiumMemberCard
                bind:member={formData.metaData.consortium.members[index]}
                {index}
                expanded={expandedState[index] ?? true}
                onToggle={() => toggleExpanded(index)}
                onDelete={() => requestDelete(index)}
                validationErrors={membersErrorsRoot?.items?.[index]}
                isLastMember={index === members.length - 1}
              />
            </li>
          {/each}
        </ul>
      </Field.Field>
    {/if}

    <Button
      type="button"
      variant="outline"
      size="sm"
      class="add-item-btn add-item-btn-full-width text-xs w-full cursor-pointer gap-1 justify-center"
      onclick={addMember}
    >
      <PlusIcon class="size-4 shrink-0" />
      Add Member
    </Button>
  </div>
</div>

<AlertDialog.Root bind:open={deleteDialogOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Remove member</AlertDialog.Title>
      <AlertDialog.Description>
        Are you sure you want to remove this consortium member? This cannot be
        undone.
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
