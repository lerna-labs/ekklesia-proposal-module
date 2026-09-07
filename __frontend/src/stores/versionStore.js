import { writable } from "svelte/store";

// Store the initial version we first load with
let initialLoadVersion = null;
/** @type {ReturnType<typeof setInterval> | null} */
let pollId = null;

export const versionInfo = writable({
  version: null,
  buildTime: null,
  loading: true,
  error: null,
});
export const versionChange = writable(false);

// Function to fetch the current version from version.json
export async function fetchVersionInfo() {
  try {
    const response = await fetch("/version.json?" + new Date().getTime()); // Cache busting

    if (!response.ok) {
      throw new Error(`Failed to fetch version info: ${response.status}`);
    }

    const data = await response.json();
    const currentVersion = data.version;

    // Store the initial version we see when the app first loads
    if (initialLoadVersion === null && currentVersion) {
      initialLoadVersion = currentVersion;
      console.log(`Initial version: ${initialLoadVersion}`);
    }

    versionInfo.update((current) => ({
      ...current,
      version: currentVersion || current.version,
      buildTime: data.buildTime,
      loading: false,
      error: null,
    }));

    // Check if version has changed since the page loaded
    if (initialLoadVersion && currentVersion && initialLoadVersion !== currentVersion) {
      console.info(`New version available: ${currentVersion} (loaded with: ${initialLoadVersion})`);
      versionChange.set(true);
    }

    return data;
  } catch (error) {
    console.error("Error fetching version information:", error);
    versionInfo.update((current) => ({
      ...current,
      loading: false,
      error: error.message,
    }));
    return null;
  }
}

/** Start initial fetch + 5-minute polling (idempotent). */
export function startVersionPolling() {
  if (pollId != null) return;
  fetchVersionInfo();
  pollId = setInterval(fetchVersionInfo, 1000 * 60 * 5);
}

/** Stop version polling. */
export function stopVersionPolling() {
  if (pollId == null) return;
  clearInterval(pollId);
  pollId = null;
}
