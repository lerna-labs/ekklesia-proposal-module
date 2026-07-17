import { api } from '$stores/sessionManager.js';

/** @type {import('./$types').PageLoad} */
export async function load({ url, fetch }) {
	const pageNum = url.searchParams.get('page') || '1';
	const limitParam = url.searchParams.get('limit') || '10';
	const limit = Math.min(Math.max(1, parseInt(limitParam, 10) || 10), 100);
	const search = url.searchParams.get('search') || '';
	const slug = url.searchParams.get('slug') || '';

	const params = new URLSearchParams({ page: pageNum, limit: String(limit) });
	if (search) params.set('search', search);
	if (slug) params.set('slug', slug);

	let response;
	try {
		response = await api.fetch(fetch, `/votes?${params.toString()}`);
	} catch (err) {
		// Soft 404 when search/slug filters match nothing (API returns 404)
		if (err?.status === 404) {
			return {
				votes: [],
				meta: {
					page: 1,
					limit,
					total: 0,
					totalPages: 1,
					hasNextPage: false,
					hasPreviousPage: false,
				},
			};
		}
		throw err;
	}

	const json = await response.json();
	const data = json.data ?? [];
	const meta = json.meta ?? {};

	return {
		votes: data,
		meta: {
			page: meta.page ?? 1,
			limit: meta.limit ?? limit,
			total: meta.total ?? 0,
			totalPages: meta.totalPages ?? 1,
			hasNextPage: meta.hasNextPage ?? false,
			hasPreviousPage: meta.hasPreviousPage ?? false,
		},
	};
}
