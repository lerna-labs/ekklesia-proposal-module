/** @type {import('./$types').PageLoad} */
export async function load({ fetch }) {
  const policyNowMs = Date.now();
  const apiUrl = import.meta.env.VITE_API_URL || "/api/v0";
  const slug = "cardano-budget-2026";

  try {
    const res = await fetch(`${apiUrl}/votes/?slug=${slug}`);
    if (!res.ok) {
      return { vote: null, policyNowMs };
    }
    const json = await res.json();
    const vote = json.data?.[0] ?? null;
    return { vote, policyNowMs };
  } catch {
    return { vote: null, policyNowMs };
  }
}
