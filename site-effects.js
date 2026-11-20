(() => {
    const activeKey = 'ditzz_fullscreen_required';
    const navigationKey = 'ditzz_fullscreen_navigation';
    const visitorBlockKey = 'ditzz_visitor_permanent_block';
    const legacyTemporaryBlockTerms = new Set([
        'anjing', 'babi', 'kontol', 'memek', 'bangsat', 'bajingan', 'pantek', 'asu', 'tai',
        'fuck', 'shit', 'bitch', 'asshole', 'dick', 'pussy', 'whore', 'slut', 'porn', 'bokep',
        'admin', 'administrator', 'root', 'owner', 'ditzz', 'system', 'moderator'
    ]);
    const isEntryPage = /(?:^|\/)index\.html$/i.test(window.location.pathname);
    const hasCpanelSession = sessionStorage.getItem('ditzz_admin_auth') === 'true'
        && ['admin', 'security'].includes(sessionStorage.getItem('ditzz_admin_role'));
    const isCpanelPreview = new URLSearchParams(window.location.search).get('cpanelPreview') === '1'
        && hasCpanelSession;
    let navigatingToEntry = false;
    let fullscreenLossTimer = null;
    let fullscreenGateTimer = null;

    function parseVisitorBlock(serialized) {
        if (!serialized) return null;
        try {
            const block = JSON.parse(serialized);
            if (block && typeof block.name === 'string') return block;
        } catch (error) {
            console.warn('Permanent visitor block could not be read.', error);
        }
        return { name: 'Visitor', term: '' };
    }

    function isLegacyTemporaryBlock(block) {
        const normalizedTerm = String(block.term || '').normalize('NFKC').toLocaleLowerCase('id-ID').replace(/[^\p{L}\p{N}]/gu, '');
        return legacyTemporaryBlockTerms.has(normalizedTerm);
    }

    function showVisitorBlock(block) {
        if (document.getElementById('visitorPermanentBlock')) return;

        const overlay = document.createElement('div');
        overlay.id = 'visitorPermanentBlock';
        overlay.setAttribute('role', 'alertdialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'visitorPermanentBlockTitle');
        overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(3,8,10,.98);font-family:Share Tech Mono,monospace;color:#e0e0e0;text-align:center';

        const panel = document.createElement('section');
        panel.style.cssText = 'max-width:560px;width:100%;padding:32px 26px;border:1px solid #ff4058;background:#0d1117;box-shadow:0 0 36px rgba(255,64,88,.2);line-height:1.75';
        const title = document.createElement('h1');
        title.id = 'visitorPermanentBlockTitle';
        title.setAttribute('tabindex', '-1');
        title.textContent = 'AKSES HALAMAN PUBLIK DIBLOKIR';
        title.style.cssText = 'margin:0 0 16px;color:#ff7182;font:700 1rem Orbitron,sans-serif';
        const details = document.createElement('p');
        details.textContent = `Nama visitor "${block.name}" cocok dengan entri yang diblokir${block.term ? `: "${block.term}"` : ''}.`;
        const appeal = document.createElement('p');
        appeal.textContent = 'Blokir ini berlaku pada browser/perangkat ini sampai Admin atau Keamanan membukanya melalui CPanel.';
        const privacy = document.createElement('p');
        privacy.textContent = 'Ini hanya pembatasan akses situs; perangkat tidak dilacak, diubah, atau diretas.';
        privacy.style.cssText = 'margin-bottom:0;color:#9da7b3;font-size:.8rem';

        panel.append(title, details, appeal, privacy);
        overlay.appendChild(panel);
        document.body.appendChild(overlay);
        title.focus();
    }

    function enforceVisitorBlock() {
        const block = parseVisitorBlock(localStorage.getItem(visitorBlockKey));
        if (!block) return false;
        if (isLegacyTemporaryBlock(block)) {
            localStorage.removeItem(visitorBlockKey);
            localStorage.removeItem('ditzz_visitor_pending_approval');
            return false;
        }
        showVisitorBlock(block);
        return true;
    }

    function entryUrl() {
        return new URL('index.html?fullscreen=required', window.location.href).href;
    }

    function returnToEntry() {
        if (navigatingToEntry) return;
        navigatingToEntry = true;
        sessionStorage.removeItem(navigationKey);
        window.location.replace(entryUrl());
    }

    function handleFullscreenLoss() {
        if (document.fullscreenElement) {
            if (fullscreenLossTimer) window.clearTimeout(fullscreenLossTimer);
            fullscreenLossTimer = null;
            return;
        }
        if (sessionStorage.getItem(activeKey) !== 'true') return;
        if (sessionStorage.getItem(navigationKey) === 'true' || fullscreenLossTimer || fullscreenGateTimer) return;
        if (window.DitzzSounds) window.DitzzSounds.play('warning', 2000);
        fullscreenLossTimer = window.setTimeout(() => {
            fullscreenLossTimer = null;
            if (document.fullscreenElement) {
                sessionStorage.setItem(activeKey, 'true');
                return;
            }
            returnToEntry();
        }, 200);
    }

    window.DitzzSiteEffects = {
        markFullscreenRequired() {
            sessionStorage.setItem(activeKey, 'true');
        },
        markInternalNavigation() {
            sessionStorage.setItem(navigationKey, 'true');
        },
        blockVisitor(name, term) {
            const block = {
                name: String(name || 'Visitor'),
                term: String(term || ''),
                createdAt: new Date().toISOString()
            };
            localStorage.setItem(visitorBlockKey, JSON.stringify(block));
            if (window.DitzzSounds) window.DitzzSounds.play('error', 2800);
            showVisitorBlock(block);
            return block;
        },
        enforceVisitorBlock
    };

    window.addEventListener('storage', event => {
        if (event.key !== visitorBlockKey) return;
        if (event.newValue) {
            const block = parseVisitorBlock(event.newValue);
            if (isLegacyTemporaryBlock(block)) {
                localStorage.removeItem(visitorBlockKey);
                localStorage.removeItem('ditzz_visitor_pending_approval');
                return;
            }
            showVisitorBlock(block);
        } else {
            const overlay = document.getElementById('visitorPermanentBlock');
            if (overlay) {
                overlay.remove();
                window.location.reload();
            }
        }
    });

    if (enforceVisitorBlock()) return;

    if (isCpanelPreview) {
        document.addEventListener('click', event => {
            if (!(event.target instanceof Element)) return;
            const link = event.target.closest('a[href]');
            if (!link || link.target === '_blank' || link.hasAttribute('download')) return;
            const destination = new URL(link.href, window.location.href);
            if (destination.origin === window.location.origin) {
                destination.searchParams.set('cpanelPreview', '1');
                link.href = destination.href;
            }
        }, true);
        return;
    }

    function showFullscreenGate() {
        if (document.fullscreenElement) return;
        if (document.getElementById('fullscreenGuard')) return;
        if (window.DitzzSounds) window.DitzzSounds.play('warning', 1800);

        const overlay = document.createElement('div');
        overlay.id = 'fullscreenGuard';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'fullscreenGuardTitle');
        overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(3,8,10,.96);backdrop-filter:blur(14px);font-family:Share Tech Mono,monospace';

        const panel = document.createElement('div');
        panel.style.cssText = 'max-width:520px;width:100%;padding:28px;border:1px solid #00ffff;background:#0d1117;color:#e0e0e0;text-align:center;box-shadow:0 0 32px rgba(0,255,255,.2);animation:fullscreenPulse 2.8s ease-in-out infinite;line-height:1.7';
        const title = document.createElement('h2');
        title.id = 'fullscreenGuardTitle';
        title.textContent = 'TAMPILAN LAYAR PENUH DIPERLUKAN';
        title.style.cssText = 'margin-bottom:12px;color:#00ffff;font:700 1rem Orbitron,sans-serif';
        const message = document.createElement('p');
        message.textContent = 'Lanjutkan setelah mode layar penuh aktif. Jika browser tidak mendukung fullscreen, Anda dapat kembali ke halaman awal.';
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = 'LANJUTKAN DALAM LAYAR PENUH';
        button.style.cssText = 'min-height:44px;margin-top:18px;padding:10px 16px;border:1px solid #00ffff;background:transparent;color:#00ffff;font:700 .75rem Share Tech Mono,monospace';
        const backLink = document.createElement('a');
        backLink.href = entryUrl();
        backLink.textContent = 'Kembali ke halaman awal';
        backLink.style.cssText = 'display:block;margin-top:14px;color:#9da7b3;font-size:.75rem';

        button.addEventListener('click', async () => {
            if (!document.documentElement.requestFullscreen) {
                message.textContent = 'Browser ini tidak mendukung fullscreen. Silakan buka halaman awal pada browser yang mendukungnya.';
                if (window.DitzzSounds) window.DitzzSounds.play('error', 2200);
                return;
            }
            try {
                await document.documentElement.requestFullscreen();
            } catch (error) {
                message.textContent = 'Fullscreen belum diizinkan browser. Tekan tombol ini lagi dan izinkan permintaannya.';
                if (window.DitzzSounds) window.DitzzSounds.play('error', 2200);
                return;
            }
            if (document.fullscreenElement) {
                sessionStorage.setItem(activeKey, 'true');
                sessionStorage.removeItem(navigationKey);
                overlay.remove();
            } else {
                message.textContent = 'Fullscreen belum aktif. Coba lagi menggunakan tombol di bawah.';
            }
        });

        panel.append(title, message, button, backLink);
        overlay.appendChild(panel);
        document.body.appendChild(overlay);
        button.focus();
    }

    function scheduleFullscreenGate() {
        if (fullscreenGateTimer || document.fullscreenElement) return;
        fullscreenGateTimer = window.setTimeout(() => {
            fullscreenGateTimer = null;
            sessionStorage.removeItem(navigationKey);
            if (!document.fullscreenElement) showFullscreenGate();
        }, 500);
    }

    document.addEventListener('click', event => {
        if (!(event.target instanceof Element)) return;
        const link = event.target.closest('a[href]');
        if (!link || link.target === '_blank' || link.hasAttribute('download')) return;
        const destination = new URL(link.href, window.location.href);
        if (destination.origin === window.location.origin
            && (destination.pathname !== window.location.pathname || destination.search !== window.location.search)) {
            sessionStorage.setItem(navigationKey, 'true');
        }
    }, true);

    document.addEventListener('fullscreenchange', () => {
        if (document.fullscreenElement) {
            sessionStorage.setItem(activeKey, 'true');
            sessionStorage.removeItem(navigationKey);
            const fullscreenGuard = document.getElementById('fullscreenGuard');
            if (fullscreenGuard) fullscreenGuard.remove();
            if (fullscreenLossTimer) window.clearTimeout(fullscreenLossTimer);
            fullscreenLossTimer = null;
            if (fullscreenGateTimer) window.clearTimeout(fullscreenGateTimer);
            fullscreenGateTimer = null;
            return;
        }
        handleFullscreenLoss();
    });
    window.addEventListener('resize', handleFullscreenLoss);

    if (isEntryPage) {
        sessionStorage.removeItem(navigationKey);
        return;
    }

    const isInternalNavigation = sessionStorage.getItem(navigationKey) === 'true';
    if (!isInternalNavigation || document.fullscreenElement) sessionStorage.removeItem(navigationKey);
    if (sessionStorage.getItem(activeKey) !== 'true') {
        returnToEntry();
    } else if (!document.fullscreenElement && isInternalNavigation) {
        scheduleFullscreenGate();
    } else if (!document.fullscreenElement) {
        returnToEntry();
    }
})();
