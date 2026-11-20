import { jsonResponse } from '../_lib.js';

export async function onRequest({ request, env }) {
    if (request.method !== 'GET') {
        return jsonResponse({ error: 'Method not allowed.' }, 405, { Allow: 'GET' });
    }

    const url = env.SUPABASE_URL;
    const anonKey = env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY;
    if (!url || !anonKey) return jsonResponse({ configured: false });

    try {
        const parsedUrl = new URL(url);
        if (parsedUrl.protocol !== 'https:') throw new Error('SUPABASE_URL must use HTTPS.');
        return jsonResponse({ configured: true, url: parsedUrl.origin, anonKey });
    } catch (error) {
        console.error('Supabase public configuration is invalid.', error);
        return jsonResponse({ error: 'Supabase URL configuration is invalid.' }, 500);
    }
}
