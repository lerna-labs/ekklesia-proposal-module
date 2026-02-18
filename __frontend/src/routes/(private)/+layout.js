import { redirect } from '@sveltejs/kit';

const API_URL = import.meta.env.VITE_API_URL;

/** @type {import('./$types').LayoutLoad} */
export async function load({ fetch }) {
	const sessionRes = await fetch(`${API_URL}/session`, { credentials: 'include' });
	if (!sessionRes.ok) {
		redirect(302, '/');
	}
	const sessionData = await sessionRes.json();
	const userId = sessionData?.userId;
	if (!userId) {
		redirect(302, '/');
	}
	return {
		user: sessionData,
	};
}
