<script>
  import * as Card from "$lib/components/ui/card";
  let { proposal } = $props();
  let category = $derived(proposal.category);
</script>

<Card.Root class="bg-slate-200/50">
  <Card.Header class="pb-0 mb-0">
    <Card.Title class="space-y-2 pb-0 mb-0">
      <h1 class="text-xs uppercase text-muted-foreground">Strategic Pillar</h1>
      <h2>{category.pillar}</h2>
      <p class="text-xs text-muted-foreground font-normal">
        {category.pillarDescription}
      </p>
    </Card.Title>
  </Card.Header>
  <Card.Content class="pt-0 mt-0">
    <div class="flex gap-2 w-full">
      <div class="min-w-0 flex-1 space-y-1">
        <h3 class="text-xs font-medium text-muted-foreground uppercase">
          Thematic Area
        </h3>
        <p class="text-sm text-foreground font-light">
          {category.highLevelThematicArea}
        </p>
      </div>

      <div class="min-w-0 flex-1 space-y-1">
        <h3 class="text-xs font-medium text-muted-foreground uppercase">
          Expected Enhancement
        </h3>
        <p class="text-sm text-foreground font-light">
          {category.expectedEnhancement}
        </p>
      </div>
    </div>

    <div class="space-y-1 mt-4">
      <h3 class="text-xs font-medium text-muted-foreground uppercase">
        Strategic Approach
      </h3>
      <p class="text-sm text-foreground font-light">
        {category.descriptionStrategy}
      </p>
    </div>
  </Card.Content>
</Card.Root>
