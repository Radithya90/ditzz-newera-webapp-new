const { sendError, supabaseServiceRequest } = require('../_lib');

module.exports = async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ error: 'Method not allowed.' });
    }

    const secret = process.env.CRON_SECRET;
    if (!secret) {
        return res.status(503).json({ error: 'CRON_SECRET is not configured.' });
    }
    if (req.headers.authorization !== `Bearer ${secret}`) {
        return res.status(401).json({ error: 'Unauthorized.' });
    }

    try {
        const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        await supabaseServiceRequest(
            `/rest/v1/visitor_activity?created_at=lt.${encodeURIComponent(cutoff)}`,
            { method: 'DELETE', headers: { Prefer: 'return=minimal' } }
        );
        await supabaseServiceRequest(
            `/rest/v1/announcement_responses?created_at=lt.${encodeURIComponent(cutoff)}`,
            { method: 'DELETE', headers: { Prefer: 'return=minimal' } }
        );
        return res.status(200).json({ pruned: true });
    } catch (error) {
        return sendError(res, error);
    }
};
