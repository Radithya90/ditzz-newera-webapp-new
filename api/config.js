module.exports = function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ error: 'Method not allowed.' });
    }

    const url = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
        return res.status(200).json({ configured: false });
    }

    try {
        const parsedUrl = new URL(url);
        if (parsedUrl.protocol !== 'https:') throw new Error('SUPABASE_URL must use HTTPS.');
        return res.status(200).json({ configured: true, url: parsedUrl.origin, anonKey });
    } catch (error) {
        console.error('Supabase public configuration is invalid.', error);
        return res.status(500).json({ error: 'Supabase URL configuration is invalid.' });
    }
};
