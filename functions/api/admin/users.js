import {
    authEmail,
    errorResponse,
    getAdminProfiles,
    jsonResponse,
    normalizeProfile,
    readBody,
    requireAdmin,
    supabaseServiceRequest,
    validateProfileInput
} from '../../_lib.js';

export async function onRequest({ request, env }) {
    try {
        const { user, profile } = await requireAdmin(request, env);

        if (request.method === 'GET') {
            const profiles = await getAdminProfiles(env);
            return jsonResponse({ users: profiles.map(normalizeProfile) });
        }

        if (request.method === 'POST') {
            const body = await readBody(request);
            validateProfileInput(body, true, env);
            const existing = await getAdminProfiles(env);
            if (existing.some(item => item.username.toLowerCase() === body.username.toLowerCase())) {
                const error = new Error('Username is already in use.');
                error.statusCode = 409;
                throw error;
            }

            const created = await supabaseServiceRequest(env, '/auth/v1/admin/users', {
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
                const rows = await supabaseServiceRequest(env, '/rest/v1/admin_profiles', {
                    method: 'POST',
                    headers: { Prefer: 'return=representation' },
                    body: JSON.stringify({
                        user_id: createdUser.id,
                        username: body.username,
                        display_name: body.displayName.trim(),
                        role: body.role,
                        avatar_url: body.avatarUrl || null
                    })
                });
                return jsonResponse({ user: normalizeProfile(rows[0]) }, 201);
            } catch (error) {
                await supabaseServiceRequest(
                    env,
                    `/auth/v1/admin/users/${encodeURIComponent(createdUser.id)}`,
                    { method: 'DELETE' }
                );
                throw error;
            }
        }

        if (request.method === 'PATCH') {
            const body = await readBody(request);
            if (typeof body.id !== 'string' || !body.id) {
                const error = new Error('User ID is required.');
                error.statusCode = 400;
                throw error;
            }
            validateProfileInput(body, false, env);

            const profiles = await getAdminProfiles(env);
            const target = profiles.find(item => item.user_id === body.id);
            if (!target) {
                const error = new Error('Admin account was not found.');
                error.statusCode = 404;
                throw error;
            }
            const nextUsername = body.username === undefined ? target.username : body.username;
            if (profiles.some(item => item.user_id !== body.id
                && item.username.toLowerCase() === nextUsername.toLowerCase())) {
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
                role: nextRole
            };
            if (body.avatarUrl !== undefined) profilePatch.avatar_url = body.avatarUrl || null;
            const updatedRows = await supabaseServiceRequest(
                env,
                `/rest/v1/admin_profiles?user_id=eq.${encodeURIComponent(body.id)}`,
                {
                    method: 'PATCH',
                    headers: { Prefer: 'return=representation' },
                    body: JSON.stringify(profilePatch)
                }
            );
            if (!Array.isArray(updatedRows) || !updatedRows[0]) {
                throw new Error('Admin profile could not be updated.');
            }

            const authPatch = {};
            if (nextUsername !== target.username) {
                authPatch.email = authEmail(nextUsername);
                authPatch.email_confirm = true;
                authPatch.user_metadata = { username: nextUsername };
            }
            if (typeof body.password === 'string' && body.password) authPatch.password = body.password;
            if (Object.keys(authPatch).length) {
                try {
                    await supabaseServiceRequest(
                        env,
                        `/auth/v1/admin/users/${encodeURIComponent(body.id)}`,
                        { method: 'PUT', body: JSON.stringify(authPatch) }
                    );
                } catch (error) {
                    await supabaseServiceRequest(
                        env,
                        `/rest/v1/admin_profiles?user_id=eq.${encodeURIComponent(body.id)}`,
                        {
                            method: 'PATCH',
                            body: JSON.stringify({
                                username: target.username,
                                display_name: target.display_name,
                                role: target.role,
                                avatar_url: target.avatar_url
                            })
                        }
                    );
                    throw error;
                }
            }
            return jsonResponse({ user: normalizeProfile(updatedRows[0]) });
        }

        if (request.method === 'DELETE') {
            const id = new URL(request.url).searchParams.get('id') || '';
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
            const profiles = await getAdminProfiles(env);
            const target = profiles.find(item => item.user_id === id);
            if (!target) return jsonResponse({ error: 'Admin account was not found.' }, 404);
            if (target.role === 'admin' && profiles.filter(item => item.role === 'admin').length <= 1) {
                const error = new Error('The last Admin account cannot be deleted.');
                error.statusCode = 409;
                throw error;
            }
            await supabaseServiceRequest(
                env,
                `/auth/v1/admin/users/${encodeURIComponent(id)}`,
                { method: 'DELETE' }
            );
            return jsonResponse({ deleted: true });
        }

        return jsonResponse({ error: 'Method not allowed.' }, 405, { Allow: 'GET, POST, PATCH, DELETE' });
    } catch (error) {
        return errorResponse(error);
    }
}
