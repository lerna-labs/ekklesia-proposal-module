import { error } from '@sveltejs/kit';
import { getJWT } from '$stores/sessionManager.js';

/** @type {import('./$types').PageLoad} */
export async function load({ params, url, fetch }) {
    const { budgetSlug } = params;
    const pageNum = url.searchParams.get('page') || '1';
    const search = url.searchParams.get('search') || '';
    const sort = url.searchParams.get('sort') || 'title';
    const direction = url.searchParams.get('direction') || 'asc';
    const category = url.searchParams.get('category') || '';
    const status = url.searchParams.get('status') || 'live';
    const proposalType = url.searchParams.get('proposalType') || '';
    const initiativeType = url.searchParams.get('initiativeType') || '';

    const apiUrl = import.meta.env.VITE_API_URL || '/api/v0';

    // Fetch budget by slug
    const fetchBudget = await fetch(`${apiUrl}/budgets/?slug=${budgetSlug}`);

    if (!fetchBudget.ok) {
        error(fetchBudget.status, `Failed to load budget: ${fetchBudget.statusText}`);
    }

    const budgetResponse = await fetchBudget.json();
    let budgetData = budgetResponse.data[0];
    if (!budgetData) {
        error(404, `Budget not found`);
    }

    // Load proposals for this budget (API spec §3.4: query param `budget`, response { data, meta })
    const proposalsSearchParams = new URLSearchParams({
        budget: budgetData._id,
        page: pageNum,
        limit: '10',
        sort,
        direction,
    });
    if (search) {
        proposalsSearchParams.set('search', search);
    }
    if (category) {
        proposalsSearchParams.set('category', category);
    }
    if (status) {
        proposalsSearchParams.set('status', status);
    }
    if (proposalType) {
        proposalsSearchParams.set('proposalType', proposalType);
    }
    if (initiativeType) {
        proposalsSearchParams.set('initiativeType', initiativeType);
    }
    const proposalsUrl = `${apiUrl}/proposals?${proposalsSearchParams.toString()}`;
    const token = getJWT();
    const proposalsOpts = { credentials: 'include' };
    if (token) proposalsOpts.headers = { Authorization: `Bearer ${token}` };
    const proposalsResponse = await fetch(proposalsUrl, proposalsOpts);

    let proposals = { data: [], pagination: { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 10 } };
    if (proposalsResponse.ok) {
        const json = await proposalsResponse.json();
        const meta = json.meta ?? {};
        proposals = {
            data: json.data ?? [],
            pagination: {
                currentPage: meta.page ?? 1,
                totalPages: meta.totalPages ?? 1,
                totalItems: meta.total ?? 0,
                itemsPerPage: meta.limit ?? 10,
            },
        };
    }

    // Load categories for this budget once (for mapping strategicFocusArea → title on cards)
    let categories = [];
    const catRes = await fetch(`${apiUrl}/budgets/${budgetData._id}/categories`);
    if (catRes.ok) {
        const catJson = await catRes.json();
        categories = catJson.data ?? [];
    }

    return {
        budget: budgetData,
        proposals,
        categories,
    };
}
