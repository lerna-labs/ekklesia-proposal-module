<script>
  /** @see __frontend/docs/budget2026/form-legal-declarations.md Version: 1.1.0 */
  /**
   * Legal declarations form section (accordion section 9).
   * Must be re-submitted on every submit or re-submit; never prefilled.
   */
  import Input from "$lib/components/form/Input.svelte";
  import Checkbox from "$lib/components/form/Checkbox.svelte";
  import { tick } from "svelte";

  let {
    value = $bindable(),
    validationErrors,
  } = $props();

  /** Field ids in form order; first with an error is scrolled into view. */
  const FIELD_ORDER = [
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

  /** Find nearest scrollable ancestor (overflow-y: auto | scroll) so we scroll within the page. */
  function getScrollParent(el) {
    let parent = el.parentElement;
    while (parent) {
      const overflowY = getComputedStyle(parent).overflowY;
      if (
        overflowY === "auto" ||
        overflowY === "scroll" ||
        overflowY === "overlay"
      )
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
    if (!firstId) return;
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

<div class="space-y-6 pr-2">
  <p class="text-sm text-muted-foreground">
    Confirm the legal declarations below before submitting your proposal. These must be confirmed on every submit or re-submit.
  </p>
  <div class="space-y-6">
        <section class="space-y-3">
          <h3 class="text-base font-medium">1. Data Protection</h3>
          <p class="text-sm text-muted-foreground">
            The proposer acknowledges and consents that personal data submitted
            in this form may be shared with relevant internal stakeholders
            solely for the purposes of proposal evaluation, voting, contracting,
            and treasury execution.
          </p>

          <p class="text-sm text-muted-foreground">
            The proposer also acknowledges and agrees that the display name and
            other social media links entered will be publicly visible in
            connection with this budget request.
          </p>
          <!-- <Checkbox
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
          /> -->
        </section>

        <section class="space-y-2">
          <h3 class="text-base font-medium"
            >2. Anti-Bribery and Anti-Corruption</h3
          >
          <p class="text-sm text-muted-foreground">
            The vendor confirms that neither they nor any of their
            representatives have offered, nor will offer, any bribes, improper
            payments, or inducements in connection with this proposal.
          </p>
        </section>

        <section class="space-y-2">
          <h3 class="text-base font-medium">
            3. Proposal Authenticity and Intellectual Property
          </h3>
          <p class="text-sm text-muted-foreground">
            The vendor confirms that this proposal is original, all information
            provided is accurate and complete to the best of their knowledge,
            and no third party owns or has rights that would prevent execution
            of the proposed work.
          </p>
          <p class="text-sm text-muted-foreground">
            The vendor retains ownership of all pre-existing intellectual
            property. Submitted proposals will be treated as confidential and
            used solely for evaluation purposes.
          </p>
        </section>

        <section class="space-y-2">
          <h3 class="text-base font-medium">
            4. Conflicts with Existing Obligations
          </h3>
          <p class="text-sm text-muted-foreground">
            The vendor confirms that accepting this contract (if awarded) would
            not violate any existing obligations to other parties.
          </p>
        </section>

        <section class="space-y-2">
          <h3 class="text-base font-medium">
            5. Compliance with Laws and Regulations
          </h3>
          <p class="text-sm text-muted-foreground">
            The vendor confirms compliance with all applicable laws,
            regulations, and export controls in connection with this proposal.
          </p>
        </section>

        <section class="space-y-2">
          <h3 class="text-base font-medium"
            >6. Sanctions / Restricted Parties</h3
          >
          <p class="text-sm text-muted-foreground">
            The vendor confirms that neither they nor any associated parties are
            located in, or otherwise subject to, countries or individuals on
            relevant sanctions lists
          </p>
        </section>

        <section class="space-y-2">
          <h3 class="text-base font-medium">
            7. No Contract Formation / Limitation of Liability
          </h3>
          <p class="text-sm text-muted-foreground">
            The vendor acknowledges that submission of this proposal does not
            create a contract, obligation, or entitlement to award.
          </p>
          <p class="text-sm text-muted-foreground">
            The vendor acknowledges that submission of this proposal does not
            guarantee approval and that only the delegated representatives
            ("DReps") have authority to vote on and approve proposals. DReps
            reserve sole discretion over evaluation, voting, and approval.
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
                maxLength={254}
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
</div>
