const assert = require('node:assert/strict');
const test = require('node:test');
const profileLibrary = require('../api/_lib');

test('security account permissions accept only unique supported page IDs', () => {
    assert.doesNotThrow(() => profileLibrary.validateProfileInput({
        username: 'safety',
        displayName: 'Safety',
        role: 'security',
        password: 'a-long-enough-password',
        editablePages: ['music', 'blocked-visitors']
    }, true));

    assert.throws(
        () => profileLibrary.validateProfileInput({
            username: 'safety',
            displayName: 'Safety',
            role: 'security',
            password: 'a-long-enough-password',
            editablePages: ['security']
        }, true),
        error => error.statusCode === 400
    );
    assert.throws(
        () => profileLibrary.validateProfileInput({
            username: 'safety',
            displayName: 'Safety',
            role: 'security',
            password: 'a-long-enough-password',
            editablePages: ['music', 'music']
        }, true),
        error => error.statusCode === 400
    );
});

test('all supported CPanel roles may receive explicitly assigned page permissions', () => {
    for (const role of ['security', 'reseller', 'partner']) {
        assert.doesNotThrow(() => profileLibrary.validateProfileInput({
            username: `${role}1`,
            displayName: role,
            role,
            password: 'a-long-enough-password',
            editablePages: ['announcements']
        }, true));
    }
});

test('security accounts cannot enumerate or manage other CPanel accounts', async () => {
    const originals = {
        requireAdmin: profileLibrary.requireAdmin,
        getAdminProfiles: profileLibrary.getAdminProfiles,
        supabaseServiceRequest: profileLibrary.supabaseServiceRequest
    };
    const securityProfile = {
        user_id: 'security-user',
        username: 'safety',
        display_name: 'Safety',
        role: 'security',
        avatar_url: null,
        editable_pages: []
    };
    profileLibrary.requireAdmin = async () => ({
        user: { id: 'security-user' },
        profile: securityProfile
    });
    profileLibrary.getAdminProfiles = async () => [securityProfile];
    profileLibrary.supabaseServiceRequest = async (path, options) => {
        assert.equal(path, '/rest/v1/admin_profiles?user_id=eq.security-user');
        assert.equal(options.method, 'PATCH');
        return [{ ...securityProfile, display_name: 'Safety Updated' }];
    };
    delete require.cache[require.resolve('../api/admin/users')];
    const usersApi = require('../api/admin/users');

    function responseStub() {
        return {
            statusCode: 0,
            body: null,
            status(code) { this.statusCode = code; return this; },
            json(body) { this.body = body; return this; },
            setHeader() {}
        };
    }

    try {
        const getResponse = responseStub();
        await usersApi({ method: 'GET', headers: {} }, getResponse);
        assert.equal(getResponse.statusCode, 200);
        assert.deepEqual(getResponse.body.users.map(user => user.username), ['safety']);

        const postResponse = responseStub();
        await usersApi({ method: 'POST', headers: {}, body: {} }, postResponse);
        assert.equal(postResponse.statusCode, 403);

        const patchResponse = responseStub();
        await usersApi({
            method: 'PATCH',
            headers: {},
            body: { id: 'another-user', username: 'admin', role: 'admin' }
        }, patchResponse);
        assert.equal(patchResponse.statusCode, 403);

        const selfUpdateResponse = responseStub();
        await usersApi({
            method: 'PATCH',
            headers: {},
            body: { id: 'security-user', username: 'safety', displayName: 'Safety Updated', role: 'security' }
        }, selfUpdateResponse);
        assert.equal(selfUpdateResponse.statusCode, 200);
        assert.equal(selfUpdateResponse.body.user.displayName, 'Safety Updated');

        const deleteResponse = responseStub();
        await usersApi({ method: 'DELETE', headers: {}, query: { id: 'another-user' } }, deleteResponse);
        assert.equal(deleteResponse.statusCode, 403);
    } finally {
        profileLibrary.requireAdmin = originals.requireAdmin;
        profileLibrary.getAdminProfiles = originals.getAdminProfiles;
        profileLibrary.supabaseServiceRequest = originals.supabaseServiceRequest;
        delete require.cache[require.resolve('../api/admin/users')];
    }
});
