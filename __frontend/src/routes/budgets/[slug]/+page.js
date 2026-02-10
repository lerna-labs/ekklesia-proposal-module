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

    // Load proposals for this budget (API spec §3.4: query param `budget`, response { data, meta })
    const proposalsSearchParams = new URLSearchParams({
        budget: budget._id,
        page: pageNum,
        limit: '10',
        sort,
        direction,
    });
    if (search) {
        proposalsSearchParams.set('search', search);
    }
    const proposalsUrl = `${apiUrl}/proposals?${proposalsSearchParams.toString()}`;
    const proposalsResponse = await fetch(proposalsUrl);

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

    return {
        budget,
        proposals,
        slug,
    };
}
