<script>
  /** @see __frontend/docs/budget2026/form-legal-declarations.md Version: 1.1.0 */
  /**
   * Legal declarations form content for the submit dialog.
   * Shown only on submit/re-submit when all other validation errors are cleared.
   * Must be re-submitted on every submit or re-submit.
   */
  import Input from "$lib/components/form/Input.svelte";
  import Checkbox from "$lib/components/form/Checkbox.svelte";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import { tick } from "svelte";

  let {
    value = $bindable(),
    validationErrors,
    open = $bindable(false),
    onConfirm,
    submitting = false,
  } = $props();

  /** Field ids in form order; first with an error is scrolled into view. */
  const FIELD_ORDER = [
    "dataProcessingConsent",
    "publicVisibilityConsent",
    "submitterName",
    "submitterEmail",
    "submitterRole",
    "authorizationEntity",
    "authorizationAttestation",
  ];

  function getFirstErrorFieldId(errors) {
    if (!errors?.properties) return null;
    for (const id of FIELD_ORDER) {
      if (errors.properties[id]?.errors?.length) return id;
    }
    return null;
  }

  /** Find nearest scrollable ancestor (overflow-y: auto | scroll) so we scroll the modal content, not the window. */
  function getScrollParent(el) {
    let parent = el.parentElement;
    while (parent) {
      const overflowY = getComputedStyle(parent).overflowY;
      if (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay")
        return parent;
      parent = parent.parentElement;
    }
    return null;
  }

  function scrollToElement(el) {
    const scrollParent = getScrollParent(el);
    if (scrollParent) {
      const parentRect = scrollParent.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const padding = 16;
      const targetScrollTop =
        scrollParent.scrollTop + (elRect.top - parentRect.top) - padding;
      scrollParent.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: "smooth",
      });
    } else {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  $effect(() => {
    const firstId = getFirstErrorFieldId(validationErrors);
    if (!firstId || !open) return;
    tick().then(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const el = document.getElementById(firstId);
          if (el) scrollToElement(el);
        });
      });
    });
  });
</script>

<AlertDialog.Root bind:open>
  <AlertDialog.Content
    class="fixed! inset-0! top-0! left-0! translate-x-0! translate-y-0! max-w-none! w-full min-w-0 overflow-y-auto overflow-x-hidden flex! flex-col items-center justify-start p-4 py-8 bg-transparent! rounded-none! border-0! shadow-none! pointer-events-none box-border"
  >
    <div
      class="relative w-full max-w-2xl mx-auto flex flex-col gap-4 rounded-lg border bg-background shadow-lg p-6 my-auto pointer-events-auto shrink-0"
    >
      <AlertDialog.Header>
        <AlertDialog.Title>Proposal submission legal declarations</AlertDialog.Title>
        <AlertDialog.Description>
          Confirm the legal declarations below before submitting your proposal.
          These must be confirmed on every submit or re-submit.
        </AlertDialog.Description>
      </AlertDialog.Header>

      <div class="space-y-6 pr-2">
        <section class="space-y-3">
          <h3 class="text-base font-medium">1. Data Protection</h3>
          <p class="text-sm text-muted-foreground">
            The proposer acknowledges that personal data submitted in this form may be
            shared with relevant internal stakeholders solely for proposal evaluation,
            voting, contracting, and treasury execution.
          </p>
          <Checkbox
            id="dataProcessingConsent"
            bind:value={value.dataProcessingConsent}
            label="I acknowledge and consent to the above data processing and sharing."
            required
            notPublic
            {validationErrors}
          />
          <Checkbox
            id="publicVisibilityConsent"
            bind:value={value.publicVisibilityConsent}
            label="By submitting this form, you acknowledge and agree that the legal entity name, personal name, and X (Twitter) handle entered will be publicly visible in connection with this budget request."
            required
            notPublic
            {validationErrors}
          />
        </section>

        <section class="space-y-2">
          <h3 class="text-base font-medium">2. Anti-Bribery and Anti-Corruption</h3>
          <p class="text-sm text-muted-foreground">
            The vendor confirms that neither they nor any of their representatives
            have offered, nor will offer, any bribes, improper payments, or
            inducements in connection with this proposal.
          </p>
        </section>

        <section class="space-y-2">
          <h3 class="text-base font-medium">
            3. Proposal Authenticity and Intellectual Property
          </h3>
          <p class="text-sm text-muted-foreground">
            The vendor confirms that this proposal is original, all information
            provided is accurate and complete to the best of their knowledge, and no
            third party owns or has rights that would prevent execution of the
            proposed work.
          </p>
          <p class="text-sm text-muted-foreground">
            The vendor retains ownership of all pre-existing intellectual property.
            Submitted proposals will be treated as confidential and used solely for
            evaluation purposes.
          </p>
        </section>

        <section class="space-y-2">
          <h3 class="text-base font-medium">
            4. Conflicts with Existing Obligations
          </h3>
          <p class="text-sm text-muted-foreground">
            The vendor confirms that accepting this contract (if awarded) would not
            violate any existing obligations to other parties.
          </p>
        </section>

        <section class="space-y-2">
          <h3 class="text-base font-medium">
            5. Compliance with Laws and Regulations
          </h3>
          <p class="text-sm text-muted-foreground">
            The vendor confirms compliance with all applicable laws, regulations, and
            export controls in connection with this proposal.
          </p>
        </section>

        <section class="space-y-2">
          <h3 class="text-base font-medium">6. Sanctions / Restricted Parties</h3>
          <p class="text-sm text-muted-foreground">
            The vendor confirms that neither they nor any associated parties are
            located in, or otherwise subject to, countries or individuals on relevant
            sanctions lists
          </p>
        </section>

        <section class="space-y-2">
          <h3 class="text-base font-medium">
            7. No Contract Formation / Limitation of Liability
          </h3>
          <p class="text-sm text-muted-foreground">
            The vendor acknowledges that submission of this proposal does not create a
            contract, obligation, or entitlement to award.
          </p>
          <p class="text-sm text-muted-foreground">
            The vendor acknowledges that submission of this proposal does not
            guarantee approval and that only the delegated representatives ("DReps")
            have authority to vote on and approve proposals. DReps reserve sole
            discretion over evaluation, voting, and approval.
          </p>
        </section>

        <section class="space-y-4">
          <h3 class="text-base font-medium">8. Declaration of Submitter</h3>
          <div class="grid gap-3">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                id="submitterName"
                bind:value={value.submitterName}
                label="Name"
                placeholder="Enter Full Name"
                required
                maxLength={100}
                notPublic
                {validationErrors}
              />
              <Input
                id="submitterEmail"
                bind:value={value.submitterEmail}
                label="Email"
                placeholder="Enter Email"
                required
                maxLength={100}
                type="email"
                notPublic
                {validationErrors}
              />
            </div>

            <Input
              id="submitterRole"
              bind:value={value.submitterRole}
              label="Role"
              placeholder="Enter Role"
              required
              maxLength={100}
              class="w-full md:max-w-[50%]"
              notPublic
              {validationErrors}
            />
          </div>
          <Checkbox
            id="authorizationEntity"
            bind:value={value.authorizationEntity}
            label="I confirm that I am authorized to submit this proposal on behalf of the vendor entity. I acknowledge that submission does not constitute authority to bind the entity contractually."
            required
            notPublic
            {validationErrors}
          />
          <Checkbox
            id="authorizationAttestation"
            bind:value={value.authorizationAttestation}
            label="I confirm that I am authorized to submit and attest to all legal declarations above on behalf of the vendor."
            required
            notPublic
            {validationErrors}
          />
        </section>
      </div>

      <AlertDialog.Footer class="flex gap-2 shrink-0 mt-4">
        <AlertDialog.Cancel disabled={submitting}>Cancel</AlertDialog.Cancel>
        <AlertDialog.Action disabled={submitting} onclick={() => onConfirm?.()}>
          {submitting ? "Submitting…" : "Confirm and submit"}
        </AlertDialog.Action>
      </AlertDialog.Footer>
    </div>
  </AlertDialog.Content>
</AlertDialog.Root>
