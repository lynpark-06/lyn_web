// script.js - 최종 수정본 (아이템 이름 저장 + callout lines 보존 + GitHub Pages 경호환)

// GitHub Pages 서브디렉토리 자동 감지 (필요시 사용, 여기선 일단 생략 - 원래 경로 그대로)
// 만약 GitHub Pages에서 404 나면 아래 주석 해제하고 fixUrl 적용 필요

document.addEventListener('DOMContentLoaded', () => {
    const isHomePage = document.body.classList.contains('home');
    const isItemPage = Boolean(document.querySelector('.item-nav'));

    const ensureGlobalMenu = () => {
        let topbar = document.querySelector('.topbar');
        if (!topbar) {
            topbar = document.createElement('header');
            topbar.className = 'topbar';
            const spacer = document.createElement('div');
            spacer.className = 'topbar-spacer';
            spacer.setAttribute('aria-hidden', 'true');
            topbar.appendChild(spacer);
            const firstH1 = document.querySelector('h1');
            if (firstH1 && firstH1.parentElement === document.body) {
                document.body.insertBefore(topbar, firstH1);
            } else {
                document.body.insertBefore(topbar, document.body.firstChild);
            }
        }
        let toggle = topbar.querySelector('.menu-toggle');
        if (!toggle) {
            toggle = document.createElement('button');
            toggle.className = 'menu-toggle';
            toggle.type = 'button';
            toggle.setAttribute('aria-expanded', 'false');
            toggle.setAttribute('aria-controls', 'menu-dropdown');
            toggle.textContent = '+';
            topbar.insertBefore(toggle, topbar.firstChild);
        }
        let spacer = topbar.querySelector('.topbar-spacer');
        if (!spacer) {
            spacer = document.createElement('div');
            spacer.className = 'topbar-spacer';
            spacer.setAttribute('aria-hidden', 'true');
            topbar.appendChild(spacer);
        }
        let dropdown = topbar.querySelector('.dropdown');
        if (!dropdown) {
            dropdown = document.createElement('nav');
            dropdown.id = 'menu-dropdown';
            dropdown.className = 'dropdown';
            dropdown.setAttribute('aria-label', 'Menu');
            dropdown.innerHTML = '<a href="about.html">ABOUT</a><br><a href="archive.html">MY CHECKLIST</a>';
            topbar.appendChild(dropdown);
        }
        return { toggle, dropdown };
    };

    const { toggle, dropdown } = ensureGlobalMenu();

    if (isItemPage && !dropdown.querySelector('a[href="index.html"]')) {
        dropdown.insertAdjacentHTML('afterbegin', '<a href="index.html">HOME</a><br>');
    }

    const isAboutOrArchive = document.body.classList.contains('about') || document.body.classList.contains('archive');
    if (isAboutOrArchive && !dropdown.querySelector('a[href="index.html"]')) {
        dropdown.insertAdjacentHTML('afterbegin', '<a href="index.html">HOME</a><br>');
    }

    const setupMobileItemNav = (root) => {
        if (window.innerWidth > 768 || !root) return;

        const saveSection = root.querySelector('.q_and_a .item');
        const itemNavs = root.querySelectorAll('.item-nav');
        if (!saveSection || !itemNavs.length) return;

        if (root.__mobileItemNavController) {
            root.__mobileItemNavController.abort();
        }

        const controller = new AbortController();
        const { signal } = controller;
        root.__mobileItemNavController = controller;

        const updateMobileItemNavTop = () => {
            const rect = saveSection.getBoundingClientRect();
            const centerY = rect.top + (rect.height / 2);
            root.style.setProperty('--mobile-item-nav-top', `${Math.round(centerY)}px`);
        };

        const observer = new IntersectionObserver((entries) => {
            const isVisible = entries.some((entry) => entry.isIntersecting);
            root.classList.toggle('mobile-item-nav-visible', isVisible);
            if (isVisible) updateMobileItemNavTop();
        }, {
            threshold: 0.2,
            root: root.classList.contains('item-overlay') ? root : null,
            rootMargin: '0px 0px -10% 0px'
        });

        updateMobileItemNavTop();
        observer.observe(saveSection);

        const scrollTarget = root.classList.contains('item-overlay') ? root : window;
        scrollTarget.addEventListener('scroll', updateMobileItemNavTop, { passive: true, signal });
        window.addEventListener('resize', updateMobileItemNavTop, { signal });
        window.addEventListener('load', updateMobileItemNavTop, { signal });
        signal.addEventListener('abort', () => observer.disconnect(), { once: true });
    };

    if (toggle && dropdown) {
        const alignMobileDropdownToToggle = () => {
            if (window.innerWidth > 768) return;

            const toggleRect = toggle.getBoundingClientRect();
            const dropdownPosition = window.getComputedStyle(dropdown).position;

            if (dropdownPosition === 'fixed') {
                dropdown.style.left = `${Math.round(toggleRect.left)}px`;
                dropdown.style.top = `${Math.round(toggleRect.bottom + 6)}px`;
                dropdown.style.right = 'auto';
                return;
            }

            const topbar = toggle.closest('.topbar');
            if (!topbar) return;
            const topbarRect = topbar.getBoundingClientRect();
            dropdown.style.left = `${Math.round(toggleRect.left - topbarRect.left)}px`;
            dropdown.style.top = `${Math.round(toggleRect.bottom - topbarRect.top + 6)}px`;
            dropdown.style.right = 'auto';
        };

        alignMobileDropdownToToggle();
        window.addEventListener('resize', alignMobileDropdownToToggle);

        toggle.addEventListener('click', () => {
            alignMobileDropdownToToggle();
            const isOpen = dropdown.classList.toggle('show');
            toggle.setAttribute('aria-expanded', String(isOpen));
            if (!isOpen) {
                toggle.classList.add('just-closed');
            } else {
                toggle.classList.remove('just-closed');
            }
        });
        toggle.addEventListener('mouseleave', () => {
            toggle.classList.remove('just-closed');
        });
        document.addEventListener('click', (e) => {
            const clickedInside = e.target.closest('.topbar');
            if (!clickedInside) {
                dropdown.classList.remove('show');
                toggle.setAttribute('aria-expanded', 'false');
                toggle.classList.add('just-closed');
            }
        });
    }

    if (isHomePage) {
        const gridLinks = document.querySelectorAll('.grid a.grid-item, .grid .grid-item[href]');
        const prefetched = new Set();
        const pageCache = new Map();
        const parser = new DOMParser();
        let isOpening = false;
        let overlay = null;

        const ensureOverlay = () => {
            if (overlay) return overlay;
            overlay = document.createElement('section');
            overlay.className = 'item-overlay';
            overlay.setAttribute('aria-live', 'polite');
            document.body.appendChild(overlay);
            overlay.addEventListener('click', async (e) => {
                const anchor = e.target.closest('a');
                if (!anchor || !overlay.contains(anchor)) return;
                if (anchor.classList.contains('home-link')) {
                    e.preventDefault();
                    document.body.classList.remove('item-overlay-open');
                    overlay.classList.remove('is-active');
                    history.pushState({ overlay: false }, '', 'index.html');
                    setTimeout(() => {
                        overlay.innerHTML = '';
                    }, 240);
                    return;
                }
                if (anchor.classList.contains('item-nav')) {
                    e.preventDefault();
                    if (anchor.href) {
                        await openOverlayItem(anchor.href);
                    }
                }
            });
            return overlay;
        };

        const parseItemPage = async (href) => {
            if (pageCache.has(href)) return pageCache.get(href);
            const response = await fetch(href, { credentials: 'same-origin' });
            if (!response.ok) return null;
            const html = await response.text();
            const doc = parser.parseFromString(html, 'text/html');
            const titleLink = doc.querySelector('h1 .home-link');
            const prev = doc.querySelector('.item-nav.prev');
            const next = doc.querySelector('.item-nav.next');
            const photo = doc.querySelector('img[class$="-photo"], .q_and_a > img, body > img');
            const qa = doc.querySelector('.q_and_a');
            if (!titleLink || !photo || !qa) return null;

            // 각 페이지의 script에서 itemData.name 추출 (아이템 이름 저장용)
            let hardcodedItemName = '';
            const scripts = doc.querySelectorAll('script');
            for (let script of scripts) {
                const scriptText = script.textContent;
                if (scriptText && scriptText.includes('const itemData = {')) {
                    const match = scriptText.match(/name:\s*['"]([^'"]+)['"]/);
                    if (match && match[1]) {
                        hardcodedItemName = match[1];
                        break;
                    }
                }
            }

            const qaClone = qa.cloneNode(true);
            const inlineQaPhoto = qaClone.querySelector('img');
            if (inlineQaPhoto) inlineQaPhoto.remove();
            const data = {
                title: titleLink.textContent?.trim() || '',
                itemName: hardcodedItemName,
                photoSrc: photo.getAttribute('src') || '',
                photoClass: photo.className || '',
                prevHref: prev?.getAttribute('href') || '',
                nextHref: next?.getAttribute('href') || '',
                qaHTML: qaClone.innerHTML
            };
            pageCache.set(href, data);
            return data;
        };

        const openOverlayItem = async (href, options = {}) => {
            const { suppressPhotoReveal = false, preloadedData = null } = options;
            if (isOpening) return;
            isOpening = true;
            try {
                const itemData = preloadedData || await parseItemPage(href);
                if (!itemData) {
                    window.location.assign(href);
                    return;
                }
                const host = ensureOverlay();
                host.classList.remove('is-active', 'item-enter-active', 'item-enter-ready');
                host.innerHTML = `
                    <h1><a href="index.html" class="home-link">${itemData.title}</a></h1>
                    ${itemData.prevHref ? `<a href="${itemData.prevHref}" class="item-nav prev">←</a>` : ''}
                    ${itemData.nextHref ? `<a href="${itemData.nextHref}" class="item-nav next">→</a>` : ''}
                    <img src="${itemData.photoSrc}" class="${itemData.photoClass} reveal-photo overlay-photo${suppressPhotoReveal ? ' hero-hidden' : ''}" alt="">
                    <div class="q_and_a">${itemData.qaHTML}</div>
                `;
                const saveCheckbox = host.querySelector('#save-checkbox');
                if (saveCheckbox) {
                    let saved = JSON.parse(localStorage.getItem('savedItems')) || [];
                    const alreadySaved = saved.some(i => i.page === itemData.title);
                    saveCheckbox.checked = alreadySaved;
                    saveCheckbox.addEventListener('change', () => {
                        let saved = JSON.parse(localStorage.getItem('savedItems')) || [];
                        const idx = saved.findIndex(i => i.page === itemData.title);
                        if (saveCheckbox.checked) {
                            if (idx === -1) {
                                const finalName = itemData.itemName || itemData.title;
                                saved.push({
                                    name: finalName,
                                    photo: itemData.photoSrc,
                                    page: itemData.title
                                });
                            }
                        } else {
                            if (idx !== -1) saved.splice(idx, 1);
                        }
                        localStorage.setItem('savedItems', JSON.stringify(saved));
                    });
                }
                document.body.classList.add('item-overlay-open');
                host.classList.add('item-enter-ready');
                setupMobileItemNav(host);
                requestAnimationFrame(() => {
                    host.classList.add('is-active');
                    requestAnimationFrame(() => {
                        host.classList.add('item-enter-active');
                    });
                });
                history.pushState({ overlay: true, href }, '', href);
            } finally {
                isOpening = false;
            }
        };

        window.addEventListener('popstate', () => {
            if (!overlay) return;
            if (!document.body.classList.contains('item-overlay-open')) return;
            document.body.classList.remove('item-overlay-open');
            overlay.classList.remove('is-active');
            setTimeout(() => {
                overlay.innerHTML = '';
            }, 240);
        });

        gridLinks.forEach((link) => {
            const href = link.getAttribute('href');
            if (!href || prefetched.has(href)) return;
            prefetched.add(href);
            const prefetch = document.createElement('link');
            prefetch.rel = 'prefetch';
            prefetch.href = href;
            document.head.appendChild(prefetch);
        });

        gridLinks.forEach((link) => {
            link.addEventListener('click', async (e) => {
                if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                if (isOpening) return;
                const href = link.href || link.getAttribute('href');
                if (!href) return;
                const img = link.querySelector('img');
                if (!img) {
                    await openOverlayItem(href);
                    return;
                }
                e.preventDefault();
                const dataPromise = parseItemPage(href);
                const rect = img.getBoundingClientRect();
                if (!rect.width || !rect.height) {
                    await openOverlayItem(href);
                    return;
                }
                const ghost = img.cloneNode(true);
                ghost.style.position = 'fixed';
                ghost.style.left = `${rect.left}px`;
                ghost.style.top = `${rect.top}px`;
                ghost.style.width = `${rect.width}px`;
                ghost.style.height = `${rect.height}px`;
                ghost.style.objectFit = 'contain';
                ghost.style.margin = '0';
                ghost.style.zIndex = '2000';
                ghost.style.pointerEvents = 'none';
                ghost.style.willChange = 'left, top, width, height';
                ghost.style.transition = 'left 0.24s ease, top 0.24s ease, width 0.24s ease, height 0.24s ease';
                document.body.appendChild(ghost);
                link.style.opacity = '0';
                const quickWidth = Math.min(window.innerWidth * 0.52, 520);
                const ratio = rect.height / Math.max(1, rect.width);
                const quickHeight = quickWidth * ratio;
                const quickLeft = (window.innerWidth - quickWidth) / 2;
                const quickTop = Math.max(100, (window.innerHeight - quickHeight) * 0.24);
                requestAnimationFrame(() => {
                    ghost.style.left = `${quickLeft}px`;
                    ghost.style.top = `${quickTop}px`;
                    ghost.style.width = `${quickWidth}px`;
                    ghost.style.height = `${quickHeight}px`;
                });
                const data = await dataPromise;
                if (!data) {
                    window.location.assign(href);
                    return;
                }
                await openOverlayItem(href, { suppressPhotoReveal: true, preloadedData: data });
                const host = ensureOverlay();
                const targetImg = host.querySelector('.overlay-photo');
                if (!targetImg) {
                    ghost.remove();
                    link.style.opacity = '';
                    return;
                }
                const targetRect = targetImg.getBoundingClientRect();
                const finishHero = () => {
                    targetImg.classList.remove('hero-hidden');
                    ghost.remove();
                    link.style.opacity = '';
                };
                ghost.style.transition = 'left 0.18s ease, top 0.18s ease, width 0.18s ease, height 0.18s ease';
                ghost.addEventListener('transitionend', finishHero, { once: true });
                requestAnimationFrame(() => {
                    ghost.style.left = `${targetRect.left}px`;
                    ghost.style.top = `${targetRect.top}px`;
                    ghost.style.width = `${targetRect.width}px`;
                    ghost.style.height = `${targetRect.height}px`;
                });
                setTimeout(finishHero, 240);
            });
        });
    }

    if (isItemPage) {
        const photo = document.querySelector('img[class$="-photo"], .q_and_a > img, body > img');
        if (photo) photo.classList.add('reveal-photo');
        document.body.classList.add('item-enter-ready');
        setupMobileItemNav(document.body);
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                document.body.classList.add('item-enter-active');
            });
        });
    }

    // ========================
    // 원본 callout lines 코드 (hover 시 선 긋는 효과) - 그대로 복원
    // ========================
    const gridItems = document.querySelectorAll('.grid-item');
    if (gridItems.length) {
        const rand = (min, max) => Math.random() * (max - min) + min;
        const opaqueBoundsCache = new Map();
        const linePresetCache = new WeakMap();
        const itemPresetCache = new WeakMap();

        const getObjectFitContainRect = (boxWidth, boxHeight, naturalWidth, naturalHeight) => {
            if (!naturalWidth || !naturalHeight) return { x: 0, y: 0, width: boxWidth, height: boxHeight };
            const boxRatio = boxWidth / boxHeight;
            const imageRatio = naturalWidth / naturalHeight;
            if (imageRatio > boxRatio) {
                const width = boxWidth;
                const height = boxWidth / imageRatio;
                return { x: 0, y: (boxHeight - height) / 2, width, height };
            }
            const height = boxHeight;
            const width = boxHeight * imageRatio;
            return { x: (boxWidth - width) / 2, y: 0, width, height };
        };

        const getOpaqueBounds = (img) => {
            const src = img.currentSrc || img.src;
            if (!src) return null;
            if (opaqueBoundsCache.has(src)) return opaqueBoundsCache.get(src);
            const w = img.naturalWidth;
            const h = img.naturalHeight;
            if (!w || !h) return null;
            const maxSize = 900;
            const scale = Math.min(1, maxSize / Math.max(w, h));
            const cw = Math.max(1, Math.floor(w * scale));
            const ch = Math.max(1, Math.floor(h * scale));
            const canvas = document.createElement('canvas');
            canvas.width = cw;
            canvas.height = ch;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) return null;
            ctx.drawImage(img, 0, 0, cw, ch);
            const { data } = ctx.getImageData(20, 30, cw, ch);
            let minX = cw, minY = ch, maxX = -1, maxY = -1;
            for (let y = 0; y < ch; y++) {
                for (let x = 0; x < cw; x++) {
                    const alpha = data[(y * cw + x) * 4 + 3];
                    if (alpha > 8) {
                        if (x < minX) minX = x;
                        if (y < minY) minY = y;
                        if (x > maxX) maxX = x;
                        if (y > maxY) maxY = y;
                    }
                }
            }
            const bounds = maxX === -1
                ? { minX: 0, maxX: 1, minY: 0, maxY: 1 }
                : { minX: minX / cw, maxX: maxX / cw, minY: minY / ch, maxY: maxY / ch };
            opaqueBoundsCache.set(src, bounds);
            return bounds;
        };

        const getItemPreset = (item) => {
            if (itemPresetCache.has(item)) return itemPresetCache.get(item);
            const preset = { firstSide: 'right', upperFirst: true };
            itemPresetCache.set(item, preset);
            return preset;
        };

        const getLinePreset = (lineEl) => {
            if (linePresetCache.has(lineEl)) return linePresetCache.get(lineEl);
            const preset = {
                startEdgeT: Math.random(),
                startYT: Math.random(),
                anchorYT: Math.random(),
                randomGap: rand(30, 50),
                randomInward: rand(60, 70)
            };
            linePresetCache.set(lineEl, preset);
            return preset;
        };

        const applyCallout = (lineEl, boxWidth, boxHeight, side, zone, contentRect) => {
            const preset = getLinePreset(lineEl);
            const yRange = zone === 'upper' ? [0.12, 0.38] : [0.62, 0.88];
            const manualStartX = Number(lineEl.dataset.startX);
            const manualStartY = Number(lineEl.dataset.startY);
            const hasManualStart = Number.isFinite(manualStartX) && Number.isFinite(manualStartY);
            const edgeBand = Math.max(6, contentRect.width * 0.06);
            const forceRightEdge = lineEl.dataset.start === 'right-edge';
            const autoStartX = side === 'right'
                ? (forceRightEdge ? contentRect.right : contentRect.right - edgeBand + preset.startEdgeT * edgeBand)
                : contentRect.left + preset.startEdgeT * edgeBand;
            const autoStartY = contentRect.top + contentRect.height * (yRange[0] + preset.startYT * (yRange[1] - yRange[0]));
            const startX = hasManualStart ? contentRect.left + contentRect.width * Math.max(0, Math.min(1, manualStartX)) : autoStartX;
            const startY = hasManualStart ? contentRect.top + contentRect.height * Math.max(0, Math.min(1, manualStartY)) : autoStartY;
            const labelWidth = lineEl.offsetWidth || 180;
            const manualGap = Number(lineEl.dataset.gap);
            const outGap = Number.isFinite(manualGap) ? manualGap : preset.randomGap;
            const anchorX = side === 'right' ? boxWidth + labelWidth + outGap : -(labelWidth + outGap);
            const fixedAngleDeg = -166;
            const fixedSlope = Math.tan((fixedAngleDeg * Math.PI) / 180);
            const anchorY = startY - (startX - anchorX) * fixedSlope;
            const dx = startX - anchorX;
            const dy = startY - anchorY;
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);
            const manualInward = Number(lineEl.dataset.inward);
            const inwardExtension = Number.isFinite(manualInward) ? manualInward : preset.randomInward;
            const lineLength = Math.hypot(dx, dy) + inwardExtension;
            lineEl.style.setProperty('--tx', `${anchorX}px`);
            lineEl.style.setProperty('--ty', `${anchorY}px`);
            lineEl.style.setProperty('--line-length', `${lineLength}px`);
            lineEl.style.setProperty('--line-angle', `${angle}deg`);
            lineEl.style.setProperty('--anchor-x', side === 'right' ? '-14px' : 'calc(100% + 14px)');
            lineEl.style.setProperty('--text-shift-x', side === 'right' ? '-100%' : '0px');
            lineEl.style.setProperty('--intro-x', side === 'right' ? '14px' : '-14px');
        };

        const placeItemCallouts = (item) => {
            const overlayDiv = item.querySelector('.hover-meta');
            const img = item.querySelector('img');
            if (!overlayDiv || !img) return;
            const line = overlayDiv.querySelector('.meta-line');
            if (!line) return;
            const boxWidth = overlayDiv.clientWidth;
            const boxHeight = overlayDiv.clientHeight;
            if (!boxWidth || !boxHeight) return;
            if (!img.naturalWidth || !img.naturalHeight) return;
            const fitRect = getObjectFitContainRect(boxWidth, boxHeight, img.naturalWidth, img.naturalHeight);
            const opaque = getOpaqueBounds(img) || { minX: 0, maxX: 1, minY: 0, maxY: 1 };
            const contentRect = {
                left: fitRect.x + fitRect.width * opaque.minX,
                right: fitRect.x + fitRect.width * opaque.maxX,
                top: fitRect.y + fitRect.height * opaque.minY,
                bottom: fitRect.y + fitRect.height * opaque.maxY,
                width: Math.max(10, fitRect.width * (opaque.maxX - opaque.minX)),
                height: Math.max(10, fitRect.height * (opaque.maxY - opaque.minY))
            };
            const itemPreset = getItemPreset(item);
            const firstSide = itemPreset.firstSide;
            const upperFirst = itemPreset.upperFirst;
            applyCallout(line, boxWidth, boxHeight, firstSide, upperFirst ? 'upper' : 'lower', contentRect);
        };

        gridItems.forEach((item) => {
            const img = item.querySelector('img');
            if (!img) return;
            if (img.complete && img.naturalWidth) {
                placeItemCallouts(item);
            } else {
                img.addEventListener('load', () => placeItemCallouts(item), { once: true });
            }
        });

        window.addEventListener('resize', () => {
            gridItems.forEach((item) => placeItemCallouts(item));
        });
    }

});

       // ========================
    // 모바일 펀치아웃 (오래 유지되도록)
    // ========================
    if (window.innerWidth <= 768) {
        let ticking = false;
        function updateActive() {
            const items = document.querySelectorAll('.grid-item');
            const windowHeight = window.innerHeight;
            const center = windowHeight / 2;
            items.forEach(item => {
                const rect = item.getBoundingClientRect();
                const itemCenter = rect.top + rect.height / 2;
                const distance = Math.abs(itemCenter - center);
                // 추가 기준 (중앙에서 25% 이내)
                const addThreshold = windowHeight * 0.25;
                // 제거 기준 (중앙에서 40% 밖으로 나가면 제거) - 더 넓게
                const removeThreshold = windowHeight * 0.40;
                
                if (distance < addThreshold) {
                    item.classList.add('active');
                } else if (distance > removeThreshold) {
                    item.classList.remove('active');
                }
                // 그 사이 구간에서는 변화 없음 (이전 상태 유지) → 더 오래 머무름
            });
            ticking = false;
        }
        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(updateActive);
                ticking = true;
            }
        });
        window.addEventListener('resize', updateActive);
        updateActive();
        console.log('📱 모바일 펀치아웃 (추가 25%, 제거 40%)');
    }