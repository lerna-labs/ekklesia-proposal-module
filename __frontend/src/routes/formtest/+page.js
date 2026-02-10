import { error } from '@sveltejs/kit';
export async function load({ url, fetch }) {
    const apiUrl = import.meta.env.VITE_API_URL || '/api/v0';
    const response = await fetch(`${apiUrl}/budgets/?slug=test-budget-2026`);
    if (!response.ok) {
        error(response.status, `Failed to load categories: ${response.statusText}`);
    }
    const budgetJson = await response.json();
    const budget = budgetJson.data[0];

    const categoriesResponse = await fetch(`${apiUrl}/budgets/${budget._id}/categories`);
    if (!categoriesResponse.ok) {
        error(categoriesResponse.status, `Failed to load categories: ${categoriesResponse.statusText}`);
    }
    const categoriesJson = await categoriesResponse.json();
    const categories = categoriesJson.data;

    return { budget, categories };
}