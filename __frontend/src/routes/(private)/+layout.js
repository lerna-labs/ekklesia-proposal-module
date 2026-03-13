import { redirect } from '@sveltejs/kit';
import { redirectAfterLogin } from '$stores/sessionManager.js';
const API_URL = import.meta.env.VITE_API_URL;

/** @type {import('./$types').LayoutLoad} */
export async function load({ fetch, url }) {
	const sessionRes = await fetch(`${API_URL}/session`, { credentials: 'include' });
	if (!sessionRes.ok) {
		redirectAfterLogin.set(url.pathname + url.search);
		redirect(302, '/login');
	}
	const sessionData = await sessionRes.json();
	const userId = sessionData?.userId;
	if (!userId) {
		redirectAfterLogin.set(url.pathname + url.search);
		redirect(302, '/login');
	}
	return {
		user: sessionData,
	};
}
