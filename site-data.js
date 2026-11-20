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

    [
        'ditzz_visitor_name',
        'ditzz_visitor_default_name',
        'ditzz_visitor_mode',
        'ditzz_selected_track_id',
        'ditzz_selected_track_name',
        'ditzz_selected_track_source',
        'ditzz_selected_track_url',
        'ditzz_selected_track_media_type',
        'ditzz_audio_time',
        'ditzz_audio_last_saved',
        'ditzz_audio_playing',
        'ditzz_volume'
    ].forEach(key => localStorage.removeItem(key));

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
                        ? 'BELUM TERHUBUNG — atur URL dan anon key Supabase di Vercel.'
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
        if (!state.client) throw new Error('Supabase belum terhubung. Periksa konfigurasi Vercel.');
        const row = await readRemoteState();
        cacheRemoteState(row, true);
        return row;
    }

    function currentPageKey() {
        const page = window.location.pathname.split('/').pop() || 'index.html';
        return page.replace(/\.html$/i, '') || 'index';
    }

    function visitorSessionId() {
        let sessionId = sessionStorage.getItem('ditzz_visitor_session_id');
        if (!sessionId) {
            sessionId = crypto.randomUUID();
            sessionStorage.setItem('ditzz_visitor_session_id', sessionId);
        }
        return sessionId;
    }

    function safeBackgroundUrl(value) {
        if (typeof value !== 'string' || !value.trim()) return '';
        try {
            const url = new URL(value.trim());
            return url.protocol === 'https:'
                && /\.(mp4|webm|ogg|ogv|gif|apng|webp|png|jpe?g)$/i.test(url.pathname) ? url.href : '';
        } catch (error) {
            return '';
        }
    }

    function appendBackgroundMedia(target, value, className) {
        const mediaUrl = safeBackgroundUrl(value);
        if (!mediaUrl) return;
        if (/\.(gif|apng|webp|png|jpe?g)$/i.test(new URL(mediaUrl).pathname)) {
            const image = document.createElement('img');
            image.className = className;
            image.src = mediaUrl;
            image.alt = '';
            target.appendChild(image);
            return;
        }
        const video = document.createElement('video');
        video.className = className;
        video.src = mediaUrl;
        video.autoplay = true;
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        target.appendChild(video);
    }

    function appendCooldown(target, endsAt, updatedAt, className) {
        const cooldown = document.createElement('div');
        cooldown.className = className;
        const label = document.createElement('span');
        label.className = 'ditzz-cooldown-label';
        const track = document.createElement('span');
        track.className = 'ditzz-cooldown-track';
        const progress = document.createElement('span');
        progress.className = 'ditzz-cooldown-progress';
        track.appendChild(progress);
        cooldown.append(label, track);

        const endTime = Date.parse(endsAt || '');
        const startTime = Date.parse(updatedAt || '');
        if (!Number.isFinite(endTime)) {
            label.textContent = 'COOLDOWN: BELUM DIJADWALKAN';
            progress.style.width = '0%';
            target.appendChild(cooldown);
            return;
        }
        const totalMs = Math.max(1000, endTime - (Number.isFinite(startTime) ? startTime : Date.now()));
        const update = () => {
            const remainingMs = endTime - Date.now();
            if (remainingMs <= 0) {
                label.textContent = 'COOLDOWN SELESAI — MENUNGGU PEMBARUAN ADMIN';
                progress.style.width = '100%';
                window.clearInterval(timer);
                return;
            }
            const totalSeconds = Math.ceil(remainingMs / 1000);
            const days = Math.floor(totalSeconds / 86400);
            const hours = Math.floor((totalSeconds % 86400) / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            const time = days
                ? `${days}H ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
                : `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            label.textContent = `COOLDOWN SELESAI DALAM ${time}`;
            progress.style.width = `${Math.max(0, Math.min(100, ((totalMs - remainingMs) / totalMs) * 100))}%`;
        };
        const timer = window.setInterval(update, 1000);
        update();
        target.appendChild(cooldown);
    }

    function appendStatusAudio(panel, presentation, backLink, title) {
        const audioUrl = String(presentation.audioUrl || '');
        const validAudioUrl = (() => {
            try {
                const url = new URL(audioUrl);
                return url.protocol === 'https:' && /\.(mp3|m4a|wav|ogg|aac)$/i.test(url.pathname) ? url.href : '';
            } catch (error) {
                return '';
            }
        })();
        if (validAudioUrl) {
            const audio = document.createElement('audio');
            audio.className = 'ditzz-status-audio-file';
            audio.controls = true;
            audio.preload = 'none';
            audio.src = validAudioUrl;
            audio.setAttribute('aria-label', title);
            panel.insertBefore(audio, backLink);
            return;
        }
        const musicId = String(presentation.musicId || '');
        if (!/^[\w-]{11}$/.test(musicId)) return;
        const musicButton = document.createElement('button');
        musicButton.className = 'ditzz-status-music';
        musicButton.type = 'button';
        musicButton.textContent = 'PUTAR AUDIO STATUS';
        musicButton.addEventListener('click', () => {
            const player = document.createElement('iframe');
            player.className = 'ditzz-status-audio';
            player.title = title;
            player.allow = 'autoplay; encrypted-media; picture-in-picture';
            player.referrerPolicy = 'strict-origin-when-cross-origin';
            player.src = `https://www.youtube.com/embed/${musicId}?autoplay=1&playsinline=1&enablejsapi=1&origin=${encodeURIComponent(location.origin)}`;
            panel.insertBefore(player, backLink);
            musicButton.textContent = 'AUDIO STATUS AKTIF';
            musicButton.disabled = true;
        }, { once: true });
        panel.insertBefore(musicButton, backLink);
    }

    function renderStatusOverlay(id, title, presentation, details) {
        if (document.getElementById(id) || !document.body) return;
        const overlay = document.createElement('div');
        overlay.id = id;
        overlay.className = 'ditzz-status-overlay';
        overlay.setAttribute('role', 'status');
        overlay.setAttribute('aria-live', 'polite');

        appendBackgroundMedia(overlay, presentation.backgroundVideoUrl, 'ditzz-status-video');

        const panel = document.createElement('section');
        panel.className = 'ditzz-status-panel';
        const kicker = document.createElement('p');
        kicker.className = 'ditzz-status-kicker';
        kicker.textContent = '// DITZZ NEWERA SYSTEM NOTICE';
        const heading = document.createElement('h1');
        heading.textContent = presentation.title || title;
        const message = document.createElement('p');
        message.className = 'ditzz-status-message';
        message.textContent = presentation.message || 'Kami sedang menyiapkan pembaruan. Silakan kembali beberapa saat lagi.';
        panel.append(kicker, heading, message);

        if (presentation.repairPlan) {
            const plan = document.createElement('p');
            plan.className = 'ditzz-status-plan';
            plan.textContent = `Yang sedang diperbaiki: ${presentation.repairPlan}`;
            panel.appendChild(plan);
        }
        if (details && details.adminName) {
            const administrator = document.createElement('p');
            administrator.className = 'ditzz-status-meta';
            const updatedAt = details.updatedAt && Number.isFinite(Date.parse(details.updatedAt))
                ? ` — ${new Date(details.updatedAt).toLocaleString('id-ID')}`
                : '';
            administrator.textContent = `Diperbarui oleh ${details.adminName}${updatedAt}`;
            panel.appendChild(administrator);
        }

        const backLink = document.createElement('a');
        backLink.className = 'ditzz-status-back';
        backLink.href = details && details.global ? '/index.html' : '/home.html';
        backLink.textContent = 'KEMBALI KE HALAMAN UTAMA';
        panel.appendChild(backLink);
        appendCooldown(panel, details && details.endsAt, details && details.updatedAt, 'ditzz-status-countdown');
        appendStatusAudio(panel, presentation, backLink, 'Audio informasi status');
        overlay.appendChild(panel);
        document.body.appendChild(overlay);
    }

    function applyGlobalSiteStatus(config) {
        if (window.location.pathname.startsWith('/admin/')) return;
        const status = config.siteStatus || {};
        if (!['maintenance', 'offline'].includes(status.mode)) return;
        renderStatusOverlay(
            'ditzzGlobalSiteStatus',
            status.title || (status.mode === 'offline' ? 'AKSES WEBSITE SEMENTARA DITUTUP' : 'WEBSITE SEDANG DIPERBAIKI'),
            status,
            { adminName: status.adminName, endsAt: status.endsAt, updatedAt: status.updatedAt, global: true }
        );
    }

    function applyFeatureAvailability(config) {
        if (window.location.pathname.startsWith('/admin/') || document.getElementById('ditzzGlobalSiteStatus')) return false;
        const pageFeature = document.body.dataset.feature || document.body.dataset.extraPage || currentPageKey();
        const feature = pageFeature === 'index' ? 'home' : pageFeature;
        const status = (config.featureStatus || {})[feature] || 'available';
        if (status === 'available') {
            applyMusicFeatureStatus(config);
            return false;
        }
        const presentation = (config.featurePresentation || {})[feature] || {};
        const title = status === 'comingSoon' ? 'FITUR SEGERA HADIR' : 'FITUR SEDANG DIPERBARUI';
        renderStatusOverlay(
            'ditzzFeatureStatus',
            title,
            {
                message: presentation.message || config.featureStatusMessage,
                title: presentation.title,
                repairPlan: presentation.repairPlan,
                backgroundVideoUrl: presentation.backgroundVideoUrl,
                musicId: presentation.musicId,
                audioUrl: presentation.audioUrl
            },
            { adminName: presentation.adminName, endsAt: presentation.endsAt, updatedAt: presentation.updatedAt }
        );
        return true;
    }

    function applyMusicFeatureStatus(config) {
        const status = (config.featureStatus || {}).music || 'available';
        if (status === 'available' && config.websiteMusicEnabled !== false) return;
        if (!document.body || document.getElementById('ditzzMusicStatus')) return;

        const presentation = (config.featurePresentation || {}).music || {};
        const panel = document.createElement('aside');
        panel.id = 'ditzzMusicStatus';
        panel.className = 'ditzz-music-status';
        panel.setAttribute('role', 'status');
        panel.setAttribute('aria-live', 'polite');
        appendBackgroundMedia(panel, presentation.backgroundVideoUrl, 'ditzz-music-status-video');

        const heading = document.createElement('strong');
        heading.textContent = presentation.title || (config.websiteMusicEnabled === false
            ? 'MUSIK DINONAKTIFKAN OLEH ADMIN'
            : status === 'comingSoon' ? 'FITUR MUSIK SEGERA HADIR' : 'FITUR MUSIK SEDANG DIPERBARUI');
        const message = document.createElement('span');
        message.textContent = presentation.message || config.featureStatusMessage
            || 'Pemutar musik sedang diperbarui.';
        panel.append(heading, message);
        if (presentation.repairPlan) {
            const plan = document.createElement('span');
            plan.textContent = `Perbaikan: ${presentation.repairPlan}`;
            panel.appendChild(plan);
        }
        if (presentation.adminName) {
            const administrator = document.createElement('span');
            administrator.textContent = `Diperbarui oleh ${presentation.adminName}`;
            panel.appendChild(administrator);
        }

        appendCooldown(panel, presentation.endsAt, presentation.updatedAt, 'ditzz-music-status-countdown');
        appendStatusAudio(panel, presentation, null, 'Audio informasi status musik');

        document.body.appendChild(panel);
    }

    function renderAnnouncement(announcement) {
        const previous = document.getElementById('ditzzLiveAnnouncement');
        if (previous) previous.remove();
        if (!announcement || !Array.isArray(announcement.target_roles)
            || !announcement.target_roles.includes('visitor')
            || Date.parse(announcement.expires_at) <= Date.now()
            || window.location.pathname.startsWith('/admin/')
            || document.getElementById('ditzzGlobalSiteStatus')) return;

        const panel = document.createElement('section');
        panel.id = 'ditzzLiveAnnouncement';
        panel.className = 'ditzz-announcement';
        panel.setAttribute('aria-labelledby', 'ditzzAnnouncementTitle');
        const title = document.createElement('h2');
        title.id = 'ditzzAnnouncementTitle';
        title.textContent = 'PESAN LANGSUNG DARI ADMIN';
        const message = document.createElement('p');
        message.className = 'ditzz-announcement-message';
        message.textContent = announcement.message;
        const author = document.createElement('p');
        author.className = 'ditzz-announcement-meta';
        author.textContent = `Dari ${announcement.created_by_name || 'Admin'}`;
        const countdown = document.createElement('p');
        countdown.className = 'ditzz-announcement-meta';
        const responseForm = document.createElement('form');
        const responseInput = document.createElement('textarea');
        responseInput.maxLength = 500;
        responseInput.required = true;
        responseInput.placeholder = 'Tulis balasan singkat (maks. 500 karakter)';
        const submit = document.createElement('button');
        submit.type = 'submit';
        submit.textContent = 'KIRIM BALASAN';
        const feedback = document.createElement('p');
        feedback.className = 'ditzz-announcement-feedback';
        responseForm.append(responseInput, submit, feedback);
        const close = document.createElement('button');
        close.type = 'button';
        close.className = 'ditzz-announcement-close';
        close.setAttribute('aria-label', 'Tutup pengumuman');
        close.textContent = '×';
        close.addEventListener('click', () => panel.remove());
        panel.append(close, title, message, author, countdown, responseForm);
        document.body.appendChild(panel);

        const updateCountdown = () => {
            const remainingMs = Date.parse(announcement.expires_at) - Date.now();
            if (remainingMs <= 0) {
                panel.remove();
                window.clearInterval(countdownTimer);
                return;
            }
            countdown.textContent = `INFO HILANG DALAM ${Math.ceil(remainingMs / 1000)} DETIK`;
        };
        const countdownTimer = window.setInterval(updateCountdown, 1000);
        updateCountdown();
        responseForm.addEventListener('submit', async event => {
            event.preventDefault();
            submit.disabled = true;
            feedback.textContent = 'Mengirim balasan...';
            try {
                const client = await requireClient();
                const { error } = await client.from('announcement_responses').insert({
                    announcement_id: announcement.id,
                    visitor_name: (sessionStorage.getItem('ditzz_visitor_name') || 'Pengunjung').slice(0, 40),
                    response: responseInput.value.trim()
                });
                if (error) throw error;
                feedback.textContent = 'Balasan terkirim ke CPanel.';
                responseInput.value = '';
                if (window.DitzzData) {
                    window.DitzzData.recordVisitorEvent('announcement_response').catch(error => {
                        console.error('Announcement response activity could not be recorded.', error);
                    });
                }
            } catch (error) {
                feedback.textContent = error.message || 'Balasan belum dapat dikirim.';
            } finally {
                submit.disabled = false;
            }
        });
    }

    async function loadActiveAnnouncement() {
        if (!state.client || window.location.pathname.startsWith('/admin/')) return;
        const { data, error } = await state.client
            .from('site_announcements')
            .select('id,message,created_by_name,created_at,expires_at,target_roles')
            .contains('target_roles', ['visitor'])
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        if (error) throw error;
        renderAnnouncement(data);
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

            const projectRef = new URL(config.url).hostname.split('.')[0];
            const legacyAuthKey = `sb-${projectRef}-auth-token`;
            localStorage.removeItem(legacyAuthKey);
            localStorage.removeItem(`${legacyAuthKey}-code-verifier`);
            state.configured = true;
            state.client = window.supabase.createClient(config.url, config.anonKey, {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: true,
                    storage: window.sessionStorage
                }
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
                .on('postgres_changes', { event: '*', schema: 'public', table: 'site_announcements' }, () => {
                    document.dispatchEvent(new CustomEvent('ditzz:announcements-changed'));
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
            throw state.error || new Error('Supabase belum dikonfigurasi. Tambahkan URL dan anon key di Vercel.');
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

    async function writeSiteState(client, userId, values) {
        const row = {
            ...values,
            updated_at: new Date().toISOString(),
            updated_by: userId
        };
        const { data, error } = await client.from('site_state')
            .update(row)
            .eq('id', 'main')
            .select('id');
        if (error) throw error;
        if (Array.isArray(data) && data.length) return;

        const { error: insertError } = await client.from('site_state')
            .insert({ id: 'main', ...row });
        if (insertError) throw insertError;
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
            .on('postgres_changes', { event: '*', schema: 'public', table: 'site_announcements' }, () => {
                document.dispatchEvent(new CustomEvent('ditzz:announcements-changed'));
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'announcement_responses' }, () => {
                document.dispatchEvent(new CustomEvent('ditzz:announcement-responses-changed'));
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
        applyFeatureAvailability,
        async recordVisitorEvent(eventType, visitorName, violationReason, fullscreenSnapshot, musicTrack) {
            await ready;
            if (!state.client) return false;
            const fullscreenSupported = fullscreenSnapshot
                ? fullscreenSnapshot.supported
                : Boolean(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen);
            const fullscreenActive = fullscreenSnapshot
                ? fullscreenSnapshot.active
                : Boolean(document.fullscreenElement || document.webkitFullscreenElement);
            const response = await fetch('/api/visitor-events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventType,
                    page: currentPageKey(),
                    sessionId: visitorSessionId(),
                    visitorName: visitorName === undefined
                        ? sessionStorage.getItem('ditzz_visitor_name')
                        : visitorName,
                    violationReason,
                    fullscreenSupported,
                    fullscreenActive,
                    musicTrack
                })
            });
            let result = {};
            try {
                result = await response.json();
            } catch (error) {
                throw new Error(`Visitor event API returned invalid JSON (${response.status}).`);
            }
            if (!response.ok) throw new Error(result.error || `Visitor event could not be stored (${response.status}).`);
            return true;
        },
        async loadVisitorEvents() {
            const result = await adminRequest('/api/admin/visitor-events');
            return result.events;
        },
        async publishAnnouncement(message, durationMinutes, admin, targetRoles) {
            const client = await requireClient();
            const { data: session, error: sessionError } = await client.auth.getSession();
            if (sessionError) throw sessionError;
            if (!session.session) throw new Error('Masuk ke CPanel untuk menerbitkan pengumuman.');
            const duration = Number(durationMinutes);
            if (!Number.isInteger(duration) || duration < 1 || duration > 1440) {
                throw new Error('Durasi pengumuman harus 1-1440 menit.');
            }
            const cleanMessage = String(message || '').trim();
            const adminName = String(admin && admin.displayName || admin && admin.username || '').trim();
            const allowedTargets = new Set(['visitor', 'security', 'reseller', 'partner']);
            const recipients = Array.isArray(targetRoles) ? [...new Set(targetRoles)] : ['visitor'];
            if (!cleanMessage || cleanMessage.length > 2000) throw new Error('Pesan wajib diisi (maks. 2000 karakter).');
            if (!adminName || adminName.length > 50) throw new Error('Nama Admin tidak valid.');
            if (!recipients.length || recipients.some(role => !allowedTargets.has(role))) {
                throw new Error('Pilih setidaknya satu penerima pengumuman yang valid.');
            }
            const { data, error } = await client.from('site_announcements').insert({
                message: cleanMessage,
                created_by: session.session.user.id,
                created_by_name: adminName,
                target_roles: recipients,
                expires_at: new Date(Date.now() + duration * 60 * 1000).toISOString()
            }).select('id,message,created_by_name,created_at,expires_at,target_roles').single();
            if (error) throw error;
            return data;
        },
        async listAnnouncements() {
            const client = await requireClient();
            const { data, error } = await client.from('site_announcements')
                .select('id,message,created_by_name,created_at,expires_at,target_roles')
                .order('created_at', { ascending: false })
                .limit(30);
            if (error) throw error;
            return data;
        },
        async listRoleAnnouncements(role) {
            if (!['security', 'reseller', 'partner'].includes(role)) return [];
            const client = await requireClient();
            const { data, error } = await client.from('site_announcements')
                .select('id,message,created_by_name,created_at,expires_at,target_roles')
                .contains('target_roles', [role])
                .gt('expires_at', new Date().toISOString())
                .order('created_at', { ascending: false })
                .limit(20);
            if (error) throw error;
            return data;
        },
        async deleteAnnouncement(id) {
            const client = await requireClient();
            const { error } = await client.from('site_announcements').delete().eq('id', id);
            if (error) throw error;
        },
        async loadAnnouncementResponses() {
            const client = await requireClient();
            const { data, error } = await client.from('announcement_responses')
                .select('id,announcement_id,visitor_name,response,created_at')
                .order('created_at', { ascending: false })
                .limit(200);
            if (error) throw error;
            return data;
        },
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
                .select('user_id,username,display_name,role,avatar_url,editable_pages')
                .eq('user_id', data.user.id)
                .maybeSingle();
            if (profileError || !profile || !['admin', 'security', 'reseller', 'partner'].includes(profile.role)) {
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
                profilePhoto: profile.avatar_url || '',
                editablePages: Array.isArray(profile.editable_pages) ? profile.editable_pages : []
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
                .select('user_id,username,display_name,role,avatar_url,editable_pages')
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
                editablePages: Array.isArray(data.editable_pages) ? data.editable_pages : [],
                email: session.session.user.email
            };
        },
        async saveConfig(config) {
            const client = await requireClient();
            const { data: session, error: sessionError } = await client.auth.getSession();
            if (sessionError) throw sessionError;
            if (!session.session) throw new Error('Masuk ke CPanel untuk menyimpan perubahan.');
            await writeSiteState(client, session.session.user.id, { config });
            localStorage.setItem('ditzz_config', JSON.stringify(config));
        },
        async saveProducts(products) {
            const client = await requireClient();
            const { data: session, error: sessionError } = await client.auth.getSession();
            if (sessionError) throw sessionError;
            if (!session.session) throw new Error('Masuk ke CPanel untuk menyimpan perubahan.');
            await writeSiteState(client, session.session.user.id, { products });
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
        async uploadSiteMedia(file, filenameHint) {
            const client = await requireClient();
            const allowedTypes = new Set([
                'image/gif', 'image/apng', 'image/webp', 'image/png', 'image/jpeg',
                'video/mp4', 'video/webm', 'video/ogg',
                'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/aac'
            ]);
            if (!allowedTypes.has(file.type)) {
                throw new Error('Gunakan file GIF/WEBP/PNG/JPG, video MP4/WEBM/OGG, atau audio MP3/M4A/WAV/OGG/AAC.');
            }
            const { data: session, error: sessionError } = await client.auth.getSession();
            if (sessionError) throw sessionError;
            if (!session.session) throw new Error('Masuk ke CPanel untuk mengunggah media.');
            const extension = String(file.name.split('.').pop() || '').toLowerCase();
            if (!/^(gif|apng|webp|png|jpe?g|mp4|webm|ogv|ogg|mp3|m4a|wav|aac)$/.test(extension)) {
                throw new Error('Ekstensi file media tidak didukung.');
            }
            const safeName = String(filenameHint || 'maintenance').replace(/[^a-zA-Z0-9._-]/g, '-');
            const objectPath = `${session.session.user.id}/${Date.now()}-${safeName}.${extension}`;
            const { error } = await client.storage.from('site-media').upload(objectPath, file, {
                contentType: file.type,
                upsert: false
            });
            if (error) throw error;
            return client.storage.from('site-media').getPublicUrl(objectPath).data.publicUrl;
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
    let lastFullscreenStatus = '';
    const recordFullscreenStatus = () => {
        const supported = Boolean(document.documentElement.requestFullscreen
            || document.documentElement.webkitRequestFullscreen);
        const active = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
        const currentStatus = `${supported}:${active}`;
        if (currentStatus === lastFullscreenStatus) return;
        lastFullscreenStatus = currentStatus;
        window.DitzzData.recordVisitorEvent('fullscreen_status', undefined, undefined, { supported, active }).catch(error => {
            console.error('Fullscreen activity could not be recorded.', error);
        });
    };
    document.addEventListener('fullscreenchange', recordFullscreenStatus);
    document.addEventListener('webkitfullscreenchange', recordFullscreenStatus);

    ready.then(() => {
        if (!state.client || window.location.pathname.startsWith('/admin/')) return;
        let config = {};
        try {
            config = JSON.parse(localStorage.getItem('ditzz_config') || '{}');
        } catch (error) {
            console.error('Site status configuration could not be read.', error);
        }
        const applyPublicStatus = () => {
            applyGlobalSiteStatus(config);
            applyFeatureAvailability(config);
        };
        if (document.body) applyPublicStatus();
        else document.addEventListener('DOMContentLoaded', applyPublicStatus, { once: true });
        window.DitzzData.recordVisitorEvent('page_view').catch(error => {
            console.error('Visitor page view could not be recorded.', error);
        });
        loadActiveAnnouncement().catch(error => {
            console.error('Active announcement could not be loaded.', error);
        });
        document.addEventListener('ditzz:announcements-changed', () => {
            loadActiveAnnouncement().catch(error => {
                console.error('Updated announcement could not be loaded.', error);
            });
        });
    }).catch(error => {
        console.error('Visitor services could not be initialized.', error);
    });
    window.addEventListener('load', () => {
        setStatus(state.status, state.error);
    });
})();
