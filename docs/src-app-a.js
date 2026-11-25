        /* ==========================================================================
           ONEDOPEA · V2 «КАПСУЛЫ» — переработанный интро-сегмент портфолио
           --------------------------------------------------------------------------
           Что сделано относительно верхнего концепта (кратко):

           [V1] ПЛОТНОСТЬ. Оболочки больше не «стекло на 58%»: физический гель
                (clearcoat, шероховатость 0.18, opacity 0.94) + внутренняя тёмная
                стенка. Содержимое читается силуэтом, а не растворяется в фоне.

           [V2] ЗАМОК. Половины — настоящие чашки: крышка (наружный радиус +0.012)
                надевается на корпус и входит в него на 0.24 из 1.18 длины чашки
                ≈ 20 %. В закрытом виде виден уступ шва и кромка, а не «стык в стык».

           [V3] КРАСНАЯ КАПСУЛА → МАТРИЦА. Наружу падают настоящие глифы (те же
                символы, что в дожде). Часть глифов «ловится» фоном и утекает
                в колонки дождя, часть падает на пол и рождает вспышку + ускоряет
                свою колонку. Дождь стартует пустым и разгоняется от высыпавшегося.

           [V4] СИНЯЯ КАПСУЛА → КОТ. Из открытой капсулы выпрыгивает логотип-кот,
                бежит по странице (галоп, squash-stretch, шлейф, пыль) и запрыгивает
                в аватар с буквой O., где и растворяется — буква «проявляется».

           [V5] ОБРАТНЫЙ СБОР. Никакой кучи: капсула держит «пасть», глифы/кот
                засасываются конвейером (очередь с задержками, воронка, сжатие
                у среза), затем крышка подлетает соосно, доворачивается и садится
                с «чпок» — микро-отскок и волна по оболочке.

           [V6] Таймлайн настраивается в CFG.timing.*, для проверки есть ?debug=1.
           ========================================================================== */
        (function () {
            'use strict';

            /* ======================================================================
               0. КОНФИГ
               ====================================================================== */
            const PARAMS = new URLSearchParams(window.location.search);
            const DEBUG = PARAMS.get('debug') === '1';
            const TIME_SCALE = PARAMS.get('slow') === '1' ? 0.32 : 1;

            const CFG = {
                // Габариты капсулы (мировые единицы three.js)
                capsule: {
                    radius: 0.52,        // радиус корпуса
                    capRadiusGrow: 0.013, // крышка чуть толще — читается нахлёст
                    cylLen: 0.66,        // длина цилиндра одной чашки
                    nestOverlap: 0.24,   // насколько крышка входит в корпус (≈20 % чашки)
                    wallThickness: 0.045
                },
                timing: {
                    liftToCenter: 0.62,     // подлёт капсулы в центр сцены
                    unscrew: 0.55,          // откручивание и сход крышки
                    pourDelay: 0.26,        // пауза «капсула наклонилась» до первого глифа
                    pourDuration: 1.75,     // сколько длится высыпание
                    shellHold: 2.9,         // оболочка держится, пока глифы падают и засевают дождь
                    halvesFade: 0.7,        // растворение оболочки
                    // Синяя ветка
                    catPopDelay: 0.16,      // кот появляется после схода крышки
                    catRunDuration: 1.5,    // бег от капсулы до аватара
                    pageRevealBlue: 1.15,   // лента проявляется, когда кот уже добежал
                    catLandPause: 0.55,     // кот «приживается» в аватаре перед растворением
                    // Обратный сбор
                    collectDelay: 0.24,
                    collectDuration: 1.15,
                    capReturn: 0.66,
                    clickHold: 0.34
                },
                counts: {
                    glyphs: 210,        // запас глифов на одно высыпание
                    sparks: 34,         // блики содержимого синей капсулы
                    runPuffs: 5
                },
                colors: {
                    redShell: 0x9c0b1c,
                    redEmissive: 0x33000a,
                    blueShell: 0x0d24a6,
                    blueEmissive: 0x00073a,
                    glyph: ['#8dffb3', '#4ef08c', '#c9ffe0', '#35d96f'],
                    glyphDim: '#12623a',
                    spark: '#dbe4ff'
                }
            };

            const REDUCED = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
            const MOBILE = (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ||
                Math.min(window.innerWidth, window.innerHeight) < 720;
            if (REDUCED) {
                CFG.counts.glyphs = 110;
                CFG.counts.sparks = 16;
                CFG.timing.pourDuration = 1.6;
                CFG.timing.catRunDuration = 1.1;
            }

            /* ======================================================================
               1. МЕЛОЧИ
               ====================================================================== */
            const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
            const lerp = (a, b, t) => a + (b - a) * t;
            const invLerp = (a, b, v) => clamp((v - a) / (b - a || 1), 0, 1);
            const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
            const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
            const easeInCubic = t => t * t * t;
            const easeInOutCubic = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
            const easeOutBack = (t, s) => 1 + (s = s === undefined ? 1.7 : s) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
            const easeOutQuint = t => 1 - Math.pow(1 - t, 5);
            const rand = (a, b) => a + Math.random() * (b - a);
            const pick = arr => arr[(Math.random() * arr.length) | 0];

            function dampV3(vec, tx, ty, tz, lambda, dt) {
                const k = 1 - Math.exp(-lambda * dt);
                vec.x += (tx - vec.x) * k;
                vec.y += (ty - vec.y) * k;
                vec.z += (tz - vec.z) * k;
            }

            const $ = id => document.getElementById(id);

            const dom = {
                body: document.body,
                redLayer: $('theme-red-layer'),
                blueLayer: $('theme-blue-layer'),
                seedCanvas: $('glyph-seed-layer'),
                matrixCanvas: $('matrix-canvas'),
                pageOne: $('page-one'),
                pageDope: $('page-dope'),
                caption: $('choose-caption'),
                captionText: $('caption-text'),
                captionHint: $('caption-hint'),
                webgl: $('webgl-container'),
                fallback: $('v3-fallback'),
                floatBtn: $('dope-floating-pills'),
                catSprite: $('cat-sprite'),
                catShadow: $('cat-shadow'),
                catPuff: $('cat-puff'),
                catLayer: $('cat-fx-layer'),
                orb: document.querySelector('#page-dope .profile-orb'),
                dbg: {
                    scene: $('dbg-scene'), red: $('dbg-red'), blue: $('dbg-blue'),
                    cat: $('dbg-cat'), glyphs: $('dbg-glyphs'), fps: $('dbg-fps')
                }
            };

            if (DEBUG) dom.body.classList.add('debug-on');

            /* ======================================================================
               2. ЭКРАННЫЕ ХЕЛПЕРЫ
               ====================================================================== */
            let W = window.innerWidth;
            let H = window.innerHeight;

            const GLYPHS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF<>/[]{}=+*#$%';
            const glyphChar = () => GLYPHS.charAt((Math.random() * GLYPHS.length) | 0);

            /* ======================================================================
               3. МАТРИЧНЫЙ ДОЖДЬ, ПИТАЕМЫЙ ВЫСЫПАВШИМИСЯ ГЛИФАМИ  [V3]
               ====================================================================== */
            const rain = {
                ctx: dom.matrixCanvas.getContext('2d'),
                cols: [],
                fontSize: 15,
                intensity: 0.06,     // 0 — сухой чёрный фон, 1 — полноценный дождь
                target: 0,
                acc: 0,
                dpr: 1,

                resize() {
                    const c = dom.matrixCanvas;
                    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
                    c.width = Math.floor(W * this.dpr);
                    c.height = Math.floor(H * this.dpr);
                    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
                    const n = Math.ceil(W / this.fontSize);
                    this.cols = new Array(n);
                    for (let i = 0; i < n; i++) {
                        this.cols[i] = {
                            head: rand(-H, 0),
                            speed: rand(48, 130),
                            boost: 0,
                            chars: new Array(26).fill(0).map(glyphChar),
                            nextSwap: rand(0.1, 0.6)
                        };
                    }
                    this.ctx.fillStyle = '#020704';
                    this.ctx.fillRect(0, 0, W, H);
                },

                /** Глиф «упал» в колонку x — вспышка и ускорение этой колонки. */
                seed(x, power) {
                    const idx = clamp(Math.round(x / this.fontSize), 0, this.cols.length - 1);
                    const c = this.cols[idx];
                    if (!c) return;
                    c.boost = Math.min(1.6, c.boost + (power || 0.9));
                    c.head = Math.min(c.head, rand(-20, H * 0.28));
                    c.speed = Math.max(c.speed, rand(150, 260));
                },

                update(dt) {
                    this.intensity = damp(this.intensity, this.target, 1.1, dt);
                    if (this.target <= 0.001 && this.intensity < 0.01) {
                        this.ctx.clearRect(0, 0, W, H);
                        return;
                    }
                    const ctx = this.ctx;
                    // Шлейфы: чем выше интенсивность, тем ярче хвост
                    ctx.fillStyle = 'rgba(2, 7, 4, ' + (0.20 - this.intensity * 0.07).toFixed(3) + ')';
                    ctx.fillRect(0, 0, W, H);
                    ctx.font = '600 ' + this.fontSize + 'px "JetBrains Mono", monospace';
                    ctx.textBaseline = 'top';

                    const active = Math.ceil(this.cols.length * clamp(this.intensity * 1.25, 0, 1));
                    for (let i = 0; i < this.cols.length; i++) {
                        const c = this.cols[i];
                        c.boost = Math.max(0, c.boost - dt * 0.75);
                        c.nextSwap -= dt;
                        if (c.nextSwap <= 0) {
                            c.chars[(Math.random() * c.chars.length) | 0] = glyphChar();
                            c.nextSwap = rand(0.08, 0.45);
                        }
                        // «Спящие» колонки держим медленными и почти погасшими
                        const live = i < active * 1.35 ? 1 : 0.12;
                        const speed = (c.speed + c.boost * 210) * live;
                        c.head += speed * dt;
                        if (c.head > H + 220) {
                            if (Math.random() < 0.55 * this.intensity + 0.04) {
                                c.head = rand(-260, -40);
                                c.speed = rand(60, 150);
                            } else {
                                c.head = -9999;
                            }
                        }
                        if (c.head < -600) continue;

                        const x = i * this.fontSize + 2;
                        const rows = 20;
                        for (let r = 0; r < rows; r++) {
                            const y = c.head - r * this.fontSize;
                            if (y < -this.fontSize || y > H) continue;
                            const fade = 1 - r / rows;
                            let alpha = fade * fade * (0.34 + 0.7 * clamp(this.intensity, 0, 1)) * live;
                            if (r === 0) alpha = Math.min(1, alpha + 0.28 + c.boost * 0.35);
                            if (r > 0 && r < 3) alpha += 0.12 * fade;
                            if (alpha <= 0.012) continue;
                            ctx.fillStyle = r === 0
                                ? 'rgba(214, 255, 228, ' + (alpha * 0.96).toFixed(3) + ')'
                                : 'rgba(52, 224, 122, ' + alpha.toFixed(3) + ')';
                            ctx.fillText(c.chars[r % c.chars.length], x, y);
                        }
                    }
                },

                reset() {
                    this.intensity = 0.06;
                    this.target = 0;
                    this.ctx.clearRect(0, 0, W, H);
                }
            };

            /* ======================================================================
               4. ГЛИФЫ, ВЫСЫПАЮЩИЕСЯ ИЗ КРАСНОЙ КАПСУЛЫ  [V3]
               ----------------------------------------------------------------------
               Три судьбы глифа:
                 • fell   — долетел до «пола», вспышка + подпитка колонки дождя;
                 • flow   — поймана фоном: утекает по дуге в колонку дождя и та
                            вспыхивает (это и есть «перетекание» в матричную тему);
                 • sucked — обратный сбор: засасывается в пасть капсулы.
               ====================================================================== */
            const glyphs = {
                ctx: dom.seedCanvas.getContext('2d'),
                list: [],
                dpr: 1,
                floorY: 0,
                mouth: { x: 0, y: 0 },

                resize() {
                    const c = dom.seedCanvas;
                    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
                    c.width = Math.floor(W * this.dpr);
                    c.height = Math.floor(H * this.dpr);
                    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
                    this.floorY = H * 0.9;
                },

                clear() { this.list.length = 0; this.ctx.clearRect(0, 0, W, H); },

                spawn(x, y, dirX, dirY, kind) {
                    const size = rand(12, 20) * (MOBILE ? 0.92 : 1);
                    this.list.push({
                        x: x + rand(-9, 9),
                        y: y + rand(-7, 7),
                        vx: dirX * rand(40, 190) + rand(-40, 40),
                        vy: dirY * rand(40, 170) + rand(-30, 60),
                        rot: rand(0, 6.28),
                        vr: rand(-7, 7),
                        size: size,
                        ch: glyphChar(),
                        color: pick(CFG.colors.glyph),
                        alpha: rand(0.72, 1),
                        state: 'fall',
                        t: 0,
                        // ~35 % глифов забирает фон прямо в полёте
                        captureAt: Math.random() < 0.36 ? rand(0.18, 0.5) : Infinity,
                        target: null,
                        landFade: rand(0.42, 0.8)
                    });
                },

                /** Обратный сбор: глифы летят из «пола» в пасть капсулы очередью. */
                spawnSuck(x, y, mouthX, mouthY) {
                    const cp = { x: lerp(x, mouthX, 0.55) + rand(-120, 120), y: Math.min(y, mouthY) - rand(120, 300) };
                    this.list.push({
                        x: x, y: y,
                        vx: 0, vy: 0,
                        rot: rand(0, 6.28),
                        vr: rand(-5, 5),
                        size: rand(11, 18),
                        ch: glyphChar(),
                        color: pick(CFG.colors.glyph),
                        alpha: 0,
                        state: 'suck',
                        t: 0,
                        dur: rand(0.62, 0.9),
                        from: { x: x, y: y },
                        cp: cp,
                        mouthX: mouthX, mouthY: mouthY,
                        delay: 0
                    });
                },

                update(dt, mouth) {
                    this.mouth = mouth;
                    const ctx = this.ctx;
                    ctx.clearRect(0, 0, W, H);
                    ctx.font = '700 16px "JetBrains Mono", monospace';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';

                    for (let i = this.list.length - 1; i >= 0; i--) {
                        const g = this.list[i];
                        g.t += dt;

                        if (g.state === 'fall') {
                            g.vy += 1500 * dt;
                            g.vx *= Math.exp(-0.9 * dt);
                            g.x += g.vx * dt;
                            g.y += g.vy * dt;
                            g.rot += g.vr * dt;

                            // Фон «забирает» глиф: он вытягивается и утекает в колонку дождя
                            if (g.t > g.captureAt) {
                                g.state = 'flow';
                                g.t = 0;
                                const toCol = clamp(Math.round(rand(0, W) / rain.fontSize), 0, rain.cols.length - 1);
                                g.flowFrom = { x: g.x, y: g.y };
                                g.flowTo = { x: toCol * rain.fontSize + 2, y: rand(-30, 30) };
                                g.flowDur = rand(0.5, 0.8);
                                rain.seed(g.flowTo.x, 0.45);
                                continue;
                            }

                            if (g.y > this.floorY) {
                                // Приземление: вспышка и подпитка колонки
                                g.y = this.floorY;
                                g.state = 'land';
                                g.t = 0;
                                rain.seed(g.x, 0.9);
                                this.ripple(g.x, this.floorY, g.color);
                                continue;
                            }
                        } else if (g.state === 'flow') {
                            const p = clamp(g.t / g.flowDur, 0, 1);
                            const e = easeInCubic(p);
                            g.x = lerp(g.flowFrom.x, g.flowTo.x, e) + Math.sin(p * 7) * 12 * (1 - p);
                            g.y = lerp(g.flowFrom.y, g.flowTo.y, e);
                            g.rot += 3 * dt;
                            g.stretch = 1 + p * 2.6;
                            if (p >= 1) {
                                rain.seed(g.flowTo.x, 1.5);
                                this.list.splice(i, 1);
                                continue;
                            }
                        } else if (g.state === 'land') {
                            const p = clamp(g.t / g.landFade, 0, 1);
                            g.y = this.floorY - p * 10;
                            g.alpha = (1 - p) * 0.5;
                            if (p >= 1) { this.list.splice(i, 1); continue; }
                        } else if (g.state === 'suck') {
                            const p = clamp((g.t - g.delay) / g.dur, 0, 1);
                            if (p <= 0) { g.alpha = 0; continue; }
                            // Квадратичная кривая в пасть + подкрутка
                            const e = easeInOutCubic(p);
                            const u = 1 - e;
                            const bx = u * u * g.from.x + 2 * u * e * g.cp.x + e * e * g.mouthX;
                            const by = u * u * g.from.y + 2 * u * e * g.cp.y + e * e * g.mouthY;
                            g.x = bx; g.y = by;
                            g.alpha = clamp(p * 4, 0, 1) * (1 - Math.pow(p, 3));
                            g.scale = lerp(1, 0.25, p * p);
                            g.rot += 6 * dt * (0.4 + p);
                            if (p >= 1) { this.list.splice(i, 1); continue; }
                        }

                        // --- отрисовка ---
                        const a = clamp(g.alpha === undefined ? 1 : g.alpha, 0, 1);
                        if (a <= 0.01) continue;
                        ctx.save();
                        ctx.translate(g.x, g.y);
                        ctx.rotate(g.rot * 0.35);
                        const sy = g.stretch || 1;
                        ctx.scale(g.scale || 1, (g.scale || 1) * sy);
                        ctx.globalAlpha = a;
                        // мягкое свечение — глиф читается как часть матричного поля
                        ctx.shadowColor = g.color;
                        ctx.shadowBlur = g.state === 'fall' ? 7 : 12;
                        ctx.fillStyle = g.color;
                        ctx.font = '700 ' + g.size + 'px "JetBrains Mono", monospace';
                        ctx.fillText(g.ch, 0, 0);
                        ctx.restore();
                        ctx.globalAlpha = 1;
                    }

                    // Вспышки от падений
                    for (let i = this.ripples.length - 1; i >= 0; i--) {
                        const r = this.ripples[i];
                        r.t += dt;
                        const p = clamp(r.t / r.dur, 0, 1);
                        if (p >= 1) { this.ripples.splice(i, 1); continue; }
                        const rad = 6 + p * 74;
                        ctx.beginPath();
                        ctx.arc(r.x, r.y, rad, 0, Math.PI * 2);
                        ctx.strokeStyle = 'rgba(125, 251, 164, ' + (0.42 * (1 - p)).toFixed(3) + ')';
                        ctx.lineWidth = 1.4;
                        ctx.stroke();
                    }
                },

                ripples: [],
                ripple(x, y, color) {
                    if (this.ripples.length > 26) return;
                    this.ripples.push({ x: x, y: y, t: 0, dur: rand(0.65, 1.1) });
                }
            };

            /* ======================================================================
               5. ИСКРЫ СОДЕРЖИМОГО СИНЕЙ КАПСУЛЫ
               ====================================================================== */
            const sparks = {
                list: [],
                spawn(x, y, dx, dy) {
                    this.list.push({
                        x: x, y: y,
                        vx: dx * rand(20, 130) + rand(-70, 70),
                        vy: dy * rand(20, 120) + rand(-60, 40),
                        r: rand(1.4, 4.2),
                        rot: rand(0, 6.28),
                        vr: rand(-6, 6),
                        a: rand(0.4, 0.95),
                        t: 0,
                        dur: rand(0.7, 1.5)
                    });
                },
                update(dt, ctx) {
                    for (let i = this.list.length - 1; i >= 0; i--) {
                        const s = this.list[i];
                        s.t += dt;
                        if (s.t > s.dur) { this.list.splice(i, 1); continue; }
                        s.vy += 420 * dt;
                        s.x += s.vx * dt;
                        s.y += s.vy * dt;
                        s.rot += s.vr * dt;
                        const p = s.t / s.dur;
                        ctx.save();
                        ctx.translate(s.x, s.y);
                        ctx.rotate(s.rot);
                        ctx.globalAlpha = s.a * (1 - p * p);
                        ctx.fillStyle = CFG.colors.spark;
                        ctx.fillRect(-s.r, -s.r * 0.5, s.r * 2, s.r);
                        ctx.restore();
                    }
                    ctx.globalAlpha = 1;
                }
            };
