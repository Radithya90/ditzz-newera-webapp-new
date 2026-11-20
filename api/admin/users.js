const {
    authEmail,
    getAdminProfiles,
    normalizeProfile,
    readBody,
    requireAdmin,
    sendError,
    supabaseServiceRequest,
    validateProfileInput
} = require('../_lib');

module.exports = async function handler(req, res) {
    try {
        const { user, profile } = await requireAdmin(req);

        if (req.method === 'GET') {
            const profiles = profile.role === 'admin' ? await getAdminProfiles() : [profile];
            return res.status(200).json({ users: profiles.map(normalizeProfile) });
        }

        if (req.method === 'POST') {
            if (profile.role !== 'admin') {
                const error = new Error('Only Admin can create CPanel accounts.');
                error.statusCode = 403;
                throw error;
            }
            const body = readBody(req);
            validateProfileInput(body, true);
            const existing = await getAdminProfiles();
            if (existing.some(item => item.username.toLowerCase() === body.username.toLowerCase())) {
                const error = new Error('Username is already in use.');
                error.statusCode = 409;
                throw error;
            }

            const created = await supabaseServiceRequest('/auth/v1/admin/users', {
                method: 'POST',
                body: JSON.stringify({
                    email: authEmail(body.username),
                    password: body.password,
                    email_confirm: true,
                    user_metadata: { username: body.username }
                })
            });
            const createdUser = created && (created.user || created);
            if (!createdUser || !createdUser.id) throw new Error('Supabase did not return a user ID.');

            try {
                const rows = await supabaseServiceRequest('/rest/v1/admin_profiles', {
                    method: 'POST',
                    headers: { Prefer: 'return=representation' },
                    body: JSON.stringify({
                        user_id: createdUser.id,
                        username: body.username,
                        display_name: body.displayName.trim(),
                        role: body.role,
                        editable_pages: body.role === 'admin' ? [] : body.editablePages || [],
                        avatar_url: body.avatarUrl || null
                    })
                });
                return res.status(201).json({ user: normalizeProfile(rows[0]) });
            } catch (error) {
                await supabaseServiceRequest(`/auth/v1/admin/users/${encodeURIComponent(createdUser.id)}`, { method: 'DELETE' });
                throw error;
            }
        }

        if (req.method === 'PATCH') {
            const body = readBody(req);
            if (typeof body.id !== 'string' || !body.id) {
                const error = new Error('User ID is required.');
                error.statusCode = 400;
                throw error;
            }
            if (profile.role !== 'admin'
                && (body.id !== user.id
                    || (body.role !== undefined && body.role !== profile.role)
                    || body.editablePages !== undefined)) {
                const error = new Error('Non-Admin CPanel accounts may only update their own profile, not account access.');
                error.statusCode = 403;
                throw error;
            }
            validateProfileInput(body, false);

            const profiles = await getAdminProfiles();
            const target = profiles.find(item => item.user_id === body.id);
            if (!target) {
                const error = new Error('Admin account was not found.');
                error.statusCode = 404;
                throw error;
            }
            const nextUsername = body.username === undefined ? target.username : body.username;
            if (profiles.some(item => item.user_id !== body.id && item.username.toLowerCase() === nextUsername.toLowerCase())) {
                const error = new Error('Username is already in use.');
                error.statusCode = 409;
                throw error;
            }
            const nextRole = body.role === undefined ? target.role : body.role;
            if (target.role === 'admin' && nextRole !== 'admin'
                && profiles.filter(item => item.role === 'admin').length <= 1) {
                const error = new Error('The last Admin account cannot be demoted.');
                error.statusCode = 409;
                throw error;
            }
            if (body.id === user.id && nextRole !== profile.role) {
                const error = new Error('You cannot change your own CPanel role.');
                error.statusCode = 403;
                throw error;
            }

            const profilePatch = {
                username: nextUsername,
                display_name: body.displayName === undefined ? target.display_name : body.displayName.trim(),
                role: nextRole,
                editable_pages: nextRole !== 'admin'
                    ? (body.editablePages === undefined ? target.editable_pages || [] : body.editablePages)
                    : []
            };
            if (body.avatarUrl !== undefined) profilePatch.avatar_url = body.avatarUrl || null;
            const updatedRows = await supabaseServiceRequest(
                `/rest/v1/admin_profiles?user_id=eq.${encodeURIComponent(body.id)}`,
                {
                    method: 'PATCH',
                    headers: { Prefer: 'return=representation' },
                    body: JSON.stringify(profilePatch)
                }
            );
            if (!Array.isArray(updatedRows) || !updatedRows[0]) throw new Error('Admin profile could not be updated.');

            const authPatch = {};
            if (nextUsername !== target.username) {
                authPatch.email = authEmail(nextUsername);
                authPatch.email_confirm = true;
                authPatch.user_metadata = { username: nextUsername };
            }
            if (typeof body.password === 'string' && body.password) authPatch.password = body.password;
            if (Object.keys(authPatch).length) {
                try {
                    await supabaseServiceRequest(`/auth/v1/admin/users/${encodeURIComponent(body.id)}`, {
                        method: 'PUT',
                        body: JSON.stringify(authPatch)
                    });
                } catch (error) {
                    await supabaseServiceRequest(
                        `/rest/v1/admin_profiles?user_id=eq.${encodeURIComponent(body.id)}`,
                        {
                            method: 'PATCH',
                            body: JSON.stringify({
                                username: target.username,
                                display_name: target.display_name,
                                role: target.role,
                                avatar_url: target.avatar_url,
                                editable_pages: target.editable_pages || []
                            })
                        }
                    );
                    throw error;
                }
            }
            return res.status(200).json({ user: normalizeProfile(updatedRows[0]) });
        }

        if (req.method === 'DELETE') {
            if (profile.role !== 'admin') {
                const error = new Error('Only Admin can delete CPanel accounts.');
                error.statusCode = 403;
                throw error;
            }
            const id = typeof req.query.id === 'string' ? req.query.id : '';
            if (!id) {
                const error = new Error('User ID is required.');
                error.statusCode = 400;
                throw error;
            }
            if (id === user.id) {
                const error = new Error('Sign in with another Admin account before deleting this account.');
                error.statusCode = 409;
                throw error;
            }
            const profiles = await getAdminProfiles();
            const target = profiles.find(item => item.user_id === id);
            if (!target) return res.status(404).json({ error: 'Admin account was not found.' });
            if (target.role === 'admin' && profiles.filter(item => item.role === 'admin').length <= 1) {
                const error = new Error('The last Admin account cannot be deleted.');
                error.statusCode = 409;
                throw error;
            }
            await supabaseServiceRequest(`/auth/v1/admin/users/${encodeURIComponent(id)}`, { method: 'DELETE' });
            return res.status(200).json({ deleted: true });
        }

        res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
        return res.status(405).json({ error: 'Method not allowed.' });
    } catch (error) {
        return sendError(res, error);
    }
};
