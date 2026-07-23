import { redirect } from '@sveltejs/kit';
import { get } from 'svelte/store';
import { loggedIn, showLogin } from '$stores/sessionManager.js';

/** @type {import('./$types').PageLoad} */
export async function load({ parent }) {
	await parent();
	if (get(loggedIn)) {
		redirect(302, '/dashboard');
	}
	showLogin.set(true);
	return {};
}
