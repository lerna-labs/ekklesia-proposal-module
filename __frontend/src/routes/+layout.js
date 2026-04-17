import { api, loggedIn, user } from '$stores/sessionManager.js';
const VITE_SERVER_STATUS = import.meta.env.VITE_SERVER_STATUS;
import { error } from '@sveltejs/kit';

export const csr = true; // Client-side rendering only
export const ssr = false; // Disable server-side rendering

export async function load({ fetch }) {
    let serverStatus;
    try {
        serverStatus = await fetch(VITE_SERVER_STATUS);
        if (!serverStatus.ok) {
            throw error(503, {
                message: 'Server not available',
                code: 'SERVER_STATUS_NOT_AVAILABLE'
            });
        }
    } catch (err) {
        if (err?.status) {
            throw err;
        }
        throw error(503, {
            message: 'Server not available',
            code: 'SERVER_STATUS_FETCH_FAILED'
        });
    }

    // SESSION CHECK (cookie-backed)
    try {
        const validate = await api.fetch(fetch, '/session/');
        if (validate.status === 200) {
            const sessionData = await validate.json();
            user.set(sessionData);
            loggedIn.set(true);
        } else {
            loggedIn.set(false);
        }
    } catch (error) {
        console.error('Error validating session:', error);
        loggedIn.set(false);
    }

    return {
        serverStatus: await serverStatus.json()
    };
}
