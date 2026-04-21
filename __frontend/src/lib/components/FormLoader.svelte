<!--
  Spinner shown while the proposal form chunk is loading (dashboard routes).
-->
<div class="form-loader-root flex flex-col items-center gap-3" role="status" aria-live="polite">
  <span class="sr-only">Loading form…</span>
  <div class="loader"></div>
</div>

<style>
  .loader {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    position: relative;
    animation: rotate 1s linear infinite;
  }
  .loader::before {
    content: "";
    box-sizing: border-box;
    position: absolute;
    inset: 0px;
    border-radius: 50%;
    border: 5px solid var(--mbo-grey, #a5a6a7);
    animation: prixClipFix 2s linear infinite;
  }

  @keyframes rotate {
    100% {
      transform: rotate(360deg);
    }
  }

  @keyframes prixClipFix {
    0% {
      clip-path: polygon(50% 50%, 0 0, 0 0, 0 0, 0 0, 0 0);
    }
    25% {
      clip-path: polygon(50% 50%, 0 0, 100% 0, 100% 0, 100% 0, 100% 0);
    }
    50% {
      clip-path: polygon(50% 50%, 0 0, 100% 0, 100% 100%, 100% 100%, 100% 100%);
    }
    75% {
      clip-path: polygon(50% 50%, 0 0, 100% 0, 100% 100%, 0 100%, 0 100%);
    }
    100% {
      clip-path: polygon(50% 50%, 0 0, 100% 0, 100% 100%, 0 100%, 0 0);
    }
  }
</style>
