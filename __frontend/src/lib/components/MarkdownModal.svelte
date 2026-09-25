<script>
  import * as Dialog from "$lib/components/ui/dialog";
  import { buttonVariants } from "$lib/components/ui/button";
  import Markdown from "$lib/base/Markdown.svelte";

  let {
    open = $bindable(false),
    title = "",
    content = "",
    contentClass = "text-sm",
    class: contentWrapperClass = "sm:max-w-md",
    description = "",
  } = $props();
</script>

<Dialog.Root bind:open>
  <Dialog.Content class={contentWrapperClass}>
    <Dialog.Header>
      <Dialog.Title>{title}</Dialog.Title>
      <Dialog.Description class="sr-only">
        {description || title}
      </Dialog.Description>
    </Dialog.Header>
    <div class={contentClass}>
      <Markdown {content} />
    </div>
    <Dialog.Footer class="gap-2">
      <Dialog.Close type="button" class={buttonVariants({ variant: "outline" })}>
        Close
      </Dialog.Close>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
