(() => {
    const pageData = {
        updates: {
            title: 'TRANSMISSION LOG',
            kicker: '// BERITA & PEMBARUAN',
            description: 'Catatan fitur dan perubahan yang membantu Anda menjelajahi DITZZ NEWERA.',
            content: `
                <section class="extra-section">
                    <h2>CATATAN PLATFORM</h2>
                    <div class="extra-grid">
                        <article class="extra-card"><h3>GERBANG VISITOR</h3><p>Pengunjung dapat membaca catatan, memilih identitas, lalu memulai sesi website.</p></article>
                        <article class="extra-card"><h3>MUSIK PEMBUKA</h3><p>Lagu pembuka mengikuti pilihan Admin. Setelah masuk Home, pemutar musik menyediakan pilihan lagu.</p></article>
                        <article class="extra-card"><h3>SAMBUTAN DEVELOPER</h3><p>Pesan dan pantun sambutan ditampilkan saat Home dibuka dan dapat diubah dari CPanel.</p></article>
                        <article class="extra-card"><h3>LAYOUT RESPONSIF</h3><p>Halaman publik dirancang agar tetap mudah dijelajahi dari layar HP, tablet, maupun desktop.</p></article>
                    </div>
                </section>
                <section class="extra-section"><h2>ADA YANG INGIN DILAPORKAN?</h2><p class="extra-muted">Kirim saran, koreksi, atau ide pembaruan melalui halaman Contact.</p><a class="extra-link" href="contact.html">BUKA CONTACT</a></section>`
        },
        events: {
            title: 'EVENT CENTER',
            kicker: '// AGENDA & KEGIATAN',
            description: 'Pusat informasi kegiatan dan pengumuman komunitas DITZZ NEWERA.',
            content: `
                <section class="extra-section">
                    <h2>AGENDA TERKINI</h2>
                    <p class="extra-notice">Belum ada jadwal kegiatan yang diumumkan. Informasi acara akan ditampilkan di halaman ini setelah Admin menyiapkan detailnya.</p>
                </section>
                <section class="extra-section">
                    <h2>USULKAN KEGIATAN</h2>
                    <p class="extra-muted">Punya ide untuk sesi tanya jawab, showcase karya, atau promo komunitas? Sampaikan usulan melalui Contact; pengiriman pesan mengikuti fitur yang tersedia di halaman tersebut.</p>
                    <a class="extra-link" href="contact.html">KIRIM USULAN</a>
                </section>`
        },
        gallery: {
            title: 'VISUAL ARCHIVE',
            kicker: '// GALERI VISUAL DIGITAL',
            description: 'Jelajahi komposisi neon eksperimental yang dibuat dengan CSS—ringan, responsif, dan tanpa gambar eksternal.',
            content: `
                <section class="extra-section">
                    <h2>PILIH ARSIP UNTUK MELIHAT DETAIL</h2>
                    <div class="extra-grid">
                        <button class="extra-art" type="button" data-art-name="NEON CORE" data-art-description="Komposisi warna hijau dan cyan yang terinspirasi dari tampilan terminal futuristik."><strong>NEON CORE</strong><span>01 // SIGNAL GREEN</span></button>
                        <button class="extra-art" type="button" data-art-name="BLUE GRID" data-art-description="Pola cahaya biru dengan lapisan grid untuk nuansa ruang kendali digital."><strong>BLUE GRID</strong><span>02 // CYAN MATRIX</span></button>
                        <button class="extra-art" type="button" data-art-name="NIGHT PULSE" data-art-description="Gradien ungu dan merah muda dengan cahaya lembut seperti denyut sinyal malam."><strong>NIGHT PULSE</strong><span>03 // AFTER DARK</span></button>
                    </div>
                </section>
                <dialog class="extra-dialog" id="galleryDialog">
                    <p class="extra-kicker">// DETAIL ARSIP</p><h2 id="galleryDialogTitle"></h2>
                    <p id="galleryDialogDescription"></p>
                    <button class="extra-button" type="button" id="galleryDialogClose">TUTUP</button>
                </dialog>`
        },
        faq: {
            title: 'HELP & FAQ',
            kicker: '// PUSAT BANTUAN',
            description: 'Cari jawaban singkat tentang navigasi, musik, visitor, dan transaksi di website.',
            content: `
                <section class="extra-section">
                    <h2>PERTANYAAN UMUM</h2>
                    <label class="extra-field"><span class="extra-kicker">CARI PERTANYAAN</span><input class="extra-input" id="faqSearch" type="search" placeholder="Ketik kata kunci..." autocomplete="off"></label>
                    <p class="extra-status" id="faqResultCount" role="status"></p>
                    <div class="extra-faq" id="faqList">
                        <details data-faq><summary>Bagaimana cara menjelajahi halaman lain?</summary><p>Gunakan menu di bagian atas halaman atau pintasan Jelajah di Home.</p></details>
                        <details data-faq><summary>Bisakah saya mengganti lagu pembuka?</summary><p>Lagu pembuka ditentukan Admin melalui CPanel. Setelah masuk Home, Anda dapat memilih lagu lain dari pemutar musik jika fitur musik aktif.</p></details>
                        <details data-faq><summary>Apakah pilihan musik tersimpan?</summary><p>Pilihan dan posisi musik berlaku selama sesi tab ini dan dibersihkan saat tab ditutup.</p></details>
                        <details data-faq><summary>Bagaimana cara menanyakan produk?</summary><p>Buka halaman Store untuk melihat katalog, lalu gunakan Contact untuk mengirim pertanyaan.</p></details>
                        <details data-faq><summary>Apakah pesan Visitor Lounge dapat dibaca semua orang?</summary><p>Tidak. Guestbook pada situs statis ini hanya tersimpan di browser/perangkat yang digunakan dan tidak dibagikan ke visitor lain.</p></details>
                    </div>
                </section>`
        },
        community: {
            title: 'VISITOR LOUNGE',
            kicker: '// PAPAN PESAN LOKAL',
            description: 'Tinggalkan salam singkat selama sesi tab ini. Pesan tidak dikirim atau dibagikan ke visitor lain.',
            content: `
                <section class="extra-section">
                    <h2>TINGGALKAN SALAM</h2>
                    <p class="extra-notice">Privasi: pesan hanya disimpan sementara di sesi tab ini. Jangan masukkan data pribadi atau rahasia.</p>
                    <form id="guestbookForm">
                        <div class="extra-field"><label for="guestbookName">NAMA PENGUNJUNG</label><input class="extra-input" id="guestbookName" maxlength="40" required></div>
                        <div class="extra-field"><label for="guestbookMessage">PESAN SINGKAT (MAKS. 240 KARAKTER)</label><textarea class="extra-textarea" id="guestbookMessage" maxlength="240" required placeholder="Tulis salam atau catatan..."></textarea></div>
                        <button class="extra-button" type="submit">SIMPAN DI SESI INI</button>
                        <p class="extra-status" id="guestbookStatus" role="status"></p>
                    </form>
                </section>
                <section class="extra-section"><h2>PESAN DI SESI INI</h2><ul class="extra-list" id="guestbookList"></ul></section>`
        },
        guide: {
            title: 'FIELD GUIDE',
            kicker: '// PANDUAN MENJELAJAH',
            description: 'Langkah ringkas untuk menemukan fitur utama dan menggunakan website dengan nyaman.',
            content: `
                <section class="extra-section">
                    <h2>JELAJAHI DITZZ NEWERA</h2>
                    <ol class="extra-list">
                        <li><strong>01 // BACA CATATAN</strong>Periksa aturan, tujuan website, dan informasi developer di gerbang awal.</li>
                        <li><strong>02 // PILIH IDENTITAS</strong>Gunakan nama otomatis atau validasi nama pilihan pada gerbang visitor.</li>
                        <li><strong>03 // TEMUKAN PRODUK</strong>Buka Store untuk melihat katalog dan detail yang tersedia.</li>
                        <li><strong>04 // ATUR MUSIK</strong>Lagu awal ditetapkan Admin; pilihan lagu tersedia di pemutar Home setelah masuk.</li>
                        <li><strong>05 // HUBUNGI PENGELOLA</strong>Gunakan Contact untuk mengirim pertanyaan atau masukan.</li>
                    </ol>
                </section>
                <section class="extra-section"><h2>JALUR CEPAT</h2><div class="extra-grid">
                    <a class="extra-link" href="store.html">BUKA STORE</a>
                    <a class="extra-link" href="about.html">TENTANG WEBSITE</a>
                    <a class="extra-link" href="contact.html">HUBUNGI KAMI</a>
                </div></section>`
        }
    };

    const pageName = document.body.dataset.extraPage;
    const page = pageData[pageName];
    const main = document.getElementById('extraPageContent');
    if (!page || !main) {
        console.error('Extra page content is missing or has an unknown page key.', pageName);
        return;
    }

    let siteConfig = {};
    try {
        siteConfig = JSON.parse(localStorage.getItem('ditzz_config') || '{}');
    } catch (error) {
        console.warn('Public page content settings could not be read.', error);
    }
    const managedPageContent = (siteConfig.pageContent || {})[pageName];
    if (managedPageContent && typeof managedPageContent === 'object') {
        if (typeof managedPageContent.title === 'string') page.title = managedPageContent.title;
        if (typeof managedPageContent.kicker === 'string') page.kicker = managedPageContent.kicker;
        if (typeof managedPageContent.description === 'string') page.description = managedPageContent.description;
    }

    document.title = `DITZZ NEWERA | ${page.title}`;
    const links = [
        ['home.html', 'HOME'], ['store.html', 'STORE'], ['about.html', 'ABOUT'], ['contact.html', 'CONTACT'],
        ['updates.html', 'UPDATES'], ['events.html', 'EVENTS'], ['gallery.html', 'GALLERY'],
        ['faq.html', 'FAQ'], ['community.html', 'LOUNGE'], ['guide.html', 'GUIDE']
    ];
    const header = document.createElement('header');
    header.className = 'extra-header';
    const headerInner = document.createElement('div');
    headerInner.className = 'extra-header-inner';
    const brand = document.createElement('a');
    brand.className = 'extra-brand';
    brand.href = 'home.html';
    brand.innerHTML = 'DITZZ <span>NEWERA</span>';
    const nav = document.createElement('nav');
    nav.className = 'extra-nav';
    nav.setAttribute('aria-label', 'Navigasi website');
    links.forEach(([href, label]) => {
        const link = document.createElement('a');
        link.href = href;
        link.textContent = label;
        if (href === `${pageName}.html`) link.setAttribute('aria-current', 'page');
        nav.appendChild(link);
    });
    headerInner.append(brand, nav);
    header.appendChild(headerInner);

    const mainContent = document.createElement('main');
    mainContent.className = 'extra-main';
    mainContent.id = 'mainContent';
    const hero = document.createElement('section');
    hero.className = 'extra-hero';
    const kicker = document.createElement('p');
    kicker.className = 'extra-kicker';
    kicker.textContent = page.kicker;
    const title = document.createElement('h1');
    title.className = 'extra-title';
    title.textContent = page.title;
    const description = document.createElement('p');
    description.className = 'extra-description';
    description.textContent = page.description;
    hero.append(kicker, title, description);
    mainContent.appendChild(hero);
    if (managedPageContent && typeof managedPageContent === 'object') {
        mainContent.appendChild(buildManagedPageContent(pageName, managedPageContent));
    } else {
        mainContent.insertAdjacentHTML('beforeend', page.content);
    }

    const footer = document.createElement('footer');
    footer.className = 'extra-footer';
    footer.innerHTML = 'DITZZ NEWERA // <a href="home.html">KEMBALI KE HOME</a>';
    document.body.prepend(header);
    main.replaceWith(mainContent);
    document.body.appendChild(footer);

    applyPageAvailability();
    initializeGallery();
    initializeFaq();
    initializeGuestbook();
    initializeAudio();

    function contentText(tag, className, value) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        element.textContent = String(value || '');
        return element;
    }

    function appendManagedMedia(target, item) {
        if (!item.mediaUrl) return;
        let mediaUrl;
        try {
            mediaUrl = new URL(item.mediaUrl);
        } catch (error) {
            console.warn('A public page media URL is invalid.', error);
            return;
        }
        if (mediaUrl.protocol !== 'https:' || !/\.(gif|apng|webp|png|jpe?g|mp4|webm|ogg|ogv)$/i.test(mediaUrl.pathname)) {
            console.warn('A public page media URL uses an unsupported protocol or format.');
            return;
        }
        const isVideo = item.mediaType === 'video' || /\.(mp4|webm|ogg|ogv)$/i.test(mediaUrl.pathname);
        const media = document.createElement(isVideo ? 'video' : 'img');
        media.className = 'extra-managed-media';
        media.src = mediaUrl.href;
        if (isVideo) {
            media.controls = true;
            media.preload = 'metadata';
            media.playsInline = true;
        } else {
            media.loading = 'lazy';
            media.alt = item.title || 'Media halaman';
        }
        target.appendChild(media);
    }

    function buildManagedPageContent(key, content) {
        const fragment = document.createDocumentFragment();
        const items = Array.isArray(content.items) ? content.items.filter(item => item && typeof item === 'object') : [];
        if (key === 'community') {
            const formSection = document.createElement('section');
            formSection.className = 'extra-section';
            formSection.appendChild(contentText('h2', '', 'TINGGALKAN SALAM'));
            formSection.appendChild(contentText('p', 'extra-notice', content.notice || 'Pesan hanya disimpan sementara di sesi tab ini.'));
            const form = document.createElement('form');
            form.id = 'guestbookForm';
            const nameField = document.createElement('div');
            nameField.className = 'extra-field';
            nameField.append(contentText('label', '', 'NAMA PENGUNJUNG'));
            const nameInput = document.createElement('input');
            nameInput.className = 'extra-input';
            nameInput.id = 'guestbookName';
            nameInput.maxLength = 40;
            nameInput.required = true;
            nameField.appendChild(nameInput);
            const messageField = document.createElement('div');
            messageField.className = 'extra-field';
            messageField.append(contentText('label', '', 'PESAN SINGKAT (MAKS. 240 KARAKTER)'));
            const messageInput = document.createElement('textarea');
            messageInput.className = 'extra-textarea';
            messageInput.id = 'guestbookMessage';
            messageInput.maxLength = 240;
            messageInput.required = true;
            messageInput.placeholder = 'Tulis salam atau catatan...';
            messageField.appendChild(messageInput);
            const submit = document.createElement('button');
            submit.className = 'extra-button';
            submit.type = 'submit';
            submit.textContent = 'SIMPAN DI SESI INI';
            const status = document.createElement('p');
            status.className = 'extra-status';
            status.id = 'guestbookStatus';
            status.setAttribute('role', 'status');
            form.append(nameField, messageField, submit, status);
            formSection.appendChild(form);
            const messagesSection = document.createElement('section');
            messagesSection.className = 'extra-section';
            messagesSection.append(contentText('h2', '', 'PESAN DI SESI INI'));
            const list = document.createElement('ul');
            list.className = 'extra-list';
            list.id = 'guestbookList';
            messagesSection.appendChild(list);
            fragment.append(formSection, messagesSection);
            return fragment;
        }

        const section = document.createElement('section');
        section.className = 'extra-section';
        const sectionTitle = key === 'faq' ? 'PERTANYAAN UMUM'
            : key === 'gallery' ? 'ARSIP VISUAL'
                : key === 'guide' ? 'PANDUAN MENJELAJAH'
                    : key === 'events' ? 'AGENDA TERKINI'
                        : 'CATATAN TERKINI';
        section.appendChild(contentText('h2', '', sectionTitle));

        if (key === 'faq') {
            const searchLabel = document.createElement('label');
            searchLabel.className = 'extra-field';
            searchLabel.appendChild(contentText('span', 'extra-kicker', 'CARI PERTANYAAN'));
            const search = document.createElement('input');
            search.className = 'extra-input';
            search.id = 'faqSearch';
            search.type = 'search';
            search.placeholder = 'Ketik kata kunci...';
            search.autocomplete = 'off';
            searchLabel.appendChild(search);
            const count = document.createElement('p');
            count.className = 'extra-status';
            count.id = 'faqResultCount';
            count.setAttribute('role', 'status');
            const list = document.createElement('div');
            list.className = 'extra-faq';
            list.id = 'faqList';
            items.forEach(item => {
                const detail = document.createElement('details');
                detail.dataset.faq = '';
                detail.append(contentText('summary', '', item.title), contentText('p', '', item.body));
                list.appendChild(detail);
            });
            section.append(searchLabel, count, list);
        } else if (key === 'gallery') {
            const grid = document.createElement('div');
            grid.className = 'extra-grid';
            items.forEach(item => {
                const card = document.createElement('article');
                card.className = 'extra-card';
                appendManagedMedia(card, item);
                const art = document.createElement('button');
                art.className = 'extra-art';
                art.type = 'button';
                art.dataset.artName = item.title || 'ARSIP VISUAL';
                art.dataset.artDescription = item.body || '';
                art.append(contentText('strong', '', item.title), contentText('span', '', item.body));
                card.appendChild(art);
                grid.appendChild(card);
            });
            section.appendChild(grid);
            const dialog = document.createElement('dialog');
            dialog.className = 'extra-dialog';
            dialog.id = 'galleryDialog';
            dialog.append(
                contentText('p', 'extra-kicker', '// DETAIL ARSIP'),
                contentText('h2', '', ''),
                contentText('p', '', '')
            );
            dialog.querySelector('h2').id = 'galleryDialogTitle';
            dialog.querySelector('p:last-of-type').id = 'galleryDialogDescription';
            const close = document.createElement('button');
            close.className = 'extra-button';
            close.type = 'button';
            close.id = 'galleryDialogClose';
            close.textContent = 'TUTUP';
            dialog.appendChild(close);
            section.appendChild(dialog);
        } else if (key === 'guide') {
            const list = document.createElement('ol');
            list.className = 'extra-list';
            items.forEach(item => {
                const entry = document.createElement('li');
                entry.appendChild(contentText('strong', '', item.title));
                entry.appendChild(contentText('span', '', item.body));
                appendManagedMedia(entry, item);
                list.appendChild(entry);
            });
            section.appendChild(list);
        } else {
            const grid = document.createElement('div');
            grid.className = 'extra-grid';
            items.forEach(item => {
                const card = document.createElement('article');
                card.className = 'extra-card';
                appendManagedMedia(card, item);
                card.appendChild(contentText('h3', '', item.title));
                if (item.date) card.appendChild(contentText('small', 'extra-muted', item.date));
                card.appendChild(contentText('p', '', item.body));
                grid.appendChild(card);
            });
            if (!items.length) {
                const emptyMessage = key === 'events'
                    ? 'Belum ada jadwal kegiatan yang diumumkan.'
                    : 'Belum ada catatan pembaruan.';
                section.appendChild(contentText('p', 'extra-notice', emptyMessage));
            } else {
                section.appendChild(grid);
            }
        }
        fragment.appendChild(section);
        return fragment;
    }

    function applyPageAvailability() {
        let config;
        try {
            config = JSON.parse(localStorage.getItem('ditzz_config') || '{}');
        } catch (error) {
            console.warn('Feature availability settings could not be read.', error);
            return;
        }
        const status = (config.featureStatus || {})[pageName] || 'available';
        if (status === 'available') return;

        const overlay = document.createElement('div');
        overlay.className = 'extra-maintenance';
        overlay.setAttribute('role', 'status');
        const panel = document.createElement('section');
        panel.className = 'extra-maintenance-panel';
        const heading = document.createElement('h2');
        heading.textContent = status === 'comingSoon' ? 'FITUR SEGERA HADIR' : 'FITUR SEDANG DIPERBARUI';
        const message = document.createElement('p');
        message.textContent = config.featureStatusMessage || 'Kami sedang menyiapkan pembaruan agar pengalaman Anda lebih nyaman.';
        panel.append(heading, message);
        overlay.appendChild(panel);
        document.body.appendChild(overlay);
    }

    function initializeGallery() {
        const dialog = document.getElementById('galleryDialog');
        if (!dialog) return;
        const dialogTitle = document.getElementById('galleryDialogTitle');
        const dialogDescription = document.getElementById('galleryDialogDescription');
        document.querySelectorAll('.extra-art').forEach(art => {
            art.addEventListener('click', () => {
                dialogTitle.textContent = art.dataset.artName || 'ARSIP VISUAL';
                dialogDescription.textContent = art.dataset.artDescription || '';
                dialog.showModal();
            });
        });
        document.getElementById('galleryDialogClose').addEventListener('click', () => dialog.close());
        dialog.addEventListener('click', event => {
            if (event.target === dialog) dialog.close();
        });
    }

    function initializeFaq() {
        const search = document.getElementById('faqSearch');
        if (!search) return;
        const items = Array.from(document.querySelectorAll('[data-faq]'));
        const count = document.getElementById('faqResultCount');
        function filterFaq() {
            const query = search.value.trim().toLocaleLowerCase('id-ID');
            let visible = 0;
            items.forEach(item => {
                const matches = item.textContent.toLocaleLowerCase('id-ID').includes(query);
                item.hidden = !matches;
                if (matches) visible += 1;
            });
            count.textContent = `${visible} pertanyaan ditemukan.`;
        }
        search.addEventListener('input', filterFaq);
        filterFaq();
    }

    function initializeGuestbook() {
        const form = document.getElementById('guestbookForm');
        if (!form) return;
        const nameInput = document.getElementById('guestbookName');
        const messageInput = document.getElementById('guestbookMessage');
        const list = document.getElementById('guestbookList');
        const status = document.getElementById('guestbookStatus');
        nameInput.value = sessionStorage.getItem('ditzz_visitor_name') || 'Pengunjung';

        function readEntries() {
            try {
                const entries = JSON.parse(sessionStorage.getItem('ditzz_community_guestbook') || '[]');
                return Array.isArray(entries) ? entries.filter(entry => entry && typeof entry.name === 'string' && typeof entry.message === 'string') : [];
            } catch (error) {
                console.error('Guestbook entries could not be read.', error);
                status.textContent = 'Pesan lokal tidak dapat dibaca. Penyimpanan browser mungkin rusak.';
                return [];
            }
        }

        function renderEntries() {
            const entries = readEntries();
            list.replaceChildren();
            if (!entries.length) {
                const empty = document.createElement('li');
                empty.textContent = 'Belum ada pesan tersimpan di sesi ini.';
                list.appendChild(empty);
                return;
            }
            entries.forEach(entry => {
                const item = document.createElement('li');
                const author = document.createElement('strong');
                author.textContent = entry.name;
                const message = document.createElement('span');
                message.textContent = entry.message;
                const date = document.createElement('small');
                date.className = 'extra-muted';
                const timestamp = Date.parse(entry.createdAt || '');
                date.textContent = Number.isFinite(timestamp) ? new Date(timestamp).toLocaleString('id-ID') : '';
                item.append(author, message, date);
                list.appendChild(item);
            });
        }

        form.addEventListener('submit', event => {
            event.preventDefault();
            const name = nameInput.value.trim();
            const message = messageInput.value.trim();
            if (!name || !message) {
                status.textContent = 'Nama dan pesan wajib diisi.';
                return;
            }
            const entries = readEntries();
            entries.unshift({ name: name.slice(0, 40), message: message.slice(0, 240), createdAt: new Date().toISOString() });
            try {
                sessionStorage.setItem('ditzz_community_guestbook', JSON.stringify(entries.slice(0, 30)));
            } catch (error) {
                console.error('Guestbook message could not be saved.', error);
                status.textContent = 'Pesan gagal disimpan. Periksa ruang penyimpanan browser.';
                return;
            }
            messageInput.value = '';
            status.textContent = 'Pesan tersimpan selama sesi tab ini.';
            renderEntries();
        });
        renderEntries();
    }

    function initializeAudio() {
        const frame = document.createElement('iframe');
        frame.id = 'extraAudioFrame';
        frame.title = 'Pemutar musik website';
        frame.allow = 'autoplay; encrypted-media; picture-in-picture';
        frame.allowFullscreen = true;
        frame.referrerPolicy = 'strict-origin-when-cross-origin';
        const monitor = document.createElement('div');
        monitor.className = 'extra-audio-monitor';
        monitor.appendChild(frame);

        const panel = document.createElement('section');
        panel.className = 'extra-audio';
        panel.setAttribute('aria-label', 'Pemutar musik website');
        const title = document.createElement('span');
        title.className = 'extra-audio-title';
        title.id = 'extraAudioTitle';
        const playButton = document.createElement('button');
        playButton.type = 'button';
        playButton.id = 'extraAudioPlay';
        playButton.setAttribute('aria-label', 'Putar atau jeda musik');
        playButton.textContent = '▶';
        const modeButton = document.createElement('button');
        modeButton.type = 'button';
        modeButton.id = 'extraAudioMode';
        const nextButton = document.createElement('button');
        nextButton.type = 'button';
        nextButton.setAttribute('aria-label', 'Ganti lagu');
        nextButton.textContent = '»';
        const volume = document.createElement('input');
        volume.type = 'range';
        volume.min = '0';
        volume.max = '100';
        volume.setAttribute('aria-label', 'Volume musik');
        panel.append(title, playButton, modeButton, nextButton, volume);
        document.body.append(monitor, panel);

        let config = {};
        try {
            config = JSON.parse(localStorage.getItem('ditzz_config') || '{}');
        } catch (error) {
            console.warn('Music settings could not be read; using the default track.', error);
        }
        const configuredTracks = Array.isArray(config.tracks)
            ? config.tracks.filter(track => track && typeof track.name === 'string' && /^[\w-]{11}$/.test(track.id))
            : [];
        const introTrack = {
            name: config.introTitle || 'DITZZ THEME',
            id: /^[\w-]{11}$/.test(config.introMusicId || '') ? config.introMusicId : 'tGv7CUutzqU',
            start: Math.max(0, Number(config.introStartTime) || 24)
        };
        const tracks = [introTrack, ...configuredTracks.map(track => ({ name: track.name, id: track.id, start: 0 }))];
        if (!tracks.some(track => track.id === '4xDzrJKXOOY')) tracks.push({ name: 'CYBERPUNK NEON DRIVE', id: '4xDzrJKXOOY', start: 0 });
        if (!tracks.some(track => track.id === '79B5wX0hZ-0')) tracks.push({ name: 'SYNTHWAVE HACKER PROTOCOL', id: '79B5wX0hZ-0', start: 0 });

        const storedTrackId = sessionStorage.getItem('ditzz_selected_track_id');
        const requestedTrackId = /^[\w-]{11}$/.test(storedTrackId || '') ? storedTrackId : introTrack.id;
        let activeTrack = tracks.find(track => track.id === requestedTrackId) || introTrack;
        let activeId = activeTrack.id;
        let activeName = activeTrack.name;
        const storedPosition = Number(sessionStorage.getItem('ditzz_audio_time'));
        const savedAt = Number(sessionStorage.getItem('ditzz_audio_last_saved'));
        const savedAge = Date.now() - savedAt;
        const hasSavedTime = storedTrackId === activeId && Number.isFinite(storedPosition) && storedPosition >= 0;
        let anchorSec = hasSavedTime
            ? storedPosition + (sessionStorage.getItem('ditzz_audio_playing') !== 'false' && savedAge >= 0 && savedAge < 120000 ? Math.floor(savedAge / 1000) : 0)
            : (activeTrack.start || 0);
        let anchorMs = Date.now();
        let isPlaying = sessionStorage.getItem('ditzz_audio_playing') !== 'false';
        let musicPlaybackMode = sessionStorage.getItem('ditzz_music_playback_mode') === 'advance' ? 'advance' : 'repeat';
        let musicUnavailable = config.websiteMusicEnabled === false || ((config.featureStatus || {}).music || 'available') !== 'available';
        const storedVolume = sessionStorage.getItem('ditzz_volume');
        const parsedVolume = Number(storedVolume);
        let volumeLevel = storedVolume === null || !Number.isFinite(parsedVolume)
            ? 80
            : Math.min(100, Math.max(0, parsedVolume));
        let frameReady = false;
        let frameLoadSequence = 0;
        let youtubeAutoAdvanceArmed = false;
        if (musicUnavailable) isPlaying = false;
        volume.value = String(volumeLevel);

        function currentPosition() {
            return anchorSec + (isPlaying ? Math.floor((Date.now() - anchorMs) / 1000) : 0);
        }

        function savePosition() {
            if (isPlaying) anchorSec = currentPosition();
            anchorMs = Date.now();
            sessionStorage.setItem('ditzz_selected_track_id', activeId);
            sessionStorage.setItem('ditzz_selected_track_name', activeName);
            sessionStorage.setItem('ditzz_audio_time', String(anchorSec));
            sessionStorage.setItem('ditzz_audio_last_saved', String(anchorMs));
            sessionStorage.setItem('ditzz_audio_playing', String(isPlaying));
        }

        function command(func, args) {
            if (frameReady && frame.contentWindow) {
                frame.contentWindow.postMessage(JSON.stringify({ event: 'command', func, args: args || [] }), '*');
            }
        }

        function setFrameSource() {
            frameReady = false;
            frameLoadSequence += 1;
            youtubeAutoAdvanceArmed = false;
            const loop = musicPlaybackMode === 'repeat' ? 1 : 0;
            frame.src = `https://www.youtube.com/embed/${encodeURIComponent(activeId)}?autoplay=${isPlaying ? 1 : 0}&start=${anchorSec}&loop=${loop}&playlist=${encodeURIComponent(activeId)}&controls=0&enablejsapi=1&origin=${encodeURIComponent(location.origin)}&playsinline=1&volume=${volumeLevel}`;
        }

        frame.addEventListener('load', () => {
            frameReady = true;
            const sequence = frameLoadSequence;
            command('addEventListener', ['onStateChange']);
            [300, 800, 1500].forEach(delay => {
                window.setTimeout(() => {
                    if (sequence !== frameLoadSequence || musicUnavailable || !isPlaying) return;
                    command('unMute');
                    command('setVolume', [volumeLevel]);
                    command('playVideo');
                }, delay);
            });
            window.setTimeout(() => {
                if (sequence === frameLoadSequence) youtubeAutoAdvanceArmed = true;
            }, 1500);
        });

        function renderPlayer() {
            title.textContent = `${musicUnavailable ? 'MUSIK NONAKTIF' : activeName} · ${volumeLevel}%`;
            playButton.textContent = isPlaying ? 'Ⅱ' : '▶';
            playButton.disabled = musicUnavailable;
            const repeatMode = musicPlaybackMode === 'repeat';
            modeButton.textContent = repeatMode ? '↻' : '»';
            modeButton.title = repeatMode ? 'Mode musik: ulangi lagu ini' : 'Mode musik: lanjut ke lagu berikutnya';
            modeButton.setAttribute('aria-label', modeButton.title);
            modeButton.setAttribute('aria-pressed', String(!repeatMode));
            nextButton.disabled = musicUnavailable || tracks.length < 2;
            volume.disabled = musicUnavailable;
        }

        function loadTrack(track, start) {
            youtubeAutoAdvanceArmed = false;
            activeTrack = track;
            activeId = track.id;
            activeName = track.name;
            anchorSec = Math.max(0, Number(start) || 0);
            anchorMs = Date.now();
            isPlaying = !musicUnavailable;
            setFrameSource();
            savePosition();
            renderPlayer();
        }

        if (!musicUnavailable) {
            setFrameSource();
        } else {
            title.textContent = 'MUSIK NONAKTIF OLEH ADMIN';
        }
        renderPlayer();
        window.addEventListener('message', event => {
            if (event.origin !== 'https://www.youtube.com' || event.source !== frame.contentWindow) return;
            let data;
            try {
                data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
            } catch (error) {
                return;
            }
            const ended = (data && data.event === 'onStateChange' && Number(data.info) === 0)
                || (data && data.event === 'infoDelivery' && data.info && Number(data.info.playerState) === 0);
            if (!ended || !youtubeAutoAdvanceArmed || musicPlaybackMode !== 'advance' || !isPlaying || musicUnavailable) return;
            youtubeAutoAdvanceArmed = false;
            const currentIndex = tracks.findIndex(track => track.id === activeId);
            loadTrack(tracks[(currentIndex + 1) % tracks.length], 0);
        });
        playButton.addEventListener('click', () => {
            if (musicUnavailable) return;
            if (isPlaying) {
                anchorSec = currentPosition();
                isPlaying = false;
                command('pauseVideo');
            } else {
                isPlaying = true;
                anchorMs = Date.now();
                if (frameReady) {
                    command('unMute');
                    command('setVolume', [volumeLevel]);
                    command('playVideo');
                } else {
                    setFrameSource();
                }
            }
            savePosition();
            renderPlayer();
        });
        nextButton.addEventListener('click', () => {
            const currentIndex = tracks.findIndex(track => track.id === activeId);
            loadTrack(tracks[(currentIndex + 1) % tracks.length], 0);
        });
        modeButton.addEventListener('click', () => {
            anchorSec = currentPosition();
            anchorMs = Date.now();
            musicPlaybackMode = musicPlaybackMode === 'repeat' ? 'advance' : 'repeat';
            sessionStorage.setItem('ditzz_music_playback_mode', musicPlaybackMode);
            setFrameSource();
            savePosition();
            renderPlayer();
        });
        volume.addEventListener('input', () => {
            volumeLevel = Number(volume.value);
            sessionStorage.setItem('ditzz_volume', String(volumeLevel));
            command('setVolume', [volumeLevel]);
            if (volumeLevel === 0) command('mute');
            else command('unMute');
            renderPlayer();
        });
        window.setInterval(savePosition, 1000);
        window.addEventListener('pagehide', savePosition);
        window.addEventListener('storage', event => {
            if (event.key !== 'ditzz_config') return;
            let latest;
            try {
                latest = JSON.parse(event.newValue || '{}');
            } catch (error) {
                console.warn('Updated music settings could not be read.', error);
                return;
            }
            const unavailable = latest.websiteMusicEnabled === false || ((latest.featureStatus || {}).music || 'available') !== 'available';
            if (unavailable === musicUnavailable) return;
            musicUnavailable = unavailable;
            if (musicUnavailable) {
                if (isPlaying) anchorSec = currentPosition();
                isPlaying = false;
                command('pauseVideo');
            } else {
                isPlaying = true;
                anchorMs = Date.now();
                command('unMute');
                command('setVolume', [volumeLevel]);
                command('playVideo');
            }
            savePosition();
            renderPlayer();
        });
    }
})();
