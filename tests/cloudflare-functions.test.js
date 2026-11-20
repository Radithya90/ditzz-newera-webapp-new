import assert from 'node:assert/strict';
import test from 'node:test';
import { onRequest as handleConfig } from '../functions/api/config.js';
import { onRequest as handleAdminUsers } from '../functions/api/admin/users.js';
import { supabaseServiceRequest } from '../functions/_lib.js';

const validEnv = {
    SUPABASE_URL: 'https://project.supabase.co',
    SUPABASE_PUBLISHABLE_KEY: 'public-key',
    SUPABASE_SECRET_KEY: 'server-only-secret'
};

test('public config exposes only URL and publishable key', async () => {
    const response = await handleConfig({
        request: new Request('https://site.example/api/config'),
        env: validEnv
    });

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await response.json(), {
        configured: true,
        url: 'https://project.supabase.co',
        anonKey: 'public-key'
    });
});

test('public config reports missing Supabase setup without exposing secrets', async () => {
    const response = await handleConfig({
        request: new Request('https://site.example/api/config'),
        env: {}
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { configured: false });
});

test('public config rejects non-GET methods', async () => {
    const response = await handleConfig({
        request: new Request('https://site.example/api/config', { method: 'POST' }),
        env: validEnv
    });

    assert.equal(response.status, 405);
    assert.equal(response.headers.get('allow'), 'GET');
});

test('Admin API rejects requests without a Supabase bearer session', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
        throw new Error('Fetch must not be called for an unauthenticated request.');
    };

    try {
        const response = await handleAdminUsers({
            request: new Request('https://site.example/api/admin/users'),
            env: validEnv
        });
        assert.equal(response.status, 401);
        assert.deepEqual(await response.json(), { error: 'Please sign in again.' });
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test('Supabase secret key is sent only in the apikey header', async () => {
    const originalFetch = globalThis.fetch;
    let capturedHeaders;
    globalThis.fetch = async (url, options) => {
        assert.equal(url, 'https://project.supabase.co/rest/v1/admin_profiles');
        capturedHeaders = new Headers(options.headers);
        return new Response('[]', { status: 200 });
    };

    try {
        await supabaseServiceRequest(validEnv, '/rest/v1/admin_profiles', { method: 'GET' });
        assert.equal(capturedHeaders.get('apikey'), 'server-only-secret');
        assert.equal(capturedHeaders.get('authorization'), null);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test('Admin API verifies the signed-in role before returning accounts', async () => {
    const originalFetch = globalThis.fetch;
    const calls = [];
    globalThis.fetch = async (url, options) => {
        calls.push({ url, headers: new Headers(options.headers) });
        if (url.endsWith('/auth/v1/user')) {
            return Response.json({ id: 'admin-id' });
        }
        if (url.includes('user_id=eq.admin-id')) {
            return Response.json([{
                user_id: 'admin-id',
                username: 'admin',
                display_name: 'Admin',
                role: 'admin',
                avatar_url: null
            }]);
        }
        return Response.json([{
            user_id: 'admin-id',
            username: 'admin',
            display_name: 'Admin',
            role: 'admin',
            avatar_url: null
        }]);
    };

    try {
        const response = await handleAdminUsers({
            request: new Request('https://site.example/api/admin/users', {
                headers: { Authorization: 'Bearer user-session-token' }
            }),
            env: validEnv
        });
        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), {
            users: [{
                id: 'admin-id',
                username: 'admin',
                displayName: 'Admin',
                role: 'admin',
                profilePhoto: ''
            }]
        });
        assert.equal(calls.length, 3);
        assert.equal(calls[0].headers.get('apikey'), 'public-key');
        assert.equal(calls[0].headers.get('authorization'), 'Bearer user-session-token');
        assert.equal(calls[1].headers.get('apikey'), 'server-only-secret');
        assert.equal(calls[1].headers.get('authorization'), null);
    } finally {
        globalThis.fetch = originalFetch;
    }
});
