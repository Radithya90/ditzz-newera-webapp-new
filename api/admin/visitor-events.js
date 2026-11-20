const { requirePagePermission, sendError, supabaseServiceRequest } = require('../_lib');

module.exports = async function handler(req, res) {
    try {
        if (req.method !== 'GET') {
            res.setHeader('Allow', 'GET');
            return res.status(405).json({ error: 'Method not allowed.' });
        }
        await requirePagePermission(req, 'visitor-activity');

        const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        await supabaseServiceRequest(
            `/rest/v1/visitor_activity?created_at=lt.${encodeURIComponent(cutoff)}`,
            { method: 'DELETE', headers: { Prefer: 'return=minimal' } }
        );
        await supabaseServiceRequest(
            `/rest/v1/announcement_responses?created_at=lt.${encodeURIComponent(cutoff)}`,
            { method: 'DELETE', headers: { Prefer: 'return=minimal' } }
        );
        const rows = await supabaseServiceRequest(
            '/rest/v1/visitor_activity?select=id,session_id,visitor_name,ip_masked,event_type,page,fullscreen_supported,fullscreen_active,rule_violation,violation_reason,music_track_id,music_track_name,music_source,music_media_type,created_at&order=created_at.desc&limit=200',
            { method: 'GET' }
        );
        return res.status(200).json({ events: rows });
    } catch (error) {
        return sendError(res, error);
    }
};
