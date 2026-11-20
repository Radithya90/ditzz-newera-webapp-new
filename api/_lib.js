const usernamePattern = /^[a-zA-Z0-9._-]{3,32}$/;
const accountRoles = new Set(['admin', 'security', 'reseller', 'partner']);
const editablePageIds = new Set([
    'site-status', 'music', 'content', 'products', 'orders', 'messages',
    'announcements', 'visitor-activity', 'settings', 'blocked-visitors'
]);
const { isIP } = require('node:net');

function maskClientIp(value) {
    const rawValue = Array.isArray(value) ? value[0] : value;
    const candidate = String(rawValue || '').split(',')[0].trim().replace(/^\[([^\]]+)\](?::\d+)?$/, '$1');
    const version = isIP(candidate);
    if (version === 4) {
        const octets = candidate.split('.');
        octets[3] = '0';
        return `${octets.join('.')}/24`;
    }
    if (version !== 6) return null;

    let address = candidate.toLowerCase();
    if (address.includes('.')) {
        const separator = address.lastIndexOf(':');
        const ipv4 = address.slice(separator + 1);
        if (isIP(ipv4) !== 4) return null;
        const octets = ipv4.split('.').map(Number);
        address = `${address.slice(0, separator)}:${((octets[0] << 8) | octets[1]).toString(16)}:${((octets[2] << 8) | octets[3]).toString(16)}`;
    }

    const parts = address.split('::');
    if (parts.length > 2) return null;
    const left = parts[0] ? parts[0].split(':') : [];
    const right = parts.length === 2 && parts[1] ? parts[1].split(':') : [];
    const missing = 8 - left.length - right.length;
    if ((parts.length === 1 && missing !== 0) || (parts.length === 2 && missing < 1)) return null;
    const groups = [...left, ...Array(missing).fill('0'), ...right];
    if (groups.some(group => !/^[0-9a-f]{1,4}$/.test(group))) return null;
    return `${groups.slice(0, 3).map(group => parseInt(group, 16).toString(16)).join(':')}::/48`;
}

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
        profilePhoto: profile.avatar_url || '',
        editablePages: Array.isArray(profile.editable_pages) ? profile.editable_pages : []
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
        `/rest/v1/admin_profiles?select=user_id,username,display_name,role,avatar_url,editable_pages&user_id=eq.${encodeURIComponent(user.id)}&limit=1`,
        { method: 'GET' }
    );
    if (!Array.isArray(profiles) || !profiles[0] || !accountRoles.has(profiles[0].role)) {
        const error = new Error('CPanel administrator access is required.');
        error.statusCode = 403;
        throw error;
    }
    return { token: token[1], user, profile: profiles[0] };
}

async function requirePagePermission(req, pageId) {
    const authorization = await requireAdmin(req);
    if (authorization.profile.role !== 'admin'
        && !authorization.profile.editable_pages.includes(pageId)) {
        const error = new Error('You do not have edit access to this CPanel page.');
        error.statusCode = 403;
        throw error;
    }
    return authorization;
}

async function getAdminProfiles() {
    return supabaseServiceRequest(
        '/rest/v1/admin_profiles?select=user_id,username,display_name,role,avatar_url,editable_pages&order=created_at.asc',
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
        if (!accountRoles.has(body.role)) {
            const error = new Error('Role must be admin, security, reseller, or partner.');
            error.statusCode = 400;
            throw error;
        }
    }
    if (body.editablePages !== undefined
        && (!Array.isArray(body.editablePages)
            || body.editablePages.length > editablePageIds.size
            || body.editablePages.some(page => typeof page !== 'string' || !editablePageIds.has(page))
            || new Set(body.editablePages).size !== body.editablePages.length)) {
        const error = new Error('Editable pages contain an unsupported or duplicate page.');
        error.statusCode = 400;
        throw error;
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
    maskClientIp,
    normalizeProfile,
    readBody,
    requireAdmin,
    requirePagePermission,
    sendError,
    supabaseServiceRequest,
    validateProfileInput,
    editablePageIds
};
