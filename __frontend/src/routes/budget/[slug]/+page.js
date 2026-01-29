import { error } from '@sveltejs/kit';

/** @type {import('./$types').PageLoad} */
export async function load({ params, url, fetch }) {
    const { slug } = params;
    const pageNum = url.searchParams.get('page') || '1';
    const search = url.searchParams.get('search') || '';
    const sort = url.searchParams.get('sort') || 'title';
    const direction = url.searchParams.get('direction') || 'asc';

    const apiUrl = import.meta.env.VITE_API_URL || '/api/v0';
    const response = await fetch(`${apiUrl}/budgets/${slug}`);

    if (!response.ok) {
        error(response.status, `Failed to load budget: ${response.statusText}`);
    }

    const budget = await response.json();

    // Load proposals for this budget (with optional page, search, and sort params)
    const proposalsSearchParams = new URLSearchParams({
        budgetId: budget._id,
        page: pageNum,
    });
    if (search) {
        proposalsSearchParams.set('search', search);
    }
    proposalsSearchParams.set('sort', sort);
    proposalsSearchParams.set('direction', direction);
    const proposalsUrl = `${apiUrl}/proposals?${proposalsSearchParams.toString()}`;
    const proposalsResponse = await fetch(proposalsUrl);

    let proposals = { data: [], pagination: { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 10 } };
    if (proposalsResponse.ok) {
        const json = await proposalsResponse.json();
        proposals = Array.isArray(json)
            ? { data: json, pagination: { currentPage: 1, totalPages: 1, totalItems: json.length, itemsPerPage: json.length } }
            : json;
    }

    return {
        budget,
        proposals,
        slug,
    };
}
