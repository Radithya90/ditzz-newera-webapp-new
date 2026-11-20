const usernamePattern = /^[a-zA-Z0-9._-]{3,32}$/;

function getSupabaseConfig() {
    const url = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
    const secretKey = process.env.SUPABASE_SECRET_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const serviceKey = secretKey || serviceRoleKey;
    if (!url || !anonKey || !serviceKey) {
        const error = new Error('Supabase server environment variables are not configured.');
        error.statusCode = 503;
        throw error;
    }
    return {
        url: url.replace(/\/+$/, ''),
        anonKey,
        serviceKey,
        usesSecretKey: Boolean(secretKey)
    };
}

function sendError(res, error) {
    const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;
    if (statusCode >= 500) console.error('Supabase API request failed.', error);
    return res.status(statusCode).json({ error: statusCode >= 500 ? 'Database request failed.' : error.message });
}

function readBody(req) {
    if (req.body && typeof req.body === 'object') return req.body;
    if (typeof req.body === 'string') {
        try {
            return JSON.parse(req.body);
        } catch (error) {
            const invalid = new Error('Request body must be valid JSON.');
            invalid.statusCode = 400;
            throw invalid;
        }
    }
    return {};
}

function requestHeaders(key, bearer) {
    const headers = { apikey: key, 'Content-Type': 'application/json' };
    if (bearer) headers.Authorization = `Bearer ${bearer}`;
    return headers;
}

async function supabaseServiceRequest(path, options) {
    const config = getSupabaseConfig();
    const headers = {
        apikey: config.serviceKey,
        'Content-Type': 'application/json'
    };
    if (!config.usesSecretKey) headers.Authorization = `Bearer ${config.serviceKey}`;
    const response = await fetch(`${config.url}${path}`, {
        ...options,
        headers: {
            ...headers,
            ...(options && options.headers ? options.headers : {})
        }
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
        const failure = new Error(data && (data.message || data.error_description || data.error) || `Supabase returned ${response.status}.`);
        failure.statusCode = response.status >= 500 ? 502 : response.status;
        throw failure;
    }
    return data;
}

function normalizeProfile(profile) {
    return {
        id: profile.user_id,
        username: profile.username,
        displayName: profile.display_name,
        role: profile.role,
        profilePhoto: profile.avatar_url || ''
    };
}

async function requireAdmin(req) {
    const authorization = req.headers.authorization || '';
    const token = authorization.match(/^Bearer\s+(.+)$/i);
    if (!token) {
        const error = new Error('Please sign in again.');
        error.statusCode = 401;
        throw error;
    }

    const config = getSupabaseConfig();
    const response = await fetch(`${config.url}/auth/v1/user`, {
        headers: requestHeaders(config.anonKey, token[1])
    });
    if (!response.ok) {
        const error = new Error('Your Supabase session is invalid or expired.');
        error.statusCode = 401;
        throw error;
    }
    const user = await response.json();
    const profiles = await supabaseServiceRequest(
        `/rest/v1/admin_profiles?select=user_id,username,display_name,role,avatar_url&user_id=eq.${encodeURIComponent(user.id)}&limit=1`,
        { method: 'GET' }
    );
    if (!Array.isArray(profiles) || !profiles[0] || !['admin', 'security'].includes(profiles[0].role)) {
        const error = new Error('CPanel administrator access is required.');
        error.statusCode = 403;
        throw error;
    }
    return { token: token[1], user, profile: profiles[0] };
}

async function getAdminProfiles() {
    return supabaseServiceRequest(
        '/rest/v1/admin_profiles?select=user_id,username,display_name,role,avatar_url&order=created_at.asc',
        { method: 'GET' }
    );
}

function authEmail(username) {
    return `${username.toLowerCase()}@auth.ditzznewera.invalid`;
}

function validateProfileInput(body, creating) {
    if (!body || typeof body !== 'object') {
        const error = new Error('User details are required.');
        error.statusCode = 400;
        throw error;
    }
    if (creating || body.username !== undefined) {
        if (typeof body.username !== 'string' || !usernamePattern.test(body.username)) {
            const error = new Error('Username must be 3-32 letters, numbers, dots, underscores, or hyphens.');
            error.statusCode = 400;
            throw error;
        }
    }
    if (creating || body.displayName !== undefined) {
        if (typeof body.displayName !== 'string' || !body.displayName.trim() || body.displayName.trim().length > 50) {
            const error = new Error('Display name must be 1-50 characters.');
            error.statusCode = 400;
            throw error;
        }
    }
    if (creating || body.role !== undefined) {
        if (!['admin', 'security'].includes(body.role)) {
            const error = new Error('Role must be admin or security.');
            error.statusCode = 400;
            throw error;
        }
    }
    if (creating && (typeof body.password !== 'string' || body.password.length < 12)) {
        const error = new Error('Password must be at least 12 characters.');
        error.statusCode = 400;
        throw error;
    }
    if (body.password !== undefined && body.password !== '' && (typeof body.password !== 'string' || body.password.length < 12)) {
        const error = new Error('Password must be at least 12 characters.');
        error.statusCode = 400;
        throw error;
    }
    if (body.avatarUrl !== undefined && body.avatarUrl !== null && body.avatarUrl !== '') {
        let parsed;
        try {
            parsed = new URL(body.avatarUrl);
        } catch (error) {
            const invalid = new Error('Avatar URL must be a valid HTTPS URL.');
            invalid.statusCode = 400;
            throw invalid;
        }
        const supabaseUrl = new URL(getSupabaseConfig().url);
        if (parsed.protocol !== 'https:' || parsed.origin !== supabaseUrl.origin
            || !parsed.pathname.includes('/storage/v1/object/public/admin-avatars/')) {
            const error = new Error("Avatar must come from this project's public admin-avatars bucket.");
            error.statusCode = 400;
            throw error;
        }
    }
}

module.exports = {
    authEmail,
    getAdminProfiles,
    getSupabaseConfig,
    normalizeProfile,
    readBody,
    requireAdmin,
    sendError,
    supabaseServiceRequest,
    validateProfileInput
};
