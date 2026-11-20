const usernamePattern = /^[a-zA-Z0-9._-]{3,32}$/;

function createError(message, statusCode) {
    const error = new Error(message);
    if (statusCode) error.statusCode = statusCode;
    return error;
}

export function getSupabaseConfig(env) {
    const url = env.SUPABASE_URL;
    const anonKey = env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY;
    const secretKey = env.SUPABASE_SECRET_KEY;
    const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
    const serviceKey = secretKey || serviceRoleKey;
    if (!url || !anonKey || !serviceKey) {
        throw createError('Supabase server environment variables are not configured.', 503);
    }

    let parsedUrl;
    try {
        parsedUrl = new URL(url);
    } catch (error) {
        throw createError('SUPABASE_URL must be a valid HTTPS URL.', 500);
    }
    if (parsedUrl.protocol !== 'https:') {
        throw createError('SUPABASE_URL must use HTTPS.', 500);
    }

    return {
        url: parsedUrl.origin,
        anonKey,
        serviceKey,
        usesSecretKey: Boolean(secretKey)
    };
}

export function jsonResponse(data, status = 200, headers = {}) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Cache-Control': 'no-store',
            'Content-Type': 'application/json; charset=utf-8',
            ...headers
        }
    });
}

export function errorResponse(error) {
    const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;
    if (statusCode >= 500) console.error('Supabase API request failed.', error);
    return jsonResponse({
        error: statusCode >= 500 ? 'Database request failed.' : error.message
    }, statusCode);
}

export async function readBody(request) {
    try {
        const body = await request.json();
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
            throw createError('User details are required.', 400);
        }
        return body;
    } catch (error) {
        if (error.statusCode) throw error;
        throw createError('Request body must be valid JSON.', 400);
    }
}

function requestHeaders(key, bearer) {
    const headers = { apikey: key, 'Content-Type': 'application/json' };
    if (bearer) headers.Authorization = `Bearer ${bearer}`;
    return headers;
}

export async function supabaseServiceRequest(env, pathname, options = {}) {
    const config = getSupabaseConfig(env);
    const headers = {
        apikey: config.serviceKey,
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };
    if (!config.usesSecretKey) headers.Authorization = `Bearer ${config.serviceKey}`;

    const response = await fetch(`${config.url}${pathname}`, {
        ...options,
        headers
    });
    const text = await response.text();
    let data = null;
    if (text) {
        try {
            data = JSON.parse(text);
        } catch (error) {
            throw new Error(`Supabase returned invalid JSON (${response.status}).`);
        }
    }
    if (!response.ok) {
        const failure = new Error(
            data && (data.message || data.error_description || data.error) || `Supabase returned ${response.status}.`
        );
        failure.statusCode = response.status >= 500 ? 502 : response.status;
        throw failure;
    }
    return data;
}

export function normalizeProfile(profile) {
    return {
        id: profile.user_id,
        username: profile.username,
        displayName: profile.display_name,
        role: profile.role,
        profilePhoto: profile.avatar_url || ''
    };
}

export async function requireAdmin(request, env) {
    const authorization = request.headers.get('Authorization') || '';
    const token = authorization.match(/^Bearer\s+(.+)$/i);
    if (!token) throw createError('Please sign in again.', 401);

    const config = getSupabaseConfig(env);
    const response = await fetch(`${config.url}/auth/v1/user`, {
        headers: requestHeaders(config.anonKey, token[1])
    });
    if (!response.ok) throw createError('Your Supabase session is invalid or expired.', 401);
    const user = await response.json();
    const profiles = await supabaseServiceRequest(
        env,
        `/rest/v1/admin_profiles?select=user_id,username,display_name,role,avatar_url&user_id=eq.${encodeURIComponent(user.id)}&limit=1`,
        { method: 'GET' }
    );
    if (!Array.isArray(profiles) || !profiles[0] || !['admin', 'security'].includes(profiles[0].role)) {
        throw createError('CPanel administrator access is required.', 403);
    }
    return { user, profile: profiles[0] };
}

export async function getAdminProfiles(env) {
    return supabaseServiceRequest(
        env,
        '/rest/v1/admin_profiles?select=user_id,username,display_name,role,avatar_url&order=created_at.asc',
        { method: 'GET' }
    );
}

export function authEmail(username) {
    return `${username.toLowerCase()}@auth.ditzznewera.invalid`;
}

export function validateProfileInput(body, creating, env) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        throw createError('User details are required.', 400);
    }
    if (creating || body.username !== undefined) {
        if (typeof body.username !== 'string' || !usernamePattern.test(body.username)) {
            throw createError('Username must be 3-32 letters, numbers, dots, underscores, or hyphens.', 400);
        }
    }
    if (creating || body.displayName !== undefined) {
        if (typeof body.displayName !== 'string' || !body.displayName.trim() || body.displayName.trim().length > 50) {
            throw createError('Display name must be 1-50 characters.', 400);
        }
    }
    if (creating || body.role !== undefined) {
        if (!['admin', 'security'].includes(body.role)) {
            throw createError('Role must be admin or security.', 400);
        }
    }
    if (creating && (typeof body.password !== 'string' || body.password.length < 12)) {
        throw createError('Password must be at least 12 characters.', 400);
    }
    if (body.password !== undefined && body.password !== ''
        && (typeof body.password !== 'string' || body.password.length < 12)) {
        throw createError('Password must be at least 12 characters.', 400);
    }
    if (body.avatarUrl !== undefined && body.avatarUrl !== null && body.avatarUrl !== '') {
        let parsed;
        try {
            parsed = new URL(body.avatarUrl);
        } catch (error) {
            throw createError('Avatar URL must be a valid HTTPS URL.', 400);
        }
        const supabaseUrl = new URL(getSupabaseConfig(env).url);
        if (parsed.protocol !== 'https:' || parsed.origin !== supabaseUrl.origin
            || !parsed.pathname.includes('/storage/v1/object/public/admin-avatars/')) {
            throw createError("Avatar must come from this project's public admin-avatars bucket.", 400);
        }
    }
}
