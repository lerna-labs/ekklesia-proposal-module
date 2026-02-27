import { goto } from '$app/navigation';
import { error } from '@sveltejs/kit';
import { writable, get } from 'svelte/store';
import Cookies from 'js-cookie';
const API_URL = import.meta.env.VITE_API_URL;

// Create a writable store to manage the session
export const loggedIn = writable(false);
export const showLogin = writable(false);
/** When set, Comments will open add/reply dialog after login. Shape: { replyTo: comment | null }. Cleared when dialog opens or login is closed. */
export const pendingCommentAction = writable(null);
export const user = writable(null);
export const jwt = writable(null);

// Set JWT in cookie and localStorage (if cookies are not available)
export function setJWT(token, expiresIn) {
	if (typeof document !== 'undefined') {
		// Determine environment and protocol
		const isDev = import.meta.env.DEV;
		const isSecureContext = window.location.protocol === 'https:';

		// Configure cookie settings based on environment
		const cookieOptions = {
			expires: new Date(expiresIn),
			path: '/',
			// Only set secure flag if in production or using HTTPS
			secure: !isDev || isSecureContext,
			// Use 'lax' in development, 'strict' in production
			sameSite: isDev ? 'lax' : 'strict'
		};

		Cookies.set('token', token, cookieOptions);

		// Always store in localStorage as a fallback
		localStorage.setItem('token', token);
	}

	// Update Svelte store
	jwt.set(token);
}

// Get JWT from cookie or localStorage
export function getJWT() {
	let token = null;

	if (Cookies.get('token')) {
		token = decodeURIComponent(Cookies.get('token'));
	} else if (typeof window !== 'undefined' && localStorage.getItem('token')) {
		token = localStorage.getItem('token');
	}

	// console.log('Token from cookie/localStorage:', token);
	jwt.set(token);
	return token;
}

// Handle connection failures gracefully
export const api = {
	fetch: async (fetch, url, options = {}) => {
		try {
			// Get the current JWT token
			const token = get(jwt) || getJWT();

			// Set up headers
			const headers = new Headers(options.headers || {});
			headers.set('Content-Type', 'application/json');

			// Add Authorization header if we have a token
			if (token) {
				headers.set('Authorization', `Bearer ${token}`);
			}

			const response = await fetch(API_URL + url, {
				...options,
				headers,
				credentials: 'include'
			});

			// Check if the token has expired
			if (response.status === 401) {
				// Token has expired, log out the user
				logout();
				throw error(401, 'Token expired, please log in again');
			}

			if (!response.ok) {
				// Parse error body safely (API may return non-JSON, e.g. HTML or plain text)
				const text = await response.text();
				let message = 'An error occurred';
				let errors = undefined;
				try {
					const data = text ? JSON.parse(text) : {};
					message = data.message ?? message;
					if (data.errors != null) errors = data.errors;
				} catch {
					if (text) message = text;
				}
				const body = errors != null ? { message, errors } : { message };
				throw error(response.status, body);
			}

			return response;
		} catch (err) {
			// Properly handle the error to display the SvelteKit error page
			if (err.status && err.body.message) {
				// If it's already a properly formatted error, just re-throw it
				console.log('Re-throwing error:', err);
				throw err;
			} else {
				// Create a proper SvelteKit error
				throw error(500, err.message || 'An error occurred connecting to the API');
			}
		}
	}
};

export const logout = async () => {
	try {
		// Call the backend logout endpoint to clear server-side session
		const response = await fetch(`${API_URL}/session`, {
			method: 'DELETE',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${get(jwt) || getJWT()}`
			},
			credentials: 'include'
		});

		if (!response.ok) {
			console.warn('Server logout failed, continuing with client logout');
		}
	} catch (error) {
		// Continue with client-side logout even if server request fails
		console.error('Error during server logout:', error);
	} finally {
		// Determine environment and protocol (same as in setJWT)
		const isDev = import.meta.env.DEV;
		const isSecureContext = typeof window !== 'undefined' && window.location.protocol === 'https:';

		// Configure cookie removal with the same options used when setting
		const cookieOptions = {
			path: '/',
			secure: !isDev || isSecureContext,
			sameSite: isDev ? 'lax' : 'strict'
		};

		// Clear cookie with matching options
		Cookies.remove('token', cookieOptions);

		// Clear localStorage if present
		if (typeof window !== 'undefined') {
			localStorage.removeItem('token');
		}

		// Clear the session
		jwt.set(null);
		loggedIn.set(false);
		user.set(null);

		// Redirect to the home page after logout
		goto('/');
	}
};
