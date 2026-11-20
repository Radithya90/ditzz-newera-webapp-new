const { maskClientIp, readBody, sendError, supabaseServiceRequest } = require('./_lib');

const eventTypes = new Set(['page_view', 'name_submitted', 'name_violation', 'feature_open', 'announcement_response', 'fullscreen_status']);
const pages = new Set([
    'index', 'home', 'about', 'store', 'contact', 'updates', 'events',
    'gallery', 'faq', 'community', 'guide'
]);
const violationReasons = new Set(['blocked_name', 'invalid_format', 'inappropriate_name']);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validationError(message) {
    const error = new Error(message);
    error.statusCode = 400;
    return error;
}

function normalizeVisitorName(value) {
    return String(value || '').normalize('NFKC').toLocaleLowerCase('id-ID').replace(/[^\p{L}\p{N}]/gu, '');
}

function normalizeVisitorWords(value) {
    return String(value || '').normalize('NFKC').toLocaleLowerCase('id-ID').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

async function matchesConfiguredBlockedName(name) {
    const rows = await supabaseServiceRequest(
        '/rest/v1/site_state?select=config&id=eq.main&limit=1',
        { method: 'GET' }
    );
    const config = rows && rows[0] && rows[0].config || {};
    const normalizedName = normalizeVisitorName(name);
    const approvedNames = Array.isArray(config.approvedVisitors) ? config.approvedVisitors : [];
    if (approvedNames.some(approved => normalizeVisitorName(approved) === normalizedName)) return false;

    const terms = Array.isArray(config.blockedVisitorTerms)
        ? config.blockedVisitorTerms
        : ['yunus', 'yunus dandul', 'yunusdandul', 'ndal ndul', 'ndul', 'yusit'];
    const nameWords = normalizeVisitorWords(name);
    const normalizedWords = ` ${nameWords} `;
    const nameParts = nameWords.split(' ').filter(Boolean);
    return terms.some(term => {
        if (typeof term !== 'string') return false;
        const normalizedTerm = normalizeVisitorWords(term);
        const termParts = normalizedTerm.split(' ').filter(Boolean);
        const compactTerm = normalizeVisitorName(term);
        return Boolean(
            (normalizedTerm && normalizedWords.includes(` ${normalizedTerm} `))
            || (termParts.length > 1 && termParts.every(part => nameParts.includes(part)))
            || (compactTerm.length >= 4 && normalizedName.includes(compactTerm))
        );
    });
}

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed.' });
    }

    try {
        const body = readBody(req);
        if (!eventTypes.has(body.eventType)) throw validationError('Event type is not supported.');
        if (!pages.has(body.page)) throw validationError('Page is not supported.');
        if (typeof body.sessionId !== 'string' || !uuidPattern.test(body.sessionId)) {
            throw validationError('Visitor session ID is invalid.');
        }
        if ((body.fullscreenSupported !== undefined && typeof body.fullscreenSupported !== 'boolean')
            || (body.fullscreenActive !== undefined && typeof body.fullscreenActive !== 'boolean')) {
            throw validationError('Fullscreen status must use boolean values.');
        }
        if (body.visitorName !== null && body.visitorName !== undefined
            && (typeof body.visitorName !== 'string' || body.visitorName.trim().length > 40)) {
            throw validationError('Visitor name must be at most 40 characters.');
        }
        if (body.eventType === 'name_violation' && !violationReasons.has(body.violationReason)) {
            throw validationError('Violation type is not supported.');
        }

        const visitorName = typeof body.visitorName === 'string' ? body.visitorName.trim() : null;
        const headers = req.headers || {};
        const maskedIp = maskClientIp(headers['x-forwarded-for'] || headers['x-real-ip']);
        if (body.eventType === 'name_violation' && body.violationReason === 'blocked_name' && visitorName
            && await matchesConfiguredBlockedName(visitorName)) {
            const normalizedUsername = normalizeVisitorName(visitorName);
            if (normalizedUsername) {
                await supabaseServiceRequest('/rest/v1/visitor_blocks?on_conflict=normalized_username', {
                    method: 'POST',
                    headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
                    body: JSON.stringify({
                        username: visitorName,
                        normalized_username: normalizedUsername,
                        reason: 'Blokir permanen otomatis: nama masuk daftar terlarang',
                        created_by: null
                    })
                });
            }
        }
        await supabaseServiceRequest('/rest/v1/visitor_activity', {
            method: 'POST',
            headers: { Prefer: 'return=minimal' },
            body: JSON.stringify({
                session_id: body.sessionId,
                visitor_name: visitorName || null,
                ip_masked: maskedIp,
                event_type: body.eventType,
                page: body.page,
                fullscreen_supported: body.fullscreenSupported === true,
                fullscreen_active: body.fullscreenActive === true,
                rule_violation: body.eventType === 'name_violation',
                violation_reason: body.eventType === 'name_violation' ? body.violationReason : null
            })
        });
        return res.status(202).json({ recorded: true });
    } catch (error) {
        return sendError(res, error);
    }
};
