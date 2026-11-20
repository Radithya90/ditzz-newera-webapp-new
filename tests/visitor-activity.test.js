const assert = require('node:assert/strict');
const test = require('node:test');
const { maskClientIp } = require('../api/_lib');
const visitorEvents = require('../api/visitor-events');
const adminVisitorEvents = require('../api/admin/visitor-events');
const pruneVisitorData = require('../api/cron/prune-visitor-data');

test('visitor IP masking keeps only the IPv4 /24 and IPv6 /48 networks', () => {
    assert.equal(maskClientIp('203.0.113.42'), '203.0.113.0/24');
    assert.equal(maskClientIp('2001:db8:abcd:1234::1'), '2001:db8:abcd::/48');
    assert.equal(maskClientIp('not-an-ip'), null);
});

test('visitor event API stores a masked IP and rejects unsupported event names', async () => {
    const originalFetch = global.fetch;
    const originalEnv = {
        SUPABASE_URL: process.env.SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
        SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY
    };
    process.env.SUPABASE_URL = 'https://project.supabase.co';
    process.env.SUPABASE_PUBLISHABLE_KEY = 'public-key';
    process.env.SUPABASE_SECRET_KEY = 'server-secret';
    let savedRow;
    let savedBlock;
    let remoteConfig = { blockedVisitorTerms: ['Nama Uji'], approvedVisitors: [] };
    global.fetch = async (url, options) => {
        if (url === 'https://project.supabase.co/rest/v1/site_state?select=config&id=eq.main&limit=1') {
            return new Response(JSON.stringify([{ config: remoteConfig }]), { status: 200 });
        }
        if (url === 'https://project.supabase.co/rest/v1/visitor_blocks?on_conflict=normalized_username') {
            savedBlock = JSON.parse(options.body);
        } else {
            assert.equal(url, 'https://project.supabase.co/rest/v1/visitor_activity');
            savedRow = JSON.parse(options.body);
        }
        return new Response(null, { status: 201 });
    };

    try {
        const response = {
            statusCode: 0,
            body: null,
            status(code) { this.statusCode = code; return this; },
            json(body) { this.body = body; return this; },
            setHeader() {}
        };
        await visitorEvents({
            method: 'POST',
            headers: { 'x-forwarded-for': '203.0.113.42' },
            body: {
                eventType: 'name_violation',
                page: 'index',
                sessionId: '4d9dcb5c-954b-4c20-9db6-a78cc940dc09',
                visitorName: 'Nama Uji',
                violationReason: 'blocked_name',
                fullscreenSupported: true,
                fullscreenActive: false
            }
        }, response);
        assert.equal(response.statusCode, 202);
        assert.equal(savedRow.ip_masked, '203.0.113.0/24');
        assert.equal(savedRow.rule_violation, true);
        assert.equal(savedRow.fullscreen_supported, true);
        assert.equal(savedRow.fullscreen_active, false);
        assert.equal(JSON.stringify(savedRow).includes('203.0.113.42'), false);
        assert.equal(savedBlock.normalized_username, 'namauji');
        assert.equal(savedBlock.created_by, null);

        remoteConfig = { blockedVisitorTerms: ['Nama Uji'], approvedVisitors: ['Nama Uji'] };
        savedBlock = null;
        const approvedNameResponse = {
            statusCode: 0,
            body: null,
            status(code) { this.statusCode = code; return this; },
            json(body) { this.body = body; return this; },
            setHeader() {}
        };
        await visitorEvents({
            method: 'POST',
            headers: {},
            body: {
                eventType: 'name_violation',
                page: 'index',
                sessionId: '4d9dcb5c-954b-4c20-9db6-a78cc940dc09',
                visitorName: 'Nama Uji',
                violationReason: 'blocked_name'
            }
        }, approvedNameResponse);
        assert.equal(approvedNameResponse.statusCode, 202);
        assert.equal(savedBlock, null);
        remoteConfig.approvedVisitors = [];

        const formatWarningResponse = {
            statusCode: 0,
            body: null,
            status(code) { this.statusCode = code; return this; },
            json(body) { this.body = body; return this; },
            setHeader() {}
        };
        await visitorEvents({
            method: 'POST',
            headers: {},
            body: {
                eventType: 'name_violation',
                page: 'index',
                sessionId: '4d9dcb5c-954b-4c20-9db6-a78cc940dc09',
                visitorName: 'Nama Sembarangan',
                violationReason: 'invalid_format'
            }
        }, formatWarningResponse);
        assert.equal(formatWarningResponse.statusCode, 202);
        assert.equal(savedBlock, null);

        const forgedBlockResponse = {
            statusCode: 0,
            body: null,
            status(code) { this.statusCode = code; return this; },
            json(body) { this.body = body; return this; },
            setHeader() {}
        };
        await visitorEvents({
            method: 'POST',
            headers: {},
            body: {
                eventType: 'name_violation',
                page: 'index',
                sessionId: '4d9dcb5c-954b-4c20-9db6-a78cc940dc09',
                visitorName: 'Budi Santoso',
                violationReason: 'blocked_name'
            }
        }, forgedBlockResponse);
        assert.equal(forgedBlockResponse.statusCode, 202);
        assert.equal(savedBlock, null);

        const invalidResponse = {
            statusCode: 0,
            body: null,
            status(code) { this.statusCode = code; return this; },
            json(body) { this.body = body; return this; },
            setHeader() {}
        };
        await visitorEvents({ method: 'POST', headers: {}, body: { eventType: 'password', page: 'index' } }, invalidResponse);
        assert.equal(invalidResponse.statusCode, 400);
        assert.equal(invalidResponse.body.error, 'Event type is not supported.');

        const replyResponse = {
            statusCode: 0,
            body: null,
            status(code) { this.statusCode = code; return this; },
            json(body) { this.body = body; return this; },
            setHeader() {}
        };
        await visitorEvents({
            method: 'POST',
            headers: {},
            body: {
                eventType: 'announcement_response',
                page: 'home',
                sessionId: '4d9dcb5c-954b-4c20-9db6-a78cc940dc09',
                visitorName: 'Nama Uji',
                fullscreenSupported: false,
                fullscreenActive: true
            }
        }, replyResponse);
        assert.equal(replyResponse.statusCode, 202);
        assert.equal(savedRow.event_type, 'announcement_response');
        assert.equal(savedRow.fullscreen_supported, false);
        assert.equal(savedRow.fullscreen_active, true);

        const automaticNameResponse = {
            statusCode: 0,
            body: null,
            status(code) { this.statusCode = code; return this; },
            json(body) { this.body = body; return this; },
            setHeader() {}
        };
        await visitorEvents({
            method: 'POST',
            headers: {},
            body: {
                eventType: 'name_submitted',
                page: 'index',
                sessionId: '4d9dcb5c-954b-4c20-9db6-a78cc940dc09',
                visitorName: 'Pengunjung 1234'
            }
        }, automaticNameResponse);
        assert.equal(automaticNameResponse.statusCode, 202);
        assert.equal(savedRow.event_type, 'name_submitted');
        assert.equal(savedRow.visitor_name, 'Pengunjung 1234');
        assert.equal(savedRow.rule_violation, false);
    } finally {
        global.fetch = originalFetch;
        for (const [key, value] of Object.entries(originalEnv)) {
            if (value === undefined) delete process.env[key];
            else process.env[key] = value;
        }
    }
});

test('visitor music choices store metadata and validate configured Admin tracks', async () => {
    const originalFetch = global.fetch;
    const originalEnv = {
        SUPABASE_URL: process.env.SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
        SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY
    };
    process.env.SUPABASE_URL = 'https://project.supabase.co';
    process.env.SUPABASE_PUBLISHABLE_KEY = 'public-key';
    process.env.SUPABASE_SECRET_KEY = 'server-secret';
    const savedRows = [];
    global.fetch = async (url, options) => {
        if (url === 'https://project.supabase.co/rest/v1/site_state?select=config&id=eq.main&limit=1') {
            return new Response(JSON.stringify([{
                config: {
                    introMusicUrl: 'https://cdn.example.test/intro.mp3',
                    tracks: [{ trackId: 'admin-track-1', name: 'Admin track' }]
                }
            }]), { status: 200 });
        }
        assert.equal(url, 'https://project.supabase.co/rest/v1/visitor_activity');
        savedRows.push(JSON.parse(options.body));
        return new Response(null, { status: 201 });
    };

    try {
        const makeResponse = () => ({
            statusCode: 0,
            body: null,
            status(code) { this.statusCode = code; return this; },
            json(body) { this.body = body; return this; },
            setHeader() {}
        });
        const sendSelection = async musicTrack => {
            const response = makeResponse();
            await visitorEvents({
                method: 'POST',
                headers: {},
                body: {
                    eventType: 'music_selection',
                    page: 'home',
                    sessionId: '4d9dcb5c-954b-4c20-9db6-a78cc940dc09',
                    visitorName: 'Nama Visitor',
                    musicTrack
                }
            }, response);
            return response;
        };

        assert.equal((await sendSelection({
            trackId: 'admin-track-1',
            name: 'Admin track',
            source: 'admin',
            mediaType: 'audio'
        })).statusCode, 202);
        assert.equal(savedRows[0].music_track_id, 'admin-track-1');
        assert.equal(savedRows[0].music_source, 'admin');

        assert.equal((await sendSelection({
            trackId: null,
            name: 'local-song.mp3',
            source: 'local',
            mediaType: 'audio'
        })).statusCode, 202);
        assert.equal(savedRows[1].music_track_id, null);
        assert.equal(savedRows[1].music_track_name, 'local-song.mp3');

        assert.equal((await sendSelection({
            trackId: 'dQw4w9WgXcQ',
            name: 'Visitor YouTube',
            source: 'visitor',
            mediaType: 'youtube'
        })).statusCode, 202);
        assert.equal(savedRows[2].music_source, 'visitor');

        const invalid = await sendSelection({
            trackId: 'not-configured',
            name: 'Unknown Admin track',
            source: 'admin',
            mediaType: 'audio'
        });
        assert.equal(invalid.statusCode, 400);
        assert.equal(savedRows.length, 3);
    } finally {
        global.fetch = originalFetch;
        for (const [key, value] of Object.entries(originalEnv)) {
            if (value === undefined) delete process.env[key];
            else process.env[key] = value;
        }
    }
});

test('visitor activity API requires an authenticated CPanel session', async () => {
    const response = {
        statusCode: 0,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; },
        setHeader() {}
    };
    await adminVisitorEvents({ method: 'GET', headers: {} }, response);
    assert.equal(response.statusCode, 401);
    assert.equal(response.body.error, 'Please sign in again.');
});

test('visitor retention job requires its secret and removes data from both tables', async () => {
    const originalFetch = global.fetch;
    const originalEnv = {
        CRON_SECRET: process.env.CRON_SECRET,
        SUPABASE_URL: process.env.SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
        SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY
    };
    process.env.CRON_SECRET = 'cron-test-secret';
    process.env.SUPABASE_URL = 'https://project.supabase.co';
    process.env.SUPABASE_PUBLISHABLE_KEY = 'public-key';
    process.env.SUPABASE_SECRET_KEY = 'server-secret';
    const requests = [];
    global.fetch = async (url, options) => {
        requests.push({ url, options });
        return new Response(null, { status: 204 });
    };

    try {
        const makeResponse = () => ({
            statusCode: 0,
            body: null,
            status(code) { this.statusCode = code; return this; },
            json(body) { this.body = body; return this; },
            setHeader() {}
        });
        const unauthorized = makeResponse();
        await pruneVisitorData({ method: 'GET', headers: {} }, unauthorized);
        assert.equal(unauthorized.statusCode, 401);
        assert.equal(requests.length, 0);

        const response = makeResponse();
        await pruneVisitorData({
            method: 'GET',
            headers: { authorization: 'Bearer cron-test-secret' }
        }, response);
        assert.equal(response.statusCode, 200);
        assert.equal(response.body.pruned, true);
        assert.equal(requests.length, 2);
        assert.ok(requests.some(request => request.url.includes('/visitor_activity?created_at=lt.')));
        assert.ok(requests.some(request => request.url.includes('/announcement_responses?created_at=lt.')));
    } finally {
        global.fetch = originalFetch;
        for (const [key, value] of Object.entries(originalEnv)) {
            if (value === undefined) delete process.env[key];
            else process.env[key] = value;
        }
    }
});
