        /* ==========================================================================
           [V7] ЛЕНТА DOPE: сборка карточек + живые коты в каждом «фото профиля»
           --------------------------------------------------------------------------
           Что здесь есть:
             1. buildFeed()      — собирает карточки из DOPE_POSTS (арт, аудио, теги,
                                   лайки/сохранения) — лента выглядит как настоящая.
             2. CatActor         — один кот в аватаре карточки: спрайт, тень, глаза,
                                   следы лапок, состояние и «сценарий» поведения.
             3. Сценарии: dance | scratch | climb | peek | play | sleep | chase | jump.
             4. CatDirector      — тикает всех котов по rAF, ставит сцены на паузу,
                                   когда страница не видна, и включает «сцену» только
                                   для карточек в зоне видимости (IntersectionObserver).
             5. attachFeedToEngine() — связывает ленту с 3D-движком пилюль: кот,
                                   выпрыгнувший из синей капсулы, приземляется на
                                   первую публикацию и карабкается на место фото
                                   профиля; при сборе капсулы кот убегает обратно.
           ========================================================================== */
        // Спрайт кота появляется в движке позже — берём его лениво.
        let CAT_URL = '';
        function catUrl() {
            if (!CAT_URL) CAT_URL = typeof CAT_DATA_URL !== 'undefined' ? CAT_DATA_URL : '';
            return CAT_URL;
        }

        const ICONS = {
            heart: '<path d="M20.8 4.7a5.4 5.4 0 0 0-7.6 0L12 5.9l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6l1.2 1.2L12 21l7.6-7.5 1.2-1.2a5.4 5.4 0 0 0 0-7.6Z"/>',
            comment: '<path d="M20 11.5a7.5 7.5 0 0 1-8 7.5 8.6 8.6 0 0 1-3.5-.7L4 20l1.4-3.8A7.2 7.2 0 0 1 4 11.5 7.5 7.5 0 0 1 12 4a7.5 7.5 0 0 1 8 7.5Z"/>',
            repost: '<path d="m17 2 4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4m14-1v2a3 3 0 0 1-3 3H3"/>',
            save: '<path d="M6 4.8A1.8 1.8 0 0 1 7.8 3h8.4A1.8 1.8 0 0 1 18 4.8V21l-6-4-6 4V4.8Z"/>',
            share: '<path d="M14 4h6v6m-.5-5.5L10 14M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5"/>'
        };
        const svgIcon = name => '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + ICONS[name] + '</svg>';

        function esc(str) {
            return String(str).replace(/[&<>"]/g, function (c) {
                return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
            });
        }

        function formatNum(n) {
            return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        }

        /* ======================================================================
           1. СБОРКА ЛЕНТЫ
           ====================================================================== */
        function postMediaMarkup(post) {
            if (post.kind === 'audio') {
                const bars = [];
                for (let i = 0; i < 14; i++) {
                    bars.push('<i style="animation-delay:' + (i * 0.08).toFixed(2) + 's;height:' +
                        (14 + Math.round(Math.abs(Math.sin(i * 1.7)) * 26) / 2) + 'px"></i>');
                }
                return '<div class="post-audio">' +
                    '<span class="post-audio-art" aria-hidden="true">' +
                        (post.cover ? '<img src="' + esc(post.cover) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'" />' : '') +
                        '<b>' + esc(post.subtitle.split(' / ')[0] || 'ONE DOPE') + '</b>' +
                    '</span>' +
                    '<div><h3>' + esc(post.subtitle) + '</h3><p>Два релиза под общей обложкой · play →</p></div>' +
                    '<div class="bars" aria-hidden="true">' + bars.join('') + '</div>' +
                    '</div>';
            }
            return '<img class="post-art" src="' + esc(post.art) + '" alt="' + esc(post.title + ' — ' + post.subtitle) +
                '" loading="lazy" decoding="async" />';
        }

        function postMarkup(post, index) {
            const door = post.mark
                ? '<i class="cat-door" data-mark="' + esc(post.mark) + '" aria-hidden="true"></i>' : '';
            const tags = (post.tags || []).map(function (t) {
                return '<a href="#tag-' + esc(t) + '">#' + esc(t) + '</a>';
            }).join('');
            return '<article class="post-card" id="' + esc(post.id) + '" data-cat="' + esc(post.cat) + '" data-post="' + index + '" style="--i:' + index + '">' +
                '<header class="post-head">' +
                    '<div class="cat-avatar" data-cat-avatar="' + index + '">' +
                        '<div class="cat-scene" data-cat-scene="' + index + '"></div>' +
                        door +
                        '<svg class="cat-scratch" viewBox="0 0 26 26" aria-hidden="true">' +
                            '<path d="M7 3 5 20M13 2 11 21M19 4 17 19" stroke="#9fb4e8" stroke-width="1.5" stroke-linecap="round" fill="none"/>' +
                        '</svg>' +
                    '</div>' +
                    '<div class="post-author"><strong>' + esc(post.title) + '</strong><span>' + esc(post.meta) + '</span></div>' +
                    '<button type="button" class="post-more" aria-label="Действия с публикацией">•••</button>' +
                '</header>' +
                '<div class="cat-board" aria-hidden="true"></div>' +
                '<div class="cat-walker" data-cat-walker="' + index + '" aria-hidden="true"></div>' +
                '<div class="cat-paws" data-cat-paws="' + index + '" aria-hidden="true"></div>' +
                '<div class="post-media">' + postMediaMarkup(post) + '</div>' +
                '<div class="post-copy"><div><strong>onedopea</strong> ' + esc(post.copy) + '</div>' +
                    (tags ? '<div class="post-tags">' + tags + '</div>' : '') +
                '</div>' +
                '<div class="social-row">' +
                    '<button type="button" class="social-action" data-act="like" aria-label="Поставить лайк">' +
                        svgIcon('heart') + '<span data-count="like">' + formatNum(post.likes) + '</span></button>' +
                    '<button type="button" class="social-action" data-act="comment" aria-label="Комментарии">' +
                        svgIcon('comment') + '<span data-count="comment">' + formatNum(post.comments) + '</span></button>' +
                    '<button type="button" class="social-action" data-act="repost" aria-label="Репост">' +
                        svgIcon('repost') + '<span data-count="repost">' + formatNum(post.reposts) + '</span></button>' +
                    '<button type="button" class="social-action" data-act="share" aria-label="Поделиться">' +
                        svgIcon('share') + '</button>' +
                    '<button type="button" class="social-action save-action" data-act="save" aria-label="Сохранить">' +
                        svgIcon('save') + '</button>' +
                '</div>' +
            '</article>';
        }

        function buildFeed() {
            const feed = document.getElementById('dope-feed');
            if (!feed) return [];
            feed.innerHTML = DOPE_POSTS.map(postMarkup).join('');
            const countEl = document.getElementById('bio-posts-count');
            if (countEl) countEl.textContent = String(DOPE_POSTS.length);
            return Array.prototype.slice.call(feed.querySelectorAll('.post-card'));
        }

        /* ======================================================================
           2. КОТ В АВАТАРЕ: спрайт + сценарии поведения
           ====================================================================== */
        function makeSprite(cls, parent) {
            const el = document.createElement('div');
            el.className = cls;
            el.style.setProperty('--cat-url', 'url("' + catUrl() + '")');
            parent.appendChild(el);
            return el;
        }

        const CAT_SCRIPTS = ['dance', 'scratch', 'climb', 'peek', 'play', 'sleep', 'chase', 'jump'];

        function CatActor(opts) {
            this.card = opts.card;
            this.index = opts.index;
            this.script = opts.script;
            this.scene = opts.scene;         // .cat-scene внутри аватара
            this.walker = opts.walker;       // кот-путешественник по кромке карточки
            this.paws = opts.paws;
            this.door = opts.card.querySelector('.cat-door');
            this.scratch = opts.card.querySelector('.cat-scratch');
            this.board = opts.card.querySelector('.cat-board');

            this.sprite = makeSprite('cat-sprite-inline', this.scene);
            // кот-путешественник по кромке карточки: тот же спрайт
            if (this.walker) this.walker.style.setProperty('--cat-url', 'url("' + catUrl() + '")');
            if (this.script === 'play') {
                this.toy = document.createElement('i');
                this.toy.className = 'cat-toy';
                this.scene.appendChild(this.toy);
            }
            this.t = Math.random() * 6;      // разные фазы — коты не синхронны
            this.phase = 0;
            this.visible = false;
            this.heroMode = false;           // «прибыл из капсулы» — сценарий доигрывает вход
            this.frozen = false;
            this.blink = 0;
            this.nextBlink = 1 + Math.random() * 3;
            this.pawTimer = 0;
            this.walkX = 0;
            this.walkDir = 1;
            this.jumpT = 0;
            this.lastTimer = Math.random() * 2;
            this.ready = true;
        }

        CatActor.prototype.setActive = function (on) {
            this.visible = on;
            if (!on) {
                this.sprite.style.opacity = '0';
                if (this.toy) this.toy.style.opacity = '0';
                if (this.walker) this.walker.classList.remove('is-on');
                if (this.board) this.board.classList.remove('is-on');
            } else {
                this.sprite.style.opacity = '1';
            }
        };

        CatActor.prototype.dropPaw = function (x, y) {
            if (!this.paws) return;
            const dot = document.createElement('i');
            dot.style.left = x.toFixed(1) + 'px';
            dot.style.top = y.toFixed(1) + 'px';
            this.paws.appendChild(dot);
            const self = this;
            setTimeout(function () { dot.remove(); }, 1500);
        };

        /* Универсальный апдейт: каждый сценарий возвращает {x, y, sx, sy, rot}
           в координатах сцены аватара (центр = 0,0, радиус ~21px). */
        CatActor.prototype.update = function (dt) {
            if (!this.visible || this.frozen) return;
            this.t += dt;
            const T = this.t;
            let x = 0, y = 0, sx = 1, sy = 1, rot = 0;
            let opacity = 1;

            const breathe = 1 + Math.sin(T * 3.1) * 0.03;

            switch (this.script) {
                case 'dance': {
                    // Танцует: покачивание в такт, подпрыгивания «диско», поворот
                    const beat = T * 5.4;
                    const hop = Math.max(0, Math.sin(beat));
                    x = Math.sin(beat * 0.5) * 3.0;
                    y = -hop * 2.6;
                    rot = Math.sin(beat) * 0.22;
                    sy = (0.94 + hop * 0.14) * breathe;
                    sx = 1 / sy;
                    // иногда крутится вокруг себя (флип)
                    const cyc = T % 4.6;
                    if (cyc > 3.4) rot += (cyc - 3.4) / 1.2 * Math.PI * 2;
                    // музыкальные ноты
                    this.noteTimer = (this.noteTimer || 0) + dt;
                    if (this.noteTimer > 0.7) {
                        this.noteTimer = 0;
                        spawnNote(this.scene);
                    }
                    break;
                }
                case 'scratch': {
                    // Царапает окошко с логотипом: подходит к двери, «молотит» лапой
                    const toward = 1.4;
                    x = toward + Math.sin(T * 12) * 1.0 * (Math.sin(T * 2.2) > 0.1 ? 1 : 0.12);
                    y = 1.6 + Math.cos(T * 12) * 0.9;
                    rot = 0.2 + Math.sin(T * 12) * 0.1;
                    sx = 1 + Math.sin(T * 12) * 0.05;
                    sy = 1 - Math.sin(T * 12) * 0.05;
                    const cyc = T % 3.9;
                    if (cyc < 0.55) {
                        if (this.scratch && !this.scratch.classList.contains('is-on')) {
                            this.scratch.classList.remove('is-on');
                            void this.scratch.offsetWidth;
                            this.scratch.classList.add('is-on');
                        }
                    }
                    // между «сессиями» кот отходит и садится
                    if (cyc > 2.5) {
                        const back = (cyc - 2.5) / 1.4;
                        x = toward * (1 - back) - 2.4 * back;
                        y = 1.6 - Math.sin(back * Math.PI) * 1.6;
                        rot = 0.2 * (1 - back);
                    }
                    break;
                }
                case 'climb': {
                    // Вылезает из рамки аватара и гуляет по верхней кромке карточки
                    const inScene = T % 9.2;
                    if (inScene < 1.5) {
                        // ещё в аватаре: смотрит вверх и «заносит лапу»
                        const p = inScene / 1.5;
                        x = 0;
                        y = -p * 3.2;
                        rot = -0.3 * p;
                        sy = 1 + p * 0.16;
                        sx = 1 - p * 0.12;
                    } else if (inScene < 2.4) {
                        // перемах через край
                        const p = (inScene - 1.5) / 0.9;
                        opacity = 1 - p * 0.9;
                        x = 0;
                        y = -3.2 - p * 6;
                        rot = -0.3 - p * 1.1;
                        sy = 1.16 - p * 0.16;
                        sx = 0.88 + p * 0.12;
                        if (p > 0.55 && !this.walkerOn) {
                            this.walkerOn = true;
                            if (this.walker) this.walker.classList.add('is-on');
                            if (this.board) this.board.classList.add('is-on');
                        }
                    } else if (inScene < 7.6) {
                        // гуляет по кромке карточки
                        opacity = 0;
                        if (!this.walkerOn) {
                            this.walkerOn = true;
                            if (this.walker) { this.walker.classList.add('is-on'); this.walker.style.opacity = '1'; }
                            if (this.board) this.board.classList.add('is-on');
                        }
                        const p = (inScene - 2.4) / 5.2;
                        const cardW = this.card.clientWidth || 600;
                        const path = Math.max(60, cardW - 110);
                        const pos = (Math.sin(p * Math.PI * 2 - Math.PI / 2) * 0.5 + 0.5) * path + 28;
                        this.walkX = pos;
                        if (this.walker) {
                            const dir = Math.cos(p * Math.PI * 2) >= 0 ? 1 : -1;
                            const bob = Math.abs(Math.sin(T * 9)) * 2.2;
                            this.walker.style.transform = 'translate(' + pos.toFixed(1) + 'px, ' +
                                (-bob).toFixed(1) + 'px) scaleX(' + dir + ') rotate(' + (dir * -2) + 'deg)';
                            this.walker.style.transformOrigin = '50% 100%';
                        }
                        this.pawTimer += dt;
                        if (this.pawTimer > 0.16) {
                            this.pawTimer = 0;
                            this.dropPaw(pos + 14, 4);
                        }
                    } else if (inScene < 8.4) {
                        // возвращается в аватар
                        opacity = (inScene - 7.6) / 0.8;
                        if (this.walker) {
                            const p = (inScene - 7.6) / 0.8;
                            this.walker.style.transform = 'translate(' + this.walkX.toFixed(1) + 'px, ' +
                                (-Math.sin(p * Math.PI) * 8).toFixed(1) + 'px) scale(0.9)';
                            this.walker.style.opacity = String(1 - p);
                        }
                        y = 4;
                    } else {
                        // снова в аватаре
                        if (this.walkerOn) {
                            this.walkerOn = false;
                            if (this.walker) { this.walker.classList.remove('is-on'); this.walker.style.opacity = '1'; }
                            if (this.board) this.board.classList.remove('is-on');
                        }
                        y = 0;
                    }
                    break;
                }
                case 'peek': {
                    // Прячется за нижним краем аватара, выглядывает и моргает
                    const cyc = T % 5.4;
                    let up = 0;
                    if (cyc < 1.1) up = 0;
                    else if (cyc < 1.9) up = (cyc - 1.1) / 0.8;
                    else if (cyc < 4.2) up = 1 + Math.sin(T * 1.6) * 0.06;
                    else if (cyc < 5.0) up = 1 - (cyc - 4.2) / 0.8;
                    y = lerpNum(9, -1.2, up);
                    x = Math.sin(T * 0.9) * 2.2 * up;
                    rot = -0.14 * up;
                    sy = 1 + (1 - up) * 0.08;
                    break;
                }
                case 'play': {
                    // Играет: гоняется за «волной» (точкой), прыгает на неё
                    const cyc = T % 3.2;
                    const px = Math.sin(T * 2.1) * 7;
                    const py = Math.cos(T * 2.7) * 4 - 2;
                    if (this.toy) {
                        this.toy.style.transform = 'translate(' + (px + 4).toFixed(1) + 'px, ' + (py + 6).toFixed(1) + 'px)';
                        this.toy.style.opacity = (0.35 + 0.55 * Math.abs(Math.sin(T * 4))).toFixed(2);
                    }
                    const chase = Math.min(1, cyc / 2.1);
                    x = px * chase;
                    y = py * chase * 0.8 + (cyc > 2.1 ? -Math.sin((cyc - 2.1) / 1.1 * Math.PI) * 5 : 0);
                    rot = Math.sin(T * 5) * 0.1 * chase;
                    sy = 1 + (cyc > 2.1 ? Math.sin((cyc - 2.1) / 1.1 * Math.PI) * 0.1 : 0);
                    sx = 1 / Math.max(0.8, sy);
                    break;
                }
                case 'sleep': {
                    // Дремлет: медленно «дышит», изредка шевелит ухом/хвостом
                    y = 3.4 + Math.sin(T * 1.1) * 0.5;
                    sy = 1 - 0.055 - Math.sin(T * 1.1) * 0.02;
                    sx = 1 + 0.05;
                    rot = Math.sin(T * 0.6) * 0.04;
                    this.zzzTimer = (this.zzzTimer || 0) + dt;
                    if (this.zzzTimer > 1.8) {
                        this.zzzTimer = 0;
                        spawnZzz(this.scene);
                    }
                    break;
                }
                case 'chase': {
                    // Реагирует на курсор: бежит за ним внутри аватара
                    if (this.scene.dataset.pointerX) {
                        const tx = clampNum(parseFloat(this.scene.dataset.pointerX), -9, 9);
                        const ty = clampNum(parseFloat(this.scene.dataset.pointerY), -9, 9);
                        this.cx = lerpNum(this.cx || 0, tx, 1 - Math.exp(-7 * dt));
                        this.cy = lerpNum(this.cy || 0, ty, 1 - Math.exp(-7 * dt));
                    } else {
                        this.cx = Math.sin(T * 1.4) * 5;
                        this.cy = Math.cos(T * 1.9) * 4;
                    }
                    x = this.cx || 0;
                    y = this.cy || 0;
                    const sp = Math.abs(x - (this.px || 0)) + Math.abs(y - (this.py || 0));
                    this.px = x; this.py = y;
                    const run = clampNum(sp * 0.5, 0, 1);
                    sx = 1 + run * 0.12;
                    sy = 1 - run * 0.08;
                    rot = clampNum((x - (this.lastX || x)) * 0.05, -0.2, 0.2);
                    this.lastX = x;
                    break;
                }
                case 'jump':
                default: {
                    // Прыгает к кнопке лайка: приседает, взлетает, «давит» лапой
                    const cyc = T % 2.6;
                    if (cyc < 0.5) {
                        const p = cyc / 0.5;
                        sy = 1 - p * 0.18; sx = 1 + p * 0.16;
                        y = 3;
                    } else if (cyc < 1.1) {
                        const p = (cyc - 0.5) / 0.6;
                        y = 3 - Math.sin(p * Math.PI) * 12;
                        sy = 1.12 - p * 0.2; sx = 1 / Math.max(0.85, sy);
                        rot = 0.1 - p * 0.2;
                    } else if (cyc < 1.6) {
                        const p = (cyc - 1.1) / 0.5;
                        y = 3;
                        sy = 0.84 + p * 0.16; sx = 1.14 - p * 0.12;
                    } else {
                        y = 3;
                    }
                    break;
                }
            }

            // моргание (лёгкое «прищуривание» через сквош по Y)
            this.nextBlink -= dt;
            if (this.nextBlink <= 0) {
                this.nextBlink = 2.2 + Math.random() * 3.4;
                this.blink = 1;
            }
            if (this.blink > 0) {
                this.blink = Math.max(0, this.blink - dt * 5);
                sy *= 1 - this.blink * 0.12;
            }

            const el = this.sprite;
            el.style.opacity = String(opacity);
            el.style.transform = 'translate(' + x.toFixed(2) + 'px, ' + (y + 3).toFixed(2) + 'px) scaleX(' +
                (sx * (this.facing || 1)).toFixed(3) + ') scaleY(' + sy.toFixed(3) + ') rotate(' + rot.toFixed(3) + 'rad)';
        };

        /* Лёгкие «декоры» вокруг кота: ноты, «z-z-z» */
        function spawnNote(scene) {
            const n = document.createElement('span');
            n.className = 'cat-note';
            n.textContent = Math.random() > 0.5 ? '♪' : '♫';
            n.style.left = (12 + Math.random() * 18) + 'px';
            n.style.bottom = (18 + Math.random() * 8) + 'px';
            scene.appendChild(n);
            setTimeout(function () { n.remove(); }, 1400);
        }
        function spawnZzz(scene) {
            const n = document.createElement('span');
            n.className = 'cat-zzz';
            n.textContent = 'z';
            n.style.left = (20 + Math.random() * 10) + 'px';
            n.style.bottom = '16px';
            scene.appendChild(n);
            setTimeout(function () { n.remove(); }, 2000);
        }
        const lerpNum = (a, b, t) => a + (b - a) * t;
        const clampNum = (v, a, b) => v < a ? a : (v > b ? b : v);

        /* ======================================================================
           3. ДИРЕКТОР: тикает котов, режет по видимости
           ====================================================================== */
        function CatDirector() {
            this.actors = [];
            this.last = 0;
            this.running = false;
            this.paused = true;
            this.io = null;
        }
        CatDirector.prototype.add = function (actor) {
            this.actors.push(actor);
            return actor;
        };
        CatDirector.prototype.start = function () {
            if (this.running) return;
            this.running = true;
            const self = this;
            let last = performance.now();
            (function loop(now) {
                const dt = Math.min(0.05, (now - last) / 1000);
                last = now;
                if (!self.paused) {
                    for (let i = 0; i < self.actors.length; i++) self.actors[i].update(dt);
                }
                requestAnimationFrame(loop);
            })(last);
        };
        CatDirector.prototype.observe = function (cards) {
            if (!('IntersectionObserver' in window)) return;
            const self = this;
            const map = {};
            this.actors.forEach(function (a) { map[a.card] = a; });
            this.io = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    const actor = map[entry.target];
                    if (!actor) return;
                    actor.setActive(entry.isIntersecting && entry.intersectionRatio > 0.08);
                });
            }, { root: null, rootMargin: '60px', threshold: [0, 0.08, 0.5] });
            cards.forEach(function (card) { self.io.observe(card); });
        };
