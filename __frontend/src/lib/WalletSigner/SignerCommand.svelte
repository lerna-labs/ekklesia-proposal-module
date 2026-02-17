<script>
  import { toast } from "svelte-sonner";
  import { Copy } from "lucide-svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  let { signType, signerAddress, payload } = $props();
  // FIXME: IMPORT FROM HEALTH ENDPOINT INSTEAD
  const NETWORK = import.meta.env.VITE_NETWORK_ID;
  const testNetMagic = NETWORK == 1 ? "" : "--testnet-magic xxx";

  // Create the complete command text with proper substitutions
  const command = $derived.by(() => {
    switch (signType) {
      case "drep":
        return `cardano-signer sign --json --cip30 --data-hex "${payload.dataHex}" --address ${signerAddress} --secret-key ${signType}.skey`;
      case "pool":
        return `cardano-signer sign --json --cip30 --data-hex  "${payload.dataHex}" --address ${payload.calidusID} --secret-key calidus.skey`;
      case "addr":
        return `cardano-signer sign  --json --cip30 --data-hex "${payload.dataHex}" --address ${signerAddress} ${testNetMagic} --secret-key ${signType}.skey`;
      case "stake":
        return `cardano-signer sign  --json --cip30 --data-hex "${payload.dataHex}" --address ${signerAddress} ${testNetMagic} --secret-key ${signType}.skey`;
      default:
        return undefined;
    }
  });

  function copyCommand() {
    // Copy the formatted command
    navigator.clipboard.writeText(command);
    toast.success("Command copied to clipboard");
  }

  function copyDataHex() {
    navigator.clipboard.writeText(payload.dataHex);
    toast.success("Data hex copied to clipboard");
  }
</script>

<button
  type="button"
  class="copyPayload"
  aria-label="Copy command to clipboard"
  onclick={(e) => {
    e.preventDefault();
    copyCommand();
  }}
  onkeydown={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      copyCommand();
    }
  }}
>
  <div class="copyButton">
    <Copy size={14} />
  </div>

  <pre class="w-full overflow-y-hidden bg-slate-100 text-xs">
{command}
</pre>
</button>
<Button class="mt-2 w-full" variant="secondary" size="sm" onclick={copyDataHex}>
  Copy Data Hex
</Button>

<style>
  .copyPayload {
    position: relative;
    text-align: left;
    display: block;
    margin-top: 0;
  }

  .copyButton {
    position: absolute;
    top: 0.75rem;
    right: 0.5rem;
  }

  pre {
    padding: 0.75rem 2rem 0.75rem 1rem;
    border-radius: 0.5rem;
    box-sizing: border-box;
    width: 100%;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-all;
    font-size: 0.6rem;
    line-height: 1.6;
  }
</style>
