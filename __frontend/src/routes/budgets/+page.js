import { error } from '@sveltejs/kit';

/** @type {import('./$types').PageLoad} */
export async function load({ url, fetch }) {
	// API spec §3.1 GET /budgets: page (default 1), limit (default 10, max 100), search, slug
	const pageNum = url.searchParams.get('page') || '1';
	const limitParam = url.searchParams.get('limit') || '10';
	const limit = Math.min(Math.max(1, parseInt(limitParam, 10) || 10), 100);
	const search = url.searchParams.get('search') || '';
	const slug = url.searchParams.get('slug') || '';

	const apiUrl = import.meta.env.VITE_API_URL || '/api/v0';
	const params = new URLSearchParams({ page: pageNum, limit: String(limit) });
	if (search) params.set('search', search);
	if (slug) params.set('slug', slug);

	const response = await fetch(`${apiUrl}/budgets?${params.toString()}`);
	console.log(response);

	// Spec: 404 when search or slug provided but no matching budgets — treat as empty result
	if (response.status === 404) {
		return {
			budgets: [],
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

	if (!response.ok) {
		error(response.status, `Failed to load budgets: ${response.statusText}`);
	}

	const json = await response.json();
	const data = json.data ?? [];
	const meta = json.meta ?? {};

	return {
		budgets: data,
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
