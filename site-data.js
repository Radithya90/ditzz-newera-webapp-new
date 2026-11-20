(() => {
    const state = {
        client: null,
        configured: false,
        status: 'loading',
        error: null,
        channel: null,
        adminChannel: null
    };
    const html = document.documentElement;
    html.classList.add('ditzz-data-pending');
    const loadingStyle = document.createElement('style');
    loadingStyle.textContent = 'html.ditzz-data-pending body{visibility:hidden!important}.ditzz-database-unavailable{position:fixed;right:12px;bottom:12px;z-index:200001;max-width:min(520px,calc(100vw - 24px));padding:10px 14px;border:1px solid #ffb000;background:#15110a;color:#ffd36a;font:13px/1.5 sans-serif;box-shadow:0 0 18px rgba(255,176,0,.2)}';
    document.head.appendChild(loadingStyle);

    function stableStringify(value) {
        if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
        if (value && typeof value === 'object') {
            return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
        }
        return JSON.stringify(value);
    }

    function setStatus(status, error) {
        state.status = status;
        state.error = error || null;
        const statusNode = document.getElementById('databaseConnectionStatus');
        if (statusNode) {
            statusNode.textContent = status === 'connected'
                ? 'TERHUBUNG — sinkronisasi Realtime aktif.'
                : status === 'loading'
                    ? 'MENGHUBUNGKAN KE SUPABASE...'
                    : status === 'unconfigured'
                        ? 'BELUM TERHUBUNG — atur variabel Supabase di Cloudflare Pages.'
                        : `GANGGUAN DATABASE — ${state.error ? state.error.message : status}`;
        }
        document.dispatchEvent(new CustomEvent('ditzz:database-status', {
            detail: { status, error: state.error }
        }));
        if (['unconfigured', 'error', 'realtime-error'].includes(status)) showUnavailablePage();
        if (status === 'connected') {
            const banner = document.getElementById('ditzzDatabaseUnavailable');
            if (banner) banner.remove();
        }
    }

    function cacheRemoteState(row, reloadOnChange) {
        if (!row) return false;
        let changed = false;
        if (row.config && typeof row.config === 'object' && !Array.isArray(row.config)) {
            const serialized = JSON.stringify(row.config);
            const previous = localStorage.getItem('ditzz_config');
            if (previous !== serialized) {
                localStorage.setItem('ditzz_config', serialized);
                changed = true;
            }
        }
        if (Array.isArray(row.products)) {
            const serialized = JSON.stringify(row.products);
            const previous = localStorage.getItem('ditzz_products');
            if (previous !== serialized) {
                localStorage.setItem('ditzz_products', serialized);
                changed = true;
            }
        }
        if (changed && reloadOnChange) {
            window.setTimeout(() => window.location.reload(), 80);
        }
        return changed;
    }

    async function readRemoteState() {
        const { data, error } = await state.client
            .from('site_state')
            .select('config,products,updated_at')
            .eq('id', 'main')
            .maybeSingle();
        if (error) throw error;
        return data;
    }

    async function refresh() {
        if (!state.client) throw new Error('Supabase belum terhubung. Periksa konfigurasi Cloudflare Pages.');
        const row = await readRemoteState();
        cacheRemoteState(row, true);
        return row;
    }

    function showUnavailablePage() {
        if (!document.body) {
            document.addEventListener('DOMContentLoaded', showUnavailablePage, { once: true });
            return;
        }
        if (document.getElementById('ditzzDatabaseUnavailable')) return;
        const banner = document.createElement('div');
        banner.id = 'ditzzDatabaseUnavailable';
        banner.className = 'ditzz-database-unavailable';
        banner.setAttribute('role', 'status');
        banner.textContent = 'Database belum terhubung. Halaman tetap berjalan dengan data lokal perangkat ini.';
        document.body.insertAdjacentElement('afterbegin', banner);
    }

    async function initialize() {
        try {
            const response = await fetch('/api/config', { cache: 'no-store' });
            if (!response.ok) throw new Error(`Konfigurasi database gagal dimuat (${response.status}).`);
            const config = await response.json();
            if (!config.configured) {
                setStatus('unconfigured');
                showUnavailablePage();
                return;
            }
            if (!window.supabase || typeof window.supabase.createClient !== 'function') {
                throw new Error('Supabase client library did not load.');
            }

            state.configured = true;
            state.client = window.supabase.createClient(config.url, config.anonKey, {
                auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
            });
            const row = await readRemoteState();
            const changed = cacheRemoteState(row, false);
            setStatus('connected');
            if (changed) {
                window.setTimeout(() => window.location.reload(), 80);
                return;
            }
            state.channel = state.client
                .channel('ditzz-public-site-state')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'site_state' }, payload => {
                    cacheRemoteState(payload.new, true);
                })
                .subscribe(channelStatus => {
                    if (channelStatus === 'CHANNEL_ERROR' || channelStatus === 'TIMED_OUT') {
                        setStatus('realtime-error', new Error(`Supabase Realtime status: ${channelStatus}`));
                    } else if (channelStatus === 'SUBSCRIBED') {
                        setStatus('connected');
                    }
                });
            state.client.auth.onAuthStateChange(event => {
                if (event === 'SIGNED_IN') subscribeAdminUpdates();
                if (event === 'SIGNED_OUT' && state.adminChannel) {
                    state.client.removeChannel(state.adminChannel);
                    state.adminChannel = null;
                }
            });
            const { data: sessionData, error: sessionError } = await state.client.auth.getSession();
            if (sessionError) throw sessionError;
            if (sessionData.session) subscribeAdminUpdates();
        } catch (error) {
            console.error('Supabase initialization failed; local cached data remains active.', error);
            setStatus('error', error);
            showUnavailablePage();
        } finally {
            html.classList.remove('ditzz-data-pending');
        }
    }

    async function requireClient() {
        await ready;
        if (!state.client) {
            throw state.error || new Error('Supabase belum dikonfigurasi. Tambahkan variabelnya di Cloudflare Pages.');
        }
        return state.client;
    }

    async function adminRequest(url, method, body) {
        const client = await requireClient();
        const { data, error } = await client.auth.getSession();
        if (error) throw error;
        if (!data.session) throw new Error('Sesi Admin berakhir. Silakan masuk kembali.');
        const response = await fetch(url, {
            method: method || 'GET',
            headers: {
                Authorization: `Bearer ${data.session.access_token}`,
                ...(body ? { 'Content-Type': 'application/json' } : {})
            },
            ...(body ? { body: JSON.stringify(body) } : {})
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || `Permintaan CPanel gagal (${response.status}).`);
        return result;
    }

    function normalizeVisitorName(name) {
        return String(name || '').normalize('NFKC').toLocaleLowerCase('id-ID').replace(/[^\p{L}\p{N}]/gu, '');
    }

    function subscribeAdminUpdates() {
        if (!state.client || state.adminChannel) return;
        state.adminChannel = state.client
            .channel('ditzz-cpanel-updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'contact_messages' }, () => {
                document.dispatchEvent(new CustomEvent('ditzz:messages-changed'));
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'visitor_blocks' }, () => {
                document.dispatchEvent(new CustomEvent('ditzz:visitor-blocks-changed'));
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_profiles' }, () => {
                document.dispatchEvent(new CustomEvent('ditzz:admin-users-changed'));
            })
            .subscribe(channelStatus => {
                if (channelStatus === 'CHANNEL_ERROR' || channelStatus === 'TIMED_OUT') {
                    setStatus('realtime-error', new Error(`Supabase Realtime status: ${channelStatus}`));
                }
            });
    }

    const ready = initialize();
    window.DitzzData = {
        get client() { return state.client; },
        get configured() { return state.configured && Boolean(state.client); },
        get status() { return state.status; },
        get error() { return state.error; },
        ready,
        refresh,
        subscribeAdminUpdates,
        async signIn(username, password) {
            const client = await requireClient();
            const normalizedUsername = String(username || '').trim().toLowerCase();
            const { data, error } = await client.auth.signInWithPassword({
                email: `${normalizedUsername}@auth.ditzznewera.invalid`,
                password
            });
            if (error) throw error;
            const { data: profile, error: profileError } = await client
                .from('admin_profiles')
                .select('user_id,username,display_name,role,avatar_url')
                .eq('user_id', data.user.id)
                .maybeSingle();
            if (profileError || !profile || !['admin', 'security'].includes(profile.role)) {
                await client.auth.signOut();
                throw profileError || new Error('Akun belum diberi role Admin/Keamanan di database.');
            }
            localStorage.removeItem('ditzz_admin_users');
            localStorage.removeItem('ditzz_admin_credentials');
            return {
                id: profile.user_id,
                username: profile.username,
                displayName: profile.display_name,
                role: profile.role,
                profilePhoto: profile.avatar_url || ''
            };
        },
        async signOut() {
            const client = await requireClient();
            const { error } = await client.auth.signOut();
            if (error) throw error;
        },
        async reauthenticate(password) {
            const client = await requireClient();
            const { data: session, error: sessionError } = await client.auth.getSession();
            if (sessionError) throw sessionError;
            if (!session.session || !session.session.user.email) throw new Error('Sesi Admin tidak ditemukan.');
            const { error } = await client.auth.signInWithPassword({
                email: session.session.user.email,
                password
            });
            if (error) throw error;
        },
        async getCurrentAdmin() {
            const client = await requireClient();
            const { data: session, error: sessionError } = await client.auth.getSession();
            if (sessionError) throw sessionError;
            if (!session.session) return null;
            const { data, error } = await client
                .from('admin_profiles')
                .select('user_id,username,display_name,role,avatar_url')
                .eq('user_id', session.session.user.id)
                .maybeSingle();
            if (error) throw error;
            if (!data) return null;
            return {
                id: data.user_id,
                username: data.username,
                displayName: data.display_name,
                role: data.role,
                profilePhoto: data.avatar_url || '',
                email: session.session.user.email
            };
        },
        async saveConfig(config) {
            const client = await requireClient();
            const { data: session, error: sessionError } = await client.auth.getSession();
            if (sessionError) throw sessionError;
            if (!session.session) throw new Error('Masuk ke CPanel untuk menyimpan perubahan.');
            const { error } = await client.from('site_state').upsert({
                id: 'main',
                config,
                updated_at: new Date().toISOString(),
                updated_by: session.session.user.id
            }, { onConflict: 'id' });
            if (error) throw error;
            localStorage.setItem('ditzz_config', JSON.stringify(config));
        },
        async saveProducts(products) {
            const client = await requireClient();
            const { data: session, error: sessionError } = await client.auth.getSession();
            if (sessionError) throw sessionError;
            if (!session.session) throw new Error('Masuk ke CPanel untuk menyimpan perubahan.');
            const { error } = await client.from('site_state').upsert({
                id: 'main',
                products,
                updated_at: new Date().toISOString(),
                updated_by: session.session.user.id
            }, { onConflict: 'id' });
            if (error) throw error;
            localStorage.setItem('ditzz_products', JSON.stringify(products));
        },
        async migrateLocalData(defaults) {
            const client = await requireClient();
            const remote = await readRemoteState();
            const fallback = defaults || {};
            const imported = [];
            if (remote && remote.config === null) {
                const legacyConfig = localStorage.getItem('ditzz_config') || (fallback.config ? JSON.stringify(fallback.config) : null);
                if (legacyConfig) {
                    let config;
                    try {
                        config = JSON.parse(legacyConfig);
                    } catch (error) {
                        throw new Error('Konfigurasi lokal lama tidak valid dan perlu diperbaiki sebelum impor.');
                    }
                    if (!config || typeof config !== 'object' || Array.isArray(config)) {
                        throw new Error('Konfigurasi lokal lama memiliki format yang tidak didukung.');
                    }
                    await this.saveConfig(config);
                    imported.push('pengaturan website');
                }
            }
            if (remote && remote.products === null) {
                const legacyProducts = localStorage.getItem('ditzz_products') || (Array.isArray(fallback.products) ? JSON.stringify(fallback.products) : null);
                if (legacyProducts) {
                    let products;
                    try {
                        products = JSON.parse(legacyProducts);
                    } catch (error) {
                        throw new Error('Katalog lokal lama tidak valid dan perlu diperbaiki sebelum impor.');
                    }
                    if (!Array.isArray(products)) throw new Error('Katalog lokal lama bukan daftar produk yang valid.');
                    await this.saveProducts(products);
                    imported.push('katalog produk');
                }
            }

            const legacyMessagesText = localStorage.getItem('ditzz_messages');
            if (legacyMessagesText) {
                let messages;
                try {
                    messages = JSON.parse(legacyMessagesText);
                } catch (error) {
                    throw new Error('Pesan lokal lama tidak valid dan perlu diperbaiki sebelum impor.');
                }
                if (!Array.isArray(messages)) throw new Error('Data pesan lokal lama bukan daftar yang valid.');
                if (messages.length) {
                    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(legacyMessagesText));
                    const digestHex = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
                    const rows = messages.map((message, index) => {
                        if (!message || typeof message.name !== 'string' || typeof message.email !== 'string'
                            || typeof message.message !== 'string') {
                            throw new Error(`Pesan lokal nomor ${index + 1} tidak lengkap dan tidak dapat diimpor.`);
                        }
                        return {
                            name: message.name,
                            visitor_username: String(message.visitorUsername || 'UNKNOWN'),
                            email: message.email,
                            subject: String(message.subject || 'GENERAL'),
                            message: message.message,
                            display_date: String(message.date || 'Tanggal tidak tersedia'),
                            legacy_ref: `local-${digestHex}-${index}`
                        };
                    });
                    const { error } = await client.from('contact_messages').upsert(rows, {
                        onConflict: 'legacy_ref',
                        ignoreDuplicates: true
                    });
                    if (error) throw error;
                    localStorage.removeItem('ditzz_messages');
                    imported.push(`${messages.length} pesan lama`);
                }
            }
            return imported;
        },
        async submitContactMessage(message) {
            if (!state.client) {
                if (state.status === 'unconfigured') {
                    const messages = JSON.parse(localStorage.getItem('ditzz_messages') || '[]');
                    messages.unshift(message);
                    localStorage.setItem('ditzz_messages', JSON.stringify(messages));
                    return;
                }
                throw state.error || new Error('Database tidak tersedia; pesan belum dikirim.');
            }
            const { error } = await state.client.from('contact_messages').insert({
                name: message.name,
                visitor_username: message.visitorUsername,
                email: message.email,
                subject: message.subject,
                message: message.message,
                display_date: message.date
            });
            if (error) throw error;
        },
        async loadMessages() {
            if (!state.client && state.status === 'unconfigured') {
                return JSON.parse(localStorage.getItem('ditzz_messages') || '[]');
            }
            const client = await requireClient();
            const { data, error } = await client
                .from('contact_messages')
                .select('id,name,visitor_username,email,subject,message,display_date,created_at')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data.map(item => ({
                id: item.id,
                name: item.name,
                visitorUsername: item.visitor_username,
                email: item.email,
                subject: item.subject,
                message: item.message,
                date: item.display_date
            }));
        },
        async clearMessages() {
            if (!state.client && state.status === 'unconfigured') {
                localStorage.removeItem('ditzz_messages');
                return;
            }
            const client = await requireClient();
            const { error } = await client.from('contact_messages').delete().not('id', 'is', null);
            if (error) throw error;
        },
        async checkVisitorBlocked(name) {
            if (!state.client && state.status === 'unconfigured') return false;
            const client = await requireClient();
            const { data, error } = await client.rpc('is_visitor_blocked', {
                p_normalized_username: normalizeVisitorName(name)
            });
            if (error) throw error;
            return data === true;
        },
        async listVisitorBlocks() {
            const client = await requireClient();
            const { data, error } = await client
                .from('visitor_blocks')
                .select('id,username,normalized_username,reason,created_at')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        },
        async addVisitorBlock(username, reason) {
            const client = await requireClient();
            const { data: session, error: sessionError } = await client.auth.getSession();
            if (sessionError) throw sessionError;
            if (!session.session) throw new Error('Masuk ke CPanel untuk mengelola blokir global.');
            const { error } = await client.from('visitor_blocks').insert({
                username: String(username).trim(),
                normalized_username: normalizeVisitorName(username),
                reason: String(reason || '').trim(),
                created_by: session.session.user.id
            });
            if (error) throw error;
        },
        async removeVisitorBlock(id) {
            const client = await requireClient();
            const { error } = await client.from('visitor_blocks').delete().eq('id', id);
            if (error) throw error;
        },
        async uploadProfilePhoto(file, filenameHint) {
            const client = await requireClient();
            if (!['image/png', 'image/gif', 'image/webp', 'image/jpeg'].includes(file.type)) {
                throw new Error('Pilih file PNG, GIF, WEBP, atau JPG.');
            }
            const { data: session, error: sessionError } = await client.auth.getSession();
            if (sessionError) throw sessionError;
            if (!session.session) throw new Error('Masuk ke CPanel untuk mengunggah foto.');
            const extension = file.type.split('/')[1].replace('jpeg', 'jpg');
            const safeName = String(filenameHint || 'profile').replace(/[^a-zA-Z0-9._-]/g, '-');
            const objectPath = `${session.session.user.id}/${Date.now()}-${safeName}.${extension}`;
            const { error } = await client.storage.from('admin-avatars').upload(objectPath, file, {
                contentType: file.type,
                upsert: false
            });
            if (error) throw error;
            return client.storage.from('admin-avatars').getPublicUrl(objectPath).data.publicUrl;
        },
        listAdminUsers() {
            return adminRequest('/api/admin/users').then(result => result.users);
        },
        createAdminUser(details) {
            return adminRequest('/api/admin/users', 'POST', details).then(result => result.user);
        },
        async updateAdminUser(details) {
            const result = await adminRequest('/api/admin/users', 'PATCH', details);
            const client = await requireClient();
            const { data: session, error: sessionError } = await client.auth.getSession();
            if (sessionError) throw sessionError;
            if (session.session && details.id === session.session.user.id && details.username) {
                const { error } = await client.auth.refreshSession();
                if (error) throw error;
            }
            return result.user;
        },
        deleteAdminUser(id) {
            return adminRequest(`/api/admin/users?id=${encodeURIComponent(id)}`, 'DELETE');
        }
    };
    window.addEventListener('load', () => {
        setStatus(state.status, state.error);
    });
})();
