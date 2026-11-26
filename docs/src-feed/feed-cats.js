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
           2. КОТ В АВАТАРЕ: векторный риг + сценарии поведения
           ----------------------------------------------------------------------
           Раньше здесь был спрайт-картинка, которой двигали transform: кот
           «переезжал» по аватару, не двигая лапами. Теперь в аватар вставляется
           SVG-риг (feed-rig.js), а сценарий задаёт ПОЗУ: цикл бега, карабканье,
           приседание, танец, сон. Лапы, хвост, корпус и голова живут отдельно,
           поэтому движение читается как движение животного.
           ====================================================================== */
        const CAT_SCRIPTS = ['dance', 'scratch', 'climb', 'peek', 'play', 'sleep', 'chase', 'jump'];

        function makeRig(host, cls) {
            const box = document.createElement('div');
            box.className = cls || 'cat-rig-box';
            box.innerHTML = buildCatSVG();
            host.appendChild(box);
            const svg = box.querySelector('svg');
            svg.classList.add('cat-rig');
            return { box: box, svg: svg, rig: new CatRig(svg) };
        }

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
            this.hero = !!opts.hero;

            const made = makeRig(this.scene, 'cat-rig-box');
            this.box = made.box;
            this.svg = made.svg;
            this.rig = made.rig;
            this.sprite = this.box;          // совместимость с мостом (opacity)

            // кот-путешественник по кромке карточки — тоже векторный
            if (this.walker) {
                const walk = makeRig(this.walker, 'cat-rig-box cat-rig-box--walk');
                this.walkSvg = walk.svg;
                this.walkRig = walk.rig;
            }
            if (this.script === 'play') {
                this.toy = document.createElement('i');
                this.toy.className = 'cat-toy';
                this.scene.appendChild(this.toy);
            }
            this.t = Math.random() * 6;      // разные фазы — коты не синхронны
            this.phase = 0;
            this.visible = false;
            this.heroMode = false;
            this.frozen = false;
            this.blink = 0;
            this.nextBlink = 1 + Math.random() * 3;
            this.pawTimer = 0;
            this.walkX = 0;
            this.walkDir = 1;
            this.lastTimer = Math.random() * 2;
            this.ready = true;
        }

        CatActor.prototype.setActive = function (on) {
            this.visible = on;
            if (!on) {
                this.box.style.opacity = '0';
                if (this.toy) this.toy.style.opacity = '0';
                if (this.walker) this.walker.classList.remove('is-on');
                if (this.board) this.board.classList.remove('is-on');
            } else {
                this.box.style.opacity = '1';
            }
        };

        CatActor.prototype.dropPaw = function (x, y) {
            if (!this.paws) return;
            const dot = document.createElement('i');
            dot.style.left = x.toFixed(1) + 'px';
            dot.style.top = y.toFixed(1) + 'px';
            this.paws.appendChild(dot);
            setTimeout(function () { dot.remove(); }, 1500);
        };

        /* Универсальный апдейт: сценарий возвращает позу в координатах сцены
           аватара (центр = 0,0). Каждый кадр выбирается ПОЗА рига:
             run / climb / sit / leap / land / idle  (см. CatRig). */
        CatActor.prototype.update = function (dt) {
            if (!this.visible || this.frozen) return;
            this.t += dt;
            const T = this.t;
            const rig = this.rig;
            let x = 0, y = 0, sc = 1, rot = 0, sy = 1, opacity = 1;
            let pose = rig.poseSit.bind(rig), phase = T;

            switch (this.script) {
                case 'dance': {
                    // Танцует в такт: перенос веса с лапы на лапу + подскоки,
                    // иногда крутится вокруг себя и «хлопает» передними лапами.
                    const beat = T * 5.2;
                    const hop = Math.max(0, Math.sin(beat));
                    const side = Math.sin(beat * 0.5);
                    x = side * 2.6;
                    y = -hop * 2.4;
                    rot = side * 0.18;
                    sy = 1 + hop * 0.06;
                    pose = function () { rig.poseDance(T); };
                    const cyc = T % 4.6;
                    if (cyc > 3.4) {                      // флип раз в цикл
                        const f = (cyc - 3.4) / 1.2;
                        rot += f * Math.PI * 2;
                        y -= Math.sin(f * Math.PI) * 9;
                    }
                    this.noteTimer = (this.noteTimer || 0) + dt;
                    if (this.noteTimer > 0.65) { this.noteTimer = 0; spawnNote(this.scene); }
                    break;
                }
                case 'scratch': {
                    // Царапает окошко с логотипом: подходит, встаёт на задние,
                    // «молотит» передней лапой по двери, потом отходит и садится.
                    const toward = 1.5;
                    const cyc = T % 3.9;
                    const scratching = cyc < 1.7;
                    if (scratching) {
                        const fast = Math.sin(T * 17);
                        x = toward + fast * 0.9;
                        y = 1.4 + Math.cos(T * 17) * 0.7;
                        rot = 0.16;
                        pose = function () { rig.poseScratch(T * 2.6); };
                        if (this.scratch && !this.scratch.classList.contains('is-on')) {
                            this.scratch.classList.remove('is-on');
                            void this.scratch.offsetWidth;
                            this.scratch.classList.add('is-on');
                        }
                    } else if (cyc < 2.6) {
                        const p = (cyc - 1.7) / 0.9;    // отходит
                        x = toward * (1 - p) - 2.2 * p;
                        y = Math.sin(p * Math.PI) * -1.4;
                        pose = function () {
                            rig.poseRun(p * 0.45 + 0.1);
                        };
                    } else {
                        pose = function (t) { rig.poseSit(t, 'content'); };
                        x = -2.2;
                    }
                    break;
                }
                case 'climb': {
                    // Вылезает из рамки аватара и гуляет по верхней кромке карточки
                    const inScene = T % 9.2;
                    if (inScene < 1.4) {
                        // цепляется за край и подтягивается вверх
                        const p = inScene / 1.4;
                        x = 0;
                        y = -p * 3.0;
                        pose = function () {
                            rig.poseClimb(p * 0.8);
                            // смотрит вверх, тянется к краю рамки
                            rig.setHead(-26 - p * 8, -2, 2);
                        };
                    } else if (inScene < 2.3) {
                        // перемах через рамку — кот уходит на кромку карточки
                        const p = (inScene - 1.4) / 0.9;
                        opacity = 1 - p;
                        x = 0;
                        y = -3.0 - p * 5;
                        pose = function () { rig.poseClimb(0.5 + p * 0.5); };
                        if (p > 0.5 && !this.walkerOn) {
                            this.walkerOn = true;
                            if (this.walker) this.walker.classList.add('is-on');
                            if (this.board) this.board.classList.add('is-on');
                        }
                    } else if (inScene < 7.7) {
                        // гуляет по верхней кромке: настоящий цикл бега
                        opacity = 0;
                        if (!this.walkerOn) {
                            this.walkerOn = true;
                            if (this.walker) { this.walker.classList.add('is-on'); this.walker.style.opacity = '1'; }
                            if (this.board) this.board.classList.add('is-on');
                        }
                        const p = (inScene - 2.3) / 5.4;
                        const cardW = this.card.clientWidth || 600;
                        const span = Math.max(60, cardW - 110);
                        const pos = (Math.sin(p * Math.PI * 2 - Math.PI / 2) * 0.5 + 0.5) * span + 28;
                        this.walkX = pos;
                        const dir = Math.cos(p * Math.PI * 2) >= 0 ? 1 : -1;
                        if (this.walker) {
                            this.walker.style.transform = 'translate(' + pos.toFixed(1) + 'px, -2px)';
                            this.walkSvg.style.transform = 'scaleX(' + dir + ')';
                            this.walkRig.poseRun(T * 1.8 % 1);
                        }
                        this.pawTimer += dt;
                        if (this.pawTimer > 0.16) {
                            this.pawTimer = 0;
                            this.dropPaw(pos + 14, 4);
                        }
                    } else if (inScene < 8.5) {
                        // спрыгивает обратно в аватар
                        const p = (inScene - 7.7) / 0.8;
                        opacity = p;
                        if (this.walker) {
                            this.walker.style.transform = 'translate(' + this.walkX.toFixed(1) + 'px, ' +
                                (-Math.sin(p * Math.PI) * 8).toFixed(1) + 'px)';
                            this.walker.style.opacity = String(1 - p);
                        }
                        pose = function () { rig.poseLeap(p); };
                        y = 4;
                    } else {
                        if (this.walkerOn) {
                            this.walkerOn = false;
                            if (this.walker) { this.walker.classList.remove('is-on'); this.walker.style.opacity = '1'; }
                            if (this.board) this.board.classList.remove('is-on');
                        }
                        y = 0;
                        pose = function (t) { rig.poseSit(t); };
                    }
                    break;
                }
                case 'peek': {
                    // Прячется за нижним краем аватара, выглядывает и моргает
                    const cyc = T % 5.4;
                    let up = 0;
                    if (cyc < 1.1) up = 0;
                    else if (cyc < 1.9) up = (cyc - 1.1) / 0.8;
                    else if (cyc < 4.2) up = 1 + Math.sin(T * 1.6) * 0.05;
                    else if (cyc < 5.0) up = 1 - (cyc - 4.2) / 0.8;
                    y = lerpNum(9, -1.0, up);
                    x = Math.sin(T * 0.9) * 2.0 * up;
                    pose = function (t) {
                        rig.poseSit(t);
                        rig.setHead(-4 + Math.sin(t * 1.4) * 4, -1.5 * up, Math.sin(t * 0.8) * 2);
                    };
                    break;
                }
                case 'play': {
                    // Играет: гоняется за «волной», прыгает на неё лапами
                    const cyc = T % 3.2;
                    const px = Math.sin(T * 2.1) * 6.5;
                    const py = Math.cos(T * 2.7) * 3.5 - 1.6;
                    if (this.toy) {
                        this.toy.style.transform = 'translate(' + (px + 4).toFixed(1) + 'px, ' + (py + 6).toFixed(1) + 'px)';
                        this.toy.style.opacity = (0.35 + 0.55 * Math.abs(Math.sin(T * 4))).toFixed(2);
                    }
                    const chase = Math.min(1, cyc / 2.1);
                    x = px * chase;
                    y = py * chase * 0.8;
                    if (cyc > 2.1) {
                        const p = (cyc - 2.1) / 1.1;
                        y -= Math.sin(p * Math.PI) * 4.6;
                        pose = function () { rig.poseLeap(p); };
                    } else {
                        pose = function () { rig.poseRun((T * 2.6) % 1); };
                    }
                    break;
                }
                case 'sleep': {
                    // Дремлет: медленно дышит, ухо дёргается, хвост ходит
                    y = 3.2;
                    pose = function (t) { rig.poseSit(t, 'sleep'); };
                    this.zzzTimer = (this.zzzTimer || 0) + dt;
                    if (this.zzzTimer > 1.8) { this.zzzTimer = 0; spawnZzz(this.scene); }
                    break;
                }
                case 'chase': {
                    // Реагирует на курсор: бежит за ним настоящим галопом
                    if (this.scene.dataset.pointerX) {
                        const tx = clampNum(parseFloat(this.scene.dataset.pointerX), -7, 7);
                        const ty = clampNum(parseFloat(this.scene.dataset.pointerY), -7, 7);
                        this.cx = lerpNum(this.cx || 0, tx, 1 - Math.exp(-6 * dt));
                        this.cy = lerpNum(this.cy || 0, ty, 1 - Math.exp(-6 * dt));
                    } else {
                        this.cx = Math.sin(T * 1.4) * 5;
                        this.cy = Math.cos(T * 1.9) * 3.4;
                    }
                    x = this.cx || 0;
                    y = this.cy || 0;
                    const moved = Math.abs(x - (this.px || 0)) + Math.abs(y - (this.py || 0));
                    this.px = x; this.py = y;
                    this.gait = clampNum(moved * 0.35, 0, 1);
                    this.speedPhase = ((this.speedPhase || 0) + dt * (1 + this.gait * 5)) % 1;
                    this.facing = (x - (this.lastX || x)) < 0 ? -1 : 1;
                    if (Math.abs(x - (this.lastX || x)) > 0.05) this.lastX = x;
                    pose = (function (self) {
                        return function () { self.rig.poseRun(self.speedPhase); };
                    })(this);
                    this.box.style.transform = 'translate(' + x.toFixed(2) + 'px,' + (y + 3).toFixed(2) + 'px) scale(' +
                        ((this.facing || 1)).toFixed(2) + ',1)';
                    pose();
                    return;
                }
                case 'jump':
                default: {
                    // Прыгает к кнопке лайка: приседает, взлетает, «давит» лапой
                    const cyc = T % 2.6;
                    if (cyc < 0.5) {
                        pose = function () { rig.poseLand(1 - cyc / 0.5); };
                        y = 3;
                    } else if (cyc < 1.1) {
                        const p = (cyc - 0.5) / 0.6;
                        y = 3 - Math.sin(p * Math.PI) * 9;
                        pose = function () { rig.poseLeap(p); };
                    } else if (cyc < 1.6) {
                        const p = (cyc - 1.1) / 0.5;
                        y = 3;
                        pose = function () { rig.poseLand(p); };
                    } else {
                        y = 3;
                        pose = function (t) { rig.poseSit(t); };
                    }
                    break;
                }
            }

            // моргание: у рига это реальное смыкание век, а не сквош всего кота
            rig.updateBlink(dt);

            pose(phase);
            this.box.style.opacity = String(opacity);
            this.box.style.transform = 'translate(' + x.toFixed(2) + 'px,' + (y + 3).toFixed(2) + 'px)' +
                (rot ? ' rotate(' + rot.toFixed(3) + 'rad)' : '');
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
