(() => {
    let activeContext = null;
    let pulseTimer = 0;
    let stopTimer = 0;
    let activePlaybackId = 0;

    const soundProfiles = {
        notification: { frequency: 880, interval: 680, wave: 'sine' },
        warning: { frequency: 660, interval: 500, wave: 'triangle' },
        error: { frequency: 440, interval: 430, wave: 'sine' }
    };

    function stop(playbackId) {
        if (playbackId !== undefined && playbackId !== activePlaybackId) return false;
        activePlaybackId += 1;
        window.clearInterval(pulseTimer);
        window.clearTimeout(stopTimer);
        pulseTimer = 0;
        stopTimer = 0;

        if (!activeContext) return true;
        const context = activeContext;
        activeContext = null;
        if (context.state !== 'closed') {
            context.close().catch(error => console.warn('Notification sound could not be stopped cleanly.', error));
        }
        return true;
    }

    function play(type, durationMs) {
        stop();
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) {
            console.warn('Notification sound is unavailable in this browser.');
            return false;
        }

        let context;
        try {
            context = new AudioContext();
        } catch (error) {
            console.warn('Notification sound could not be initialized.', error);
            return false;
        }

        const profile = soundProfiles[type] || soundProfiles.notification;
        const requestedDuration = Number(durationMs);
        const duration = Math.min(20000, Math.max(180, Number.isFinite(requestedDuration) && requestedDuration > 0 ? requestedDuration : 1800));
        const endsAt = Date.now() + duration;
        const playbackId = activePlaybackId + 1;
        activePlaybackId = playbackId;
        activeContext = context;

        if (context.state === 'suspended') {
            context.resume().catch(error => console.warn('Notification sound could not be resumed.', error));
        }

        function pulse() {
            if (activeContext !== context || activePlaybackId !== playbackId) return;
            if (Date.now() >= endsAt) {
                stop(playbackId);
                return;
            }

            const oscillator = context.createOscillator();
            const gain = context.createGain();
            const now = context.currentTime;
            oscillator.type = profile.wave;
            oscillator.frequency.setValueAtTime(profile.frequency, now);
            gain.gain.setValueAtTime(0.0001, now);
            gain.gain.exponentialRampToValueAtTime(0.2, now + 0.025);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.19);
            oscillator.connect(gain);
            gain.connect(context.destination);
            oscillator.addEventListener('ended', () => {
                oscillator.disconnect();
                gain.disconnect();
            }, { once: true });
            oscillator.start(now);
            oscillator.stop(now + 0.2);
        }

        pulse();
        pulseTimer = window.setInterval(pulse, profile.interval);
        stopTimer = window.setTimeout(() => stop(playbackId), duration);
        return playbackId;
    }

    window.DitzzSounds = { play, stop };
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) stop();
    });
    window.addEventListener('pagehide', stop);
})();
