import { error } from '@sveltejs/kit';
export async function load({ url, fetch }) {
    const apiUrl = import.meta.env.VITE_API_URL || '/api/v0';
    const response = await fetch(`${apiUrl}/budgets/698b4acaa47f7d4529e2172c`);
    if (!response.ok) {
        error(response.status, `Failed to load categories: ${response.statusText}`);
    }
    const budget = await response.json();

    return { budget };
}