
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
/*__FEED_BUNDLE__*/

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
            /* ======================================================================
               6. THREE.JS СЦЕНА
               ====================================================================== */
            if (typeof THREE === 'undefined') {
                dom.fallback.classList.add('show');
                return;
            }

            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(36, W / H, 0.1, 100);
            camera.position.set(0, 0.25, 7.6);

            let renderer;
            try {
                renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
            } catch (err) {
                dom.fallback.classList.add('show');
                return;
            }
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MOBILE ? 1.75 : 2));
            renderer.setSize(W, H);
            renderer.setClearColor(0x000000, 0);
            // Без ACES: пастельного «выцветания» на светлом фоне не будет,
            // красный и синий остаются насыщенными.
            renderer.toneMapping = THREE.LinearToneMapping;
            renderer.toneMappingExposure = 1.0;
            if ('outputEncoding' in renderer) renderer.outputEncoding = THREE.sRGBEncoding;
            dom.webgl.appendChild(renderer.domElement);

            /* --- студийное окружение: живые блики на геле --- */
            function buildStudioEnv() {
                const c = document.createElement('canvas');
                c.width = 512; c.height = 256;
                const x = c.getContext('2d');
                const g = x.createLinearGradient(0, 0, 0, 256);
                g.addColorStop(0, '#ffffff');
                g.addColorStop(0.34, '#eef3ff');
                g.addColorStop(0.58, '#c9d2e6');
                g.addColorStop(0.78, '#f2f5fb');
                g.addColorStop(1, '#ffffff');
                x.fillStyle = g;
                x.fillRect(0, 0, 512, 256);
                x.fillStyle = '#ffffff';
                x.fillRect(40, 18, 172, 54);
                x.fillRect(288, 24, 180, 46);
                x.fillStyle = 'rgba(255,255,255,0.9)';
                x.fillRect(96, 150, 300, 22);
                // две контрастные полосы дают «карамельный» блик по бокам
                x.fillStyle = 'rgba(255,255,255,0.55)';
                x.fillRect(430, 96, 16, 120);
                x.fillStyle = 'rgba(120,140,190,0.28)';
                x.fillRect(60, 96, 14, 120);

                const tex = new THREE.CanvasTexture(c);
                tex.mapping = THREE.EquirectangularReflectionMapping;
                if ('encoding' in tex) tex.encoding = THREE.sRGBEncoding;
                const pmrem = new THREE.PMREMGenerator(renderer);
                pmrem.compileEquirectangularShader();
                const rt = pmrem.fromEquirectangular(tex);
                tex.dispose();
                pmrem.dispose();
                return rt.texture;
            }
            scene.environment = buildStudioEnv();

            scene.add(new THREE.HemisphereLight(0xf3f6ff, 0xb9c2d6, 0.55));
            const key = new THREE.DirectionalLight(0xffffff, 0.78); key.position.set(3.4, 6.4, 4.6); scene.add(key);
            const fill = new THREE.DirectionalLight(0xeef4ff, 0.3); fill.position.set(-4.6, 2.2, 4); scene.add(fill);
            const rim = new THREE.DirectionalLight(0xffffff, 0.55); rim.position.set(-1.5, -3, -4); scene.add(rim);

            /* ======================================================================
               7. ГЕОМЕТРИЯ КАПСУЛЫ  [V1] плотный гель + [V2] настоящий замок
               ----------------------------------------------------------------------
               Чашка = открытый цилиндр + полусфера на закрытом торце.
               Корпус (body):   ось X, открытый срез в x = 0, купол в x = -cylLen
               Крышка (cap):    ось X, открытый срез в x = 0, купол в x = +cylLen
               В закрытом виде крышка сдвинута к корпусу на nestOverlap (≈20 % чашки),
               её радиус на capRadiusGrow больше — виден уступ и «хвост» шва.
               ====================================================================== */
            const SEG = CFG.capsule;

            function buildHalf(side, options) {
                // side: -1 корпус, +1 крышка
                const r = side > 0 ? SEG.radius + SEG.capRadiusGrow : SEG.radius;
                const L = SEG.cylLen;
                const g = new THREE.Group();

                const outer = new THREE.Mesh(
                    new THREE.CylinderGeometry(r, r, L, 48, 1, true),
                    options.shell
                );
                outer.geometry.rotateZ(Math.PI / 2);
                outer.geometry.translate(side * L / 2, 0, 0);
                outer.renderOrder = 6;
                g.add(outer);

                // Купол закрытого торца
                const domeGeo = new THREE.SphereGeometry(r, 48, 26, 0, Math.PI * 2, 0, Math.PI * 0.5);
                domeGeo.rotateZ(side > 0 ? -Math.PI / 2 : Math.PI / 2);
                domeGeo.translate(side * L, 0, 0);
                const dome = new THREE.Mesh(domeGeo, options.shell);
                dome.renderOrder = 6;
                g.add(dome);

                // Внутренняя стенка: «мясо» геля, из-за неё капсула не просвечивает
                const ir = r - SEG.wallThickness;
                const innerGeo = new THREE.CylinderGeometry(ir, ir, L, 40, 1, true);
                innerGeo.rotateZ(Math.PI / 2);
                innerGeo.translate(side * L / 2, 0, 0);
                const inner = new THREE.Mesh(innerGeo, options.cavity);
                inner.renderOrder = 5;
                g.add(inner);

                const innerDomeGeo = new THREE.SphereGeometry(ir, 40, 22, 0, Math.PI * 2, 0, Math.PI * 0.5);
                innerDomeGeo.rotateZ(side > 0 ? -Math.PI / 2 : Math.PI / 2);
                innerDomeGeo.translate(side * L, 0, 0);
                const innerDome = new THREE.Mesh(innerDomeGeo, options.cavity);
                innerDome.renderOrder = 5;
                g.add(innerDome);

                // Кромка среза: читаемая толщина желатина
                const rimGeo = new THREE.TorusGeometry(r - SEG.wallThickness * 0.55, SEG.wallThickness * 0.62, 12, 48);
                rimGeo.rotateY(Math.PI / 2);
                const rimMesh = new THREE.Mesh(rimGeo, options.shell);
                rimMesh.renderOrder = 7;
                g.add(rimMesh);

                // [V2] Уступ замка: широкий «поясок» крышки, который видно поверх корпуса
                if (side > 0) {
                    const lipGeo = new THREE.TorusGeometry(r + 0.006, 0.021, 12, 56);
                    lipGeo.rotateY(Math.PI / 2);
                    lipGeo.translate(-0.03, 0, 0);
                    const lip = new THREE.Mesh(lipGeo, options.shell);
                    lip.renderOrder = 9;
                    g.add(lip);
                }
                // Кольцо-канавка корпуса в месте, где сидит крышка: тёмная линия стыка
                const grooveGeo = new THREE.TorusGeometry(r + 0.002, 0.009, 8, 56);
                grooveGeo.rotateY(Math.PI / 2);
                grooveGeo.translate(0.014, 0, 0);
                const grooveMesh = new THREE.Mesh(grooveGeo, options.groove);
                grooveMesh.renderOrder = 10;
                g.add(grooveMesh);

                return g;
            }

            // Мягкая каустическая тень под капсулой
            function shadowTexture(rgb) {
                const c = document.createElement('canvas');
                c.width = 256; c.height = 128;
                const x = c.getContext('2d');
                const g = x.createRadialGradient(128, 64, 8, 128, 64, 120);
                g.addColorStop(0, 'rgba(' + rgb + ',0.42)');
                g.addColorStop(0.45, 'rgba(' + rgb + ',0.20)');
                g.addColorStop(0.8, 'rgba(' + rgb + ',0.06)');
                g.addColorStop(1, 'rgba(' + rgb + ',0)');
                x.fillStyle = g;
                x.fillRect(0, 0, 256, 128);
                return new THREE.CanvasTexture(c);
            }

            /* ======================================================================
               8. ГЛИФЫ В 3D (лицевые карточки-символы)  [V3]
               ====================================================================== */
            const GLYPH_TEX_COUNT = 10;
            const glyphTextures = [];
            (function buildGlyphTextures() {
                for (let i = 0; i < GLYPH_TEX_COUNT; i++) {
                    const c = document.createElement('canvas');
                    c.width = c.height = 96;
                    const x = c.getContext('2d');
                    x.clearRect(0, 0, 96, 96);
                    x.font = '700 78px "JetBrains Mono", monospace';
                    x.textAlign = 'center';
                    x.textBaseline = 'middle';
                    x.fillStyle = '#ffffff';
                    x.fillText(glyphChar(), 48, 52);
                    const t = new THREE.CanvasTexture(c);
                    if ('encoding' in t) t.encoding = THREE.sRGBEncoding;
                    t.minFilter = THREE.LinearFilter;
                    glyphTextures.push(t);
                }
            })();

            function makeGlyphPool(count) {
                const per = Math.ceil(count / GLYPH_TEX_COUNT);
                const meshes = [];
                const items = [];
                const plane = new THREE.PlaneGeometry(1, 1);
                for (let i = 0; i < GLYPH_TEX_COUNT; i++) {
                    const mat = new THREE.MeshBasicMaterial({
                        map: glyphTextures[i],
                        transparent: true,
                        depthWrite: false,
                        depthTest: true,
                        side: THREE.DoubleSide,
                        blending: THREE.NormalBlending,
                        opacity: 1,
                        color: 0xffffff
                    });
                    const mesh = new THREE.InstancedMesh(plane, mat, per);
                    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
                    mesh.frustumCulled = false;
                    mesh.renderOrder = 4;
                    mesh.count = 0;
                    mesh.visible = false;
                    // цвет на экземпляр
                    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(per * 3), 3);
                    mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
                    scene.add(mesh);
                    meshes.push(mesh);
                }
                for (let k = 0; k < meshes.length; k++) {
                    for (let i = 0; i < per; i++) {
                        items.push({
                            mesh: meshes[k], index: i,
                            alive: false,
                            pos: new THREE.Vector3(),
                            prev: new THREE.Vector3(),
                            vel: new THREE.Vector3(),
                            rot: 0, vr: 0,
                            scale: 0.1,
                            size: 0.14,
                            alpha: 1,
                            t: 0,
                            color: new THREE.Color(),
                            state: 'idle'
                        });
                    }
                }
                return { meshes: meshes, items: items, per: per, plane: plane };
            }

            /* ======================================================================
               9. КОТ-ЛОГОТИП  [V10]
               ----------------------------------------------------------------------
               Растрового спрайта и 3D-плоскости больше нет: кота целиком рисует
               векторный риг в DOM (hero-cat.js + feed-rig.js). Здесь остаётся
               только «держатель состояния», который читают движок и отладка.
               ====================================================================== */
            const catRig = {
                ready: true,
                state: 'idle',
                pos: new THREE.Vector3(),
                root: { visible: false }
            };

            /* ======================================================================
               10. КАПСУЛЫ
               ====================================================================== */
            function buildCapsule(id, opts) {
                const group = new THREE.Group();
                scene.add(group);

                // [V1] Плотный гель: непрозрачная «карамель» + тёмная полость.
                // Капсула не просвечивает и не выцветает на светлом фоне.
                // Прозрачность включается только на исчезновении (setPillTransparent).
                const shell = new THREE.MeshPhysicalMaterial({
                    color: opts.shell,
                    emissive: opts.emissive,
                    emissiveIntensity: 0.07,
                    roughness: 0.09,
                    metalness: 0.0,
                    clearcoat: 1,
                    clearcoatRoughness: 0.05,
                    reflectivity: 0.4,
                    envMapIntensity: 0.22,
                    transparent: false,
                    opacity: 1,
                    depthWrite: true,
                    side: THREE.FrontSide
                });
                // Полость: видна только изнутри (BackSide) — тёмный зев капсулы
                const cavity = new THREE.MeshPhysicalMaterial({
                    color: opts.innerWall,
                    emissive: opts.emissive,
                    emissiveIntensity: 0.05,
                    roughness: 0.78,
                    metalness: 0,
                    clearcoat: 0.2,
                    envMapIntensity: 0.12,
                    transparent: false,
                    opacity: 1,
                    depthWrite: true,
                    side: THREE.BackSide
                });
                const groove = new THREE.MeshStandardMaterial({
                    color: opts.grooveColor,
                    roughness: 0.38,
                    metalness: 0,
                    transparent: false,
                    opacity: 1,
                    depthWrite: false
                });
                // Крышка на 6 % темнее корпуса — как у настоящей двухцветной капсулы,
                // поэтому нахлёст читается даже в статике
                const capShell = shell.clone();
                capShell.color = new THREE.Color(opts.shell).multiplyScalar(0.9);
                capShell.needsUpdate = true;
                const body = buildHalf(-1, { shell: shell, cavity: cavity, groove: groove });
                const cap = buildHalf(1, { shell: capShell, cavity: cavity, groove: groove });
                const materials = [shell, cavity, groove, capShell];
                group.add(body);
                group.add(cap);

                // Капсула = корпус + крышка, надетая на 20 %
                const halfShift = SEG.nestOverlap / 2;
                body.position.x = halfShift;
                cap.position.x = -halfShift;

                const hit = new THREE.Mesh(
                    new THREE.BoxGeometry(2.4, 1.3, 1.3),
                    new THREE.MeshBasicMaterial({ visible: false })
                );
                group.add(hit);

                // Блик-«окно» на оболочке: тонкая вытянутая полоса, а не точка
                const spec = new THREE.Mesh(
                    new THREE.SphereGeometry(0.16, 16, 12),
                    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.18, depthWrite: false })
                );
                spec.scale.set(1.9, 0.16, 0.2);
                spec.position.set(-0.18, SEG.radius * 0.72, SEG.radius * 0.6);
                group.add(spec);

                const shadow = new THREE.Mesh(
                    new THREE.PlaneGeometry(3.1, 1.5),
                    new THREE.MeshBasicMaterial({ map: shadowTexture(opts.shadowRgb), transparent: true, opacity: 0.5, depthWrite: false })
                );
                shadow.rotation.x = -Math.PI / 2;
                shadow.position.set(opts.homeX, -1.2, 0);
                scene.add(shadow);

                return {
                    id: id,
                    group: group,
                    body: body,
                    cap: cap,
                    shell: shell,
                    materials: materials,
                    hit: hit,
                    spec: spec,
                    shadow: shadow,
                    homeX: opts.homeX,
                    homeY: opts.homeY,
                    state: 'idle',
                    t: 0,
                    angles: { x: opts.angX, y: opts.angY, z: opts.angZ },
                    shellAlpha: 1,
                    capOffset: { x: -halfShift, spin: 0, y: 0, z: 0 },
                    glyphPool: makeGlyphPool(CFG.counts.glyphs),
                    sparkPool: makeSparkPool(CFG.counts.sparks),
                    poured: 0,
                    pourAcc: 0,
                    mouth: new THREE.Vector3(),
                    base: new THREE.Vector3(opts.homeX, opts.homeY, 0),
                    pos: new THREE.Vector3(opts.homeX, opts.homeY, 0),
                    scale: 1,
                    wobble: 0,
                    landing: 0
                };
            }

            function makeSparkPool(count) {
                const geo = new THREE.PlaneGeometry(1, 1);
                const mesh = new THREE.InstancedMesh(
                    geo,
                    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }),
                    count
                );
                mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
                mesh.frustumCulled = false;
                mesh.renderOrder = 5;
                mesh.count = 0;
                mesh.visible = false;
                mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3);
                scene.add(mesh);
                const items = [];
                for (let i = 0; i < count; i++) {
                    items.push({
                        alive: false, pos: new THREE.Vector3(), vel: new THREE.Vector3(),
                        rot: 0, vr: 0, size: 0.04, t: 0, dur: 1, color: new THREE.Color(0xdbe4ff)
                    });
                }
                return { mesh: mesh, items: items };
            }

            const redPill = buildCapsule('red', {
                shell: CFG.colors.redShell,
                emissive: CFG.colors.redEmissive,
                innerWall: 0x2a0206,
                grooveColor: 0x6d0210,
                shadowRgb: '186,12,26',
                homeX: -1.72, homeY: 0.05,
                angX: 0.18, angY: 0.42, angZ: -0.14
            });
            const bluePill = buildCapsule('blue', {
                shell: CFG.colors.blueShell,
                emissive: CFG.colors.blueEmissive,
                innerWall: 0x030832,
                grooveColor: 0x0a1a8c,
                shadowRgb: '26,58,200',
                homeX: 1.72, homeY: 0.05,
                angX: -0.22, angY: -0.38, angZ: 0.16
            });

            const pills = [redPill, bluePill];
            const pillById = { red: redPill, blue: bluePill };

            /* --- адаптивная раскладка --- */
            function layoutPills() {
                const narrow = W < 680;
                if (narrow) {
                    camera.position.z = 9.6;
                    redPill.homeX = 0; redPill.homeY = 0.92;
                    bluePill.homeX = 0; bluePill.homeY = -0.86;
                } else {
                    camera.position.z = 7.6;
                    redPill.homeX = -1.72; redPill.homeY = 0.05;
                    bluePill.homeX = 1.72; bluePill.homeY = 0.05;
                }
                camera.aspect = W / H;
                camera.updateProjectionMatrix();
                pills.forEach(function (p) {
                    p.base.set(p.homeX, p.homeY, 0);
                });
            }

            /* --- проекции --- */
            function worldHeightAt(z) {
                return 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) * 0.5) * Math.max(0.4, camera.position.z - z);
            }
            function screenToWorld(sx, sy, z) {
                const vh = worldHeightAt(z);
                const vw = vh * camera.aspect;
                return new THREE.Vector3((sx / W - 0.5) * vw, (0.5 - sy / H) * vh, z);
            }
            function worldToScreen(v) {
                const p = v.clone().project(camera);
                return { x: (p.x * 0.5 + 0.5) * W, y: (0.5 - p.y * 0.5) * H };
            }
            function pxToWorld(px) {
                return (px / H) * worldHeightAt(0);
            }
            /* ======================================================================
               11. БУХГАЛТЕРИЯ ФОНОВЫХ ГЛИФОВ 3D → 2D
               ====================================================================== */
            const _m4 = new THREE.Matrix4();
            const _q = new THREE.Quaternion();
            const _e = new THREE.Euler();
            const _v3 = new THREE.Vector3();
            const _v3b = new THREE.Vector3();
            const _color = new THREE.Color();

            function glyphPoolReset(pool) {
                pool.items.forEach(function (it) {
                    it.alive = false;
                    it.state = 'idle';
                    it.scale = 0;
                    it.alpha = 1;
                });
                pool.meshes.forEach(function (m) { m.count = m.instanceMatrix.count; m.visible = false; });
            }

            function glyphSpawn(pool, pos, vel, size, colorHex) {
                for (let i = 0; i < pool.items.length; i++) {
                    const it = pool.items[i];
                    if (it.alive) continue;
                    it.alive = true;
                    it.state = 'fall';
                    it.pos.copy(pos);
                    it.prev.copy(pos);
                    it.vel.copy(vel);
                    it.rot = rand(-0.5, 0.5);
                    it.vr = rand(-5, 5);
                    it.size = size;
                    it.scale = size;
                    it.alpha = 1;
                    it.t = 0;
                    it.color.copy(colorHex);
                    it.captureAt = Math.random() < 0.38 ? rand(0.16, 0.46) : Infinity;
                    it.landed = false;
                    // лицевая карточка должна «ожить» — включаем её меш
                    it.mesh.visible = true;
                    it.mesh.count = it.index + 1 > it.mesh.count ? it.index + 1 : it.mesh.count;
                    writeGlyph(it);
                    it.mesh.visible = true;
                    return it;
                }
                return null;
            }

            function writeGlyph(it) {
                const s = Math.max(0.0001, it.scale);
                _e.set(0, 0, it.rot);
                _q.setFromEuler(_e);
                _m4.compose(it.pos, _q, _v3.set(s, s, s));
                it.mesh.setMatrixAt(it.index, _m4);
                it.mesh.instanceColor.setXYZ(it.index, it.color.r, it.color.g, it.color.b);
                it.mesh.instanceMatrix.needsUpdate = true;
                it.mesh.instanceColor.needsUpdate = true;
            }

            function glyphKill(it) {
                it.alive = false;
                it.state = 'idle';
                it.scale = 0;
                writeGlyph(it);
            }

            function updateGlyphPool(pool, dt, floorY, onLand, onCapture) {
                let live = 0;
                for (let i = 0; i < pool.items.length; i++) {
                    const it = pool.items[i];
                    if (!it.alive) continue;
                    live++;
                    it.t += dt;
                    if (it.state === 'fall') {
                        it.vel.y -= 9.4 * dt;
                        it.vel.multiplyScalar(Math.exp(-0.6 * dt));
                        it.prev.copy(it.pos);
                        it.pos.addScaledVector(it.vel, dt);
                        it.rot += it.vr * dt;
                        it.scale = it.size;
                        if (it.t > it.captureAt) {
                            // фон «забирает» глиф: он уходит в матричное поле
                            onCapture(it);
                            glyphKill(it);
                            continue;
                        }
                        if (it.pos.y <= floorY) {
                            it.pos.y = floorY;
                            it.state = 'land';
                            it.t = 0;
                            it.scale = it.size * 0.8;
                            onLand(it);
                        }
                    } else if (it.state === 'land') {
                        const p = clamp(it.t / 0.55, 0, 1);
                        it.pos.y = floorY + p * 0.16;
                        it.scale = it.size * 0.8 * (1 - p * 0.7);
                        it.rot += dt * 1.6;
                        if (p >= 1) { glyphKill(it); continue; }
                    } else if (it.state === 'suck') {
                        // засасывание в пасть: тянем к цели с ускорением
                        const p = clamp(it.t / it.dur, 0, 1);
                        const e = easeInCubic(p);
                        it.pos.lerpVectors(it.from, it.to, e);
                        it.pos.x += Math.sin(p * 9) * 0.06 * (1 - p);
                        it.scale = it.size * (1 - p * 0.8);
                        it.rot += dt * 7;
                        if (p >= 1) { glyphKill(it); continue; }
                    }
                    writeGlyph(it);
                }
                if (live === 0) {
                    pool.meshes.forEach(function (m) { m.visible = false; });
                }
            }

            /* ======================================================================
               12. ФОНОВЫЕ СЛОИ: ПЕРЕКЛЮЧЕНИЕ ТЕМ
               ====================================================================== */
            let worldTheme = 'default';
            let pageTimer = null;

            function setBodyTheme(name) {
                dom.body.classList.remove('theme-red', 'theme-blue');
                if (name === 'red') dom.body.classList.add('theme-red');
                if (name === 'blue') dom.body.classList.add('theme-blue');
            }

            function showPage(which) {
                const one = which === 'red';
                const dope = which === 'blue';
                if (dope && typeof FEED !== 'undefined') FEED.onPageOpen('blue');
                if (!dope && typeof FEED !== 'undefined') FEED.onPageClose();
                dom.pageOne.classList.toggle('is-visible', one);
                dom.pageOne.setAttribute('aria-hidden', String(!one));
                dom.pageDope.classList.toggle('is-visible', dope);
                dom.pageDope.setAttribute('aria-hidden', String(!dope));
                if (dope) dom.pageDope.scrollTop = 0;
                if (!dope) dom.floatBtn.classList.remove('is-shown');
            }

            function hidePages() { showPage('none'); }

            function setCaption(text, hint) {
                dom.captionText.textContent = text;
                if (hint) {
                    dom.captionHint.hidden = false;
                    dom.captionHint.textContent = hint;
                } else {
                    dom.captionHint.hidden = true;
                }
            }

            function measureOrb() {
                if (!dom.orb) return null;
                const page = dom.pageDope;
                const wasVisible = page.classList.contains('is-visible');
                page.classList.add('is-measuring');
                const r = dom.orb.getBoundingClientRect();
                page.classList.remove('is-measuring');
                if (!wasVisible) page.classList.remove('is-measuring');
                if (!r.width) return null;
                return { x: r.left + r.width / 2, y: r.top + r.height / 2, r: r.width / 2 };
            }

            /* [V7] Цели кота в ленте: первая публикация и аватар профиля.
               Обе точки измеряются без «мигания» страницы. */
            function feedTargets() {
                const out = { post: null, orb: null };
                const page = dom.pageDope;
                if (!page) return out;
                const wasVisible = page.classList.contains('is-visible');
                page.classList.add('is-measuring');
                const card = page.querySelector('.post-card[data-post="0"]');
                if (card) {
                    const cr = card.getBoundingClientRect();
                    // садимся на медиа-блок публикации (обложку/арт), а не на текст
                    const media = card.querySelector('.post-media');
                    const mr = media ? media.getBoundingClientRect() : cr;
                    if (cr.width) {
                        out.post = {
                            x: mr.left + mr.width * 0.3,
                            y: mr.top + mr.height * 0.52,
                            w: cr.width
                        };
                    }
                }
                const orb = page.querySelector('.profile-orb');
                if (orb) {
                    const or_ = orb.getBoundingClientRect();
                    if (or_.width) {
                        out.orb = { x: or_.left + or_.width / 2, y: or_.top + or_.height / 2, r: or_.width / 2 };
                    }
                }
                page.classList.remove('is-measuring');
                if (wasVisible) { /* ничего: класс уже снят */ }
                return out;
            }

            /* ======================================================================
               13. СЦЕНА И ПЕРЕХОДЫ
               ====================================================================== */
            const sceneState = {
                name: 'ready',       // ready | opening | open | returning
                active: null,        // 'red' | 'blue'
                locked: false,
                time: 0
            };

            let hovered = null;

            function otherOf(pill) { return pill.id === 'red' ? bluePill : redPill; }

            function pillHome(pill, dt) {
                dampV3(pill.pos, pill.base.x, pill.base.y, pill.base.z, 5.2, dt);
            }

            function setPillFocus(pill, focus) {
                pill.focus = focus;
            }

            function resetPillVisual(pill) {
                setPillTransparent(pill, false);
                pill.shellAlpha = 1;
                pill.materials.forEach(function (m) { m.opacity = 1; });
                pill.capOffset.x = -SEG.nestOverlap / 2;
                pill.capOffset.spin = 0;
                pill.capOffset.y = 0;
                pill.capOffset.z = 0;
                pill.cap.rotation.set(0, 0, 0);
                pill.cap.position.set(-SEG.nestOverlap / 2, 0, 0);
                pill.body.rotation.set(0, 0, 0);
                pill.body.position.set(SEG.nestOverlap / 2, 0, 0);
                pill.group.scale.setScalar(1);
                pill.scale = 1;
                pill.wobble = 0;
                glyphPoolReset(pill.glyphPool);
                pill.sparkPool.mesh.visible = false;
                pill.sparkPool.items.forEach(function (s) { s.alive = false; });
                pill.group.visible = true;
            }

            /* --- Открытие капсулы --------------------------------------------- */
            function openPill(pill) {
                if (sceneState.locked) return;
                if (sceneState.name === 'open' && sceneState.active === pill.id) return;
                if (sceneState.name !== 'ready') return;
                sceneState.name = 'opening';
                sceneState.active = pill.id;
                sceneState.locked = true;
                fadeTweens.length = 0;

                resetPillVisual(pill);
                resetPillVisual(otherOf(pill));
                pills.forEach(function (x) { x.pageShown = false; });

                pill.state = 'lift';
                pill.t = 0;
                pill.poured = 0;
                pill.pourAcc = 0;
                pill.shellAlpha = 1;
                pill.capReleased = false;
                pill.pageShown = false;
                pill.landing = 0;

                const other = otherOf(pill);
                other.state = 'parked';
                other.t = 0;
                other.shellAlpha = 1;

                rain.target = pill.id === 'red' ? 1 : 0;
                rain.intensity = Math.max(rain.intensity, 0.05);
                glyphs.clear();
                sparks.list.length = 0;
                catRig.state = 'idle';
                catRig.root.visible = false;
                catLaunched = false;
                if (typeof HERO !== 'undefined') HERO.reset();

                dom.caption.classList.add('is-hidden');
                setPillsHidden(true);
            }

            function setPillsHidden(hidden) {
                dom.webgl.classList.toggle('pills-hidden', false);
                sceneState.pillsHidden = hidden;
            }

            /* --- Возврат: сбор содержимого обратно ---------------------------- */
            function collectPill(pill) {
                // Возврат допустим и во время вскрытия (пользователь передумал),
                // и из открытой страницы, и во время самого сбора — просто перезапускаем этап.
                if (sceneState.name === 'ready') return;
                const p = pill || pillById[sceneState.active];
                if (!p) return;
                sceneState.name = 'returning';
                sceneState.locked = true;
                fadeTweens.length = 0;

                p.state = 'collect';
                p.t = 0;
                p.shellAlpha = 1;
                p.capReleased = false;
                p.suckSpawned = 0;
                p.suckTimer = 0;
                p.suck3D = 0;
                p.capReturned = false;
                p.landing = 0;
                p.isTransparent = true;      // глушим прозрачность сразу, а не через кадр
                setPillTransparent(p, false);
                p.shellAlpha = 1;

                // Вторая капсула возвращается на своё место (появляется из прозрачности)
                const other = otherOf(p);
                resetPillVisual(other);
                other.state = 'idle';
                other.t = 0;
                other.pos.set(other.base.x, other.base.y, other.base.z);
                other.group.position.copy(other.pos);

                // Страница уходит, но тема остаётся: видно, как глифы/кот утекают в капсулу
                dom.pageDope.classList.remove('is-preview');
                dom.pageOne.classList.remove('is-preview');
                hidePages();
                pills.forEach(function (x) { x.pageShown = false; });
                p.restoreThemeOnSeat = true;

                // 2D-глифы всасываются из поля в пасть
                p.mouthScreen = worldToScreen(pillWorldMouth(p, _v3));
                const total = MOBILE ? 26 : 42;
                p.suckPlan = [];
                for (let i = 0; i < total; i++) {
                    p.suckPlan.push({
                        x: rand(W * 0.06, W * 0.94),
                        y: rand(H * 0.18, H * 0.94),
                        delay: rand(0, 0.55) + i * 0.006
                    });
                }
                // Кот возвращается в капсулу (синяя ветка)
                if (p.id === 'blue') {
                    // [V9] Кот убегает из аватара в пасть капсулы — тем же ригом,
                    // с работающими лапами, а не «уезжающей картинкой».
                    // страница уже скрыта — измерять орб поздно, поэтому берём
                    // последнюю известную точку героя (он стоит в аватаре)
                    const orb = measureOrb() || feedTargets().orb || {
                        x: HERO.state.x, y: HERO.state.y, r: 46
                    };
                    const mouth = worldToScreen(pillWorldMouth(p, new THREE.Vector3()));
                    // страница уже закрыта, поэтому «дома ли кот» знает сам риг
                    const catHome = HERO.state.home;
                    if (orb && (catHome || HERO.state.state !== 'idle')) {
                        HERO.flee(
                            { x: orb.x, y: orb.y + (orb.r || 40) * 0.4 },
                            { x: mouth.x, y: mouth.y + 14 },
                            function () {
                                catRig.state = 'gone';
                                catRig.root.visible = false;
                            }
                        );
                    } else {
                        catRig.state = 'gone';
                    }
                    if (typeof FEED !== 'undefined' && FEED.onCatLeaving) FEED.onCatLeaving();
                }
                setCaption('Собираем…');
                dom.caption.classList.remove('is-hidden');
            }

            /* --- Сброс в исходное состояние ---------------------------------- */
            function resetAll() {
                sceneState.name = 'ready';
                sceneState.active = null;
                sceneState.locked = false;
                pills.forEach(function (p) {
                    p.state = 'idle';
                    p.t = 0;
                    resetPillVisual(p);
                });
                rain.target = 0;
                glyphs.clear();
                sparks.list.length = 0;
                catRig.state = 'idle';
                catRig.root.visible = false;
                dom.pageDope.classList.remove('is-preview');
                dom.pageOne.classList.remove('is-preview');
                hidePages();
                setBodyTheme('default');
                worldTheme = 'default';
                if (pageTimer) { clearTimeout(pageTimer); pageTimer = null; }
                setCaption('Выбирай!');
                dom.caption.classList.remove('is-hidden');
                setPillsHidden(false);
                dom.webgl.classList.remove('pills-hidden');
            }

            /* ======================================================================
               14. ПОЗЫ И ДВИЖЕНИЕ КАПСУЛ
               ====================================================================== */
            function pillWorldMouth(pill, out) {
                // Срез корпуса в локальных координатах: x = +halfShift
                out.set(SEG.nestOverlap / 2, 0, 0);
                pill.group.updateMatrixWorld();
                return out.applyMatrix4(pill.group.matrixWorld);
            }

            const POSE_IDLE = { x: 0.16, y: 0.34, z: -0.12 };
            const POSE_POUR = { x: 0.30, y: 0.42, z: -1.24 };
            const POSE_COLLECT = { x: 0.34, y: 0.22, z: -1.38 };

            function updatePill(pill, dt, now) {
                pill.t += dt;
                const isFocus = sceneState.active === pill.id;
                const isOther = sceneState.active && sceneState.active !== pill.id;

                let targetX = pill.base.x;
                let targetY = pill.base.y;
                let targetZ = 0;
                let targetScale = 1;
                let alphaTarget = 1;
                let pose = POSE_IDLE;

                if (pill.state === 'idle') {
                    const drift = Math.sin(now * 0.9 + (pill.id === 'red' ? 0 : 1.9)) * 0.06;
                    targetY += drift;
                    targetX += Math.sin(now * 0.7 + (pill.id === 'red' ? 1.2 : 0.4)) * 0.045;
                    targetScale = hovered === pill ? 1.05 : 1;
                    // Медленное «перекатывание в руке»
                    pill.angles.x = damp(pill.angles.x, POSE_IDLE.x + Math.sin(now * 0.7) * 0.1, 3, dt);
                    pill.angles.y = damp(pill.angles.y, POSE_IDLE.y + Math.sin(now * 0.53) * 0.18, 3, dt);
                    pill.angles.z = damp(pill.angles.z, POSE_IDLE.z + Math.cos(now * 0.61) * 0.1, 3, dt);
                    pill.spin = (pill.spin || 0) + dt * 0.28;
                } else if (pill.state === 'parked') {
                    alphaTarget = 0;
                    targetScale = 0.86;
                    targetY -= 0.5;
                } else if (pill.state === 'lift') {
                    const p = clamp(pill.t / CFG.timing.liftToCenter, 0, 1);
                    const e = easeOutCubic(p);
                    targetX = lerp(pill.pos.x, 0, e);
                    targetY = lerp(pill.pos.y, 0.62, e);
                    targetScale = lerp(1, 1.28, e);
                    pose = POSE_POUR;
                    pill.angles.x = damp(pill.angles.x, pose.x, 4, dt);
                    pill.angles.y = damp(pill.angles.y, pose.y, 4, dt);
                    pill.angles.z = damp(pill.angles.z, pose.z, 4.4, dt);
                    if (p >= 1) {
                        pill.state = 'pour';
                        pill.t = 0;
                    }
                } else if (pill.state === 'pour') {
                    targetX = 0;
                    targetY = 0.62 + Math.sin(now * 1.6) * 0.02;
                    targetScale = 1.28;
                    pose = POSE_POUR;
                    // Лёгкая тряска «капсулу вытряхивают» — только она двигает оболочку
                    const shake = pill.pourShake || 0;
                    pill.angles.x = damp(pill.angles.x, pose.x + Math.sin(now * 23) * 0.03 * shake, 8, dt);
                    pill.angles.y = damp(pill.angles.y, pose.y + Math.sin(now * 17) * 0.05 * shake, 8, dt);
                    pill.angles.z = damp(pill.angles.z, pose.z + Math.sin(now * 11) * 0.02 * shake, 8, dt);
                    alphaTarget = 1;
                } else if (pill.state === 'hidden') {
                    alphaTarget = 0;
                    targetX = pill.pos.x;
                    targetY = pill.pos.y;
                    targetScale = pill.group.scale.x || 1;
                } else if (pill.state === 'dissolve') {
                    targetX = pill.pos.x;
                    targetY = pill.pos.y;
                    // [V8] Не растворяемся «на месте»: половинки уменьшаются и уходят
                    // вглубь, чтобы не висели полупрозрачными призраками над страницей.
                    const dp = clamp(pill.t / Math.max(0.2, CFG.timing.halvesFade), 0, 1);
                    targetScale = lerp(1, 0.34, easeInCubic(dp));
                    targetY = pill.pos.y + 0.42 * dp;
                    alphaTarget = 0;
                } else if (pill.state === 'collect') {
                    const p = clamp(pill.t / (CFG.timing.collectDelay + CFG.timing.collectDuration * 0.5), 0, 1);
                    const e = easeOutCubic(p);
                    targetX = lerp(pill.pos.x, 0, e);
                    targetY = lerp(pill.pos.y, 0.12, e);
                    targetScale = lerp(1, 1.16, e);
                    pose = POSE_COLLECT;
                    pill.angles.x = damp(pill.angles.x, pose.x, 4.4, dt);
                    pill.angles.y = damp(pill.angles.y, pose.y, 4.4, dt);
                    pill.angles.z = damp(pill.angles.z, pose.z, 4.4, dt);
                    alphaTarget = 1;
                    // пустая крышка ждёт в стороне и покачивается
                    if (!pill.capReturned) {
                        const w = pill.t;
                        // крышка ждёт «в руке» прямо под срезом, слегка покачиваясь
                        pill.cap.position.set(
                            0.66 + Math.sin(w * 1.7) * 0.025,
                            0.2,
                            0.1
                        );
                        pill.cap.rotation.set(
                            0.5 + Math.sin(w * 1.3) * 0.09,
                            0.34,
                            0.16
                        );
                    }
                } else if (pill.state === 'capback') {
                    targetX = 0;
                    targetY = 0.12;
                    targetScale = 1.16;
                    alphaTarget = 1;
                    pill.angles.x = damp(pill.angles.x, POSE_POUR.x, 4, dt);
                    pill.angles.y = damp(pill.angles.y, POSE_POUR.y, 4, dt);
                    pill.angles.z = damp(pill.angles.z, POSE_POUR.z, 4, dt);
                } else if (pill.state === 'returnhome') {
                    const p = clamp(pill.t / 0.85, 0, 1);
                    const e = easeInOutCubic(p);
                    targetX = lerp(0, pill.base.x, e);
                    targetY = lerp(0.12, pill.base.y, e);
                    targetScale = lerp(1.16, 1, e);
                    pill.angles.x = damp(pill.angles.x, POSE_IDLE.x, 3, dt);
                    pill.angles.y = damp(pill.angles.y, POSE_IDLE.y, 3, dt);
                    pill.angles.z = damp(pill.angles.z, POSE_IDLE.z, 3, dt);
                    if (p >= 1) {
                        pill.state = 'idle';
                        pill.t = 0;
                        sceneState.name = 'ready';
                        sceneState.active = null;
                        sceneState.locked = false;
                        setCaption('Выбирай!');
                        dom.caption.classList.remove('is-hidden');
                    }
                }

                // позиция
                const posLambda = pill.state === 'idle' ? 3.4 : 6.2;
                dampV3(pill.pos, targetX, targetY, targetZ, posLambda, dt);
                pill.group.position.copy(pill.pos);

                // масштаб (с «чпок» при посадке крышки)
                const click = pill.landing > 0 ? 1 - Math.sin(pill.landing * Math.PI) * 0.045 : 1;
                pill.scale = damp(pill.scale, targetScale * click, 6.5, dt);
                pill.group.scale.setScalar(pill.scale);

                // поворот: собственное вращение вокруг оси капсулы + поза
                pill.group.rotation.set(pill.angles.x, pill.angles.y, pill.angles.z);
                if (pill.spin) {
                    pillyRotateAxial(pill);
                }

                // альфа
                // [V8] растворение делаем быстрым и «обрезаем» хвост, чтобы над
                // страницей не оставалось полупрозрачных призраков капсулы
                pill.shellAlpha = damp(pill.shellAlpha, alphaTarget, pill.state === 'dissolve' ? 10.5 : 6, dt);
                if (pill.state === 'dissolve' && pill.shellAlpha < 0.12) pill.shellAlpha = 0;
                applyShellAlpha(pill);

                // тень
                pill.shadow.position.x = pill.pos.x;
                pill.shadow.position.z = pill.pos.z - 0.1;
                const sh = 0.5 * pill.shellAlpha * (worldTheme === 'red' ? 0 : 1);
                pill.shadow.material.opacity = damp(pill.shadow.material.opacity, sh, 5, dt);
                pill.shadow.scale.setScalar(pill.scale * 0.98);

                pill.group.updateMatrixWorld(true);
            }

            /** Дополнительный поворот всей капсулы вокруг её собственной оси X. */
            function pillyRotateAxial(pill) {
                // вращаем только содержимое-крышку/корпус (не ломая позу группы)
                // проще: наклоняем спеку и оставляем позу — визуально «перекат» даёт спеку
                if (pill.spec) {
                    pill.spec.position.x = Math.sin(pill.spin) * 0.34 - 0.1;
                    pill.spec.position.y = SEG.radius * 0.6;
                    pill.spec.position.z = Math.cos(pill.spin) * 0.3 + 0.34;
                }
            }

            function setPillTransparent(pill, on) {
                // Меняем режим у всех материалов оболочки, включая клонированную крышку,
                // иначе капсула «застревает» непрозрачной после растворения
                pill.group.traverse(function (obj) {
                    if (!obj.isMesh || !obj.material) return;
                    const m = obj.material;
                    if (!m.isMeshPhysicalMaterial && !m.isMeshStandardMaterial) return;
                    if (m.transparent === on) return;
                    m.transparent = on;
                    m.depthWrite = !on;
                    m.needsUpdate = true;
                });
                pill.isTransparent = on;
            }

            function applyShellAlpha(pill) {
                const a = clamp(pill.shellAlpha, 0, 1);
                if (a < 0.999) setPillTransparent(pill, true);
                else if (pill.isTransparent) setPillTransparent(pill, false);
                pill.materials.forEach(function (m) {
                    m.opacity = a;
                });
                pill.group.traverse(function (obj) {
                    if (obj.isMesh && obj.material && obj.material.isMeshPhysicalMaterial) obj.material.opacity = a;
                });
                pill.spec.material.opacity = 0.18 * a;
                pill.group.visible = a > 0.01;
            }

            /* ======================================================================
               15. ВЫСЫПАНИЕ [V3] и ВЫПРЫГИВАНИЕ КОТА [V4]
               ====================================================================== */
            const CAT_BASE_PX = 156;
            let catLaunched = false;
            let catBaseScale = 0.5;

            function computeCatBaseScale() {
                catBaseScale = pxToWorld(CAT_BASE_PX) * 1.0;
            }

            function pourTickRed(pill, dt) {
                const T = CFG.timing;
                const capFreeAt = T.unscrew;
                const pourStart = T.unscrew + T.pourDelay;

                // 1) откручивание крышки: спираль со сдвигом по срезу
                const un = clamp(pill.t / T.unscrew, 0, 1);
                if (un < 1) {
                    const e = easeInOutCubic(un);
                    pill.capOffset.spin = -e * Math.PI * 2.6;
                    pill.capOffset.x = lerp(-SEG.nestOverlap / 2, 0.42, Math.pow(e, 2.2));
                    pill.capOffset.y = Math.sin(e * Math.PI) * 0.12;
                    pill.capOffset.z = Math.sin(e * Math.PI) * -0.08;
                    pill.cap.position.set(pill.capOffset.x, pill.capOffset.y, pill.capOffset.z);
                    pill.cap.rotation.set(pill.capOffset.spin, 0, e * 0.06);
                } else {
                    // крышка отходит на полкорпуса, замирает и тает вместе с оболочкой
                    const restX = 0.86;
                    pill.cap.position.x = damp(pill.cap.position.x, restX, 5, dt);
                    pill.cap.position.y = damp(pill.cap.position.y, 0.16, 5, dt);
                    pill.cap.position.z = damp(pill.cap.position.z, -0.06, 5, dt);
                    pill.cap.rotation.x += dt * 1.5;
                    pill.cap.rotation.y += dt * 0.7;
                }

                // 2) высыпание глифов
                if (pill.t >= pourStart) {
                    const pourT = pill.t - pourStart;
                    const prog = clamp(pourT / T.pourDuration, 0, 1);
                    // «колокол» потока: разгон → плотный поток → затухание
                    const rate = Math.sin(Math.pow(prog, 0.78) * Math.PI) * 0.92 + 0.08;
                    pill.pourAcc += rate * dt * CFG.counts.glyphs * 1.45;
                    pill.pourShake = clamp(rate, 0, 1);

                    const mouth = pillWorldMouth(pill, _v3);
                    const axis = _v3b.set(1, 0, 0).applyQuaternion(pill.group.quaternion).normalize();
                    let guard = 0;
                    while (pill.pourAcc >= 1 && pill.poured < CFG.counts.glyphs && guard++ < 40) {
                        pill.pourAcc -= 1;
                        pill.poured++;
                        const spread = 0.42;
                        const dir = axis.clone()
                            .add(new THREE.Vector3(rand(-spread, spread), rand(-0.25, 0.2), rand(-spread, spread)))
                            .normalize();
                        const vel = dir.multiplyScalar(rand(1.0, 3.0));
                        glyphSpawn(
                            pill.glyphPool,
                            mouth.clone().add(new THREE.Vector3(rand(-0.06, 0.06), rand(-0.06, 0.06), rand(-0.08, 0.08))),
                            vel,
                            rand(0.16, 0.26),
                            new THREE.Color(pick(CFG.colors.glyph))
                        );
                    }
                }

                // 3) дождь включается в момент первого падения (см. onLand), но не позже 1.15 c
                if (pill.t > pourStart + 1.15 && rain.target < 0.35) rain.target = 0.5;

                // 4) страница One проявляется, когда последние глифы уже долетают до пола
                if (!pill.pageShown && pill.t > pourStart + T.pourDuration + 0.3) {
                    pill.pageShown = true;
                    revealPage('red');
                }

                // 5) оболочка держится и растворяется, когда глифы уже на полу
                if (pill.t > T.shellHold) {
                    pill.state = 'dissolve';
                    pill.t = 0;
                    pill.pourShake = 0;
                }
            }

            function pourTickBlue(pill, dt) {
                const T = CFG.timing;
                const capFreeAt = T.unscrew;

                const un = clamp(pill.t / T.unscrew, 0, 1);
                if (un < 1) {
                    const e = easeInOutCubic(un);
                    pill.capOffset.spin = -e * Math.PI * 2.6;
                    pill.capOffset.x = lerp(-SEG.nestOverlap / 2, 0.42, Math.pow(e, 2.2));
                    pill.capOffset.y = Math.sin(e * Math.PI) * 0.12;
                    pill.cap.position.set(pill.capOffset.x, pill.capOffset.y, Math.sin(e * Math.PI) * -0.08);
                    pill.cap.rotation.set(pill.capOffset.spin, 0, e * 0.06);
                } else {
                    pill.cap.position.x = damp(pill.cap.position.x, 0.86, 5, dt);
                    pill.cap.position.y = damp(pill.cap.position.y, 0.16, 5, dt);
                    pill.cap.position.z = damp(pill.cap.position.z, -0.06, 5, dt);
                    pill.cap.rotation.x += dt * 1.5;
                    pill.cap.rotation.y += dt * 0.7;
                }

                // искры содержимого + короткая «затравка» для светлой темы
                if (un >= 1 && (pill.sparkAcc || 0) < CFG.counts.sparks) {
                    pill.sparkAcc = (pill.sparkAcc || 0) + dt * CFG.counts.sparks * 1.1;
                    const mouth = pillWorldMouth(pill, _v3);
                    const axis = _v3b.set(1, 0, 0).applyQuaternion(pill.group.quaternion).normalize();
                    let guard = 0;
                    while (pill.sparkAcc >= 1 && guard++ < 6) {
                        pill.sparkAcc -= 1;
                        const dir = axis.clone().add(new THREE.Vector3(rand(-0.5, 0.5), rand(-0.2, 0.4), rand(-0.5, 0.5))).normalize();
                        const sp = pill.sparkPool.items.find(function (s) { return !s.alive; });
                        if (sp) {
                            sp.alive = true;
                            sp.pos.copy(mouth);
                            sp.vel.copy(dir.multiplyScalar(rand(0.9, 2.4)));
                            sp.size = rand(0.05, 0.1);
                            sp.rot = rand(0, 6.28);
                            sp.vr = rand(-8, 8);
                            sp.t = 0;
                            sp.dur = rand(1.0, 1.7);
                        }
                    }
                }

                // лента Dope уже видна (размыто) — коту есть куда бежать
                if (un >= 1 && !pill.previewShown) {
                    pill.previewShown = true;
                    worldTheme = 'blue';
                    setBodyTheme('blue');
                    dom.pageDope.classList.add('is-preview');
                    showPage('blue');
                }

                // кот выпрыгивает сразу, как только крышка сошла
                if (un >= 1 && catRig.state === 'idle' && pill.t > capFreeAt + T.catPopDelay) {
                    launchCat(pill);
                }

                // оболочка уходит, пока кот бежит
                if (pill.state === 'pour' && pill.t > capFreeAt + 1.05) {
                    pill.state = 'dissolve';
                    pill.t = 0;
                }
            }

            function revealPage(which) {
                worldTheme = which;
                setBodyTheme(which);
                dom.pageDope.classList.remove('is-preview');
                dom.pageOne.classList.remove('is-preview');
                showPage(which);
                if (which === 'red') rain.target = 1;
                // сцена переходит в «страница открыта»: капсулы можно вернуть кликом/кнопкой
                sceneState.name = 'open';
                sceneState.locked = false;
                dom.caption.classList.add('is-hidden');
            }

            /* ======================================================================
               16. КОТ: ПРЫЖОК ИЗ КАПСУЛЫ → БЕГ → АВАТАР  [V4]
               ====================================================================== */
            function launchCat(pill) {
                // [V9] Кот выпрыгивает не 3D-плоскостью, а живым векторным ригом
                // в DOM: у него работают лапы, хвост и корпус на всём пути.
                if (!catRig.ready) catRig.ready = true;
                const mouthScreen = worldToScreen(pillWorldMouth(pill, new THREE.Vector3()));
                const target = feedTargets();
                catLaunched = true;
                catRig.state = 'gone';          // 3D-кот больше не рисуется
                catRig.root.visible = false;
                const to = target.post
                    ? { x: target.post.x, y: target.post.y }
                    : (target.orb ? { x: target.orb.x, y: target.orb.y } : { x: W * 0.5, y: H * 0.7 });
                HERO.launch({
                    from: { x: mouthScreen.x, y: mouthScreen.y + 18 },
                    to: to,
                    postW: target.post ? Math.min(target.post.w || 320, 420) : 320,
                    orb: target.orb
                });
                dom.catPuff.classList.remove('is-on');
                void dom.catPuff.offsetWidth;
                if (typeof FEED !== 'undefined' && FEED.onCatLeap) FEED.onCatLeap();
            }

            function updateCat(dt, now) {
                // [V9] Весь путь кота (полёт, посадка, карабканье) ведёт HERO.
                // 3D-объект кота остаётся только как «погашенный» держатель
                // состояния для обратной совместимости вызовов FEED.
                catRig.root.visible = false;
                HERO.update(dt);

                const trail = document.getElementById('cat-light-trail');
                if (!trail) return;
                const st = HERO.state.state;
                if (st === 'leap' || st === 'climb' || st === 'land' || st === 'flee') {
                    trail.style.background =
                        'radial-gradient(circle at ' + (HERO.state.x / W * 100).toFixed(1) + '% ' +
                        (HERO.state.y / H * 100).toFixed(1) + '%, rgba(150, 168, 255, 0.26), transparent 34%)';
                }
            }

            function onCatLand() {
                // [V7] кот садится на первую публикацию — подсвечиваем карточку
                if (typeof FEED !== 'undefined' && FEED.onCatLandedOnPost) FEED.onCatLandedOnPost();
                flashCatPuff();
            }

            function flashCatPuff() {
                const el = dom.catPuff;
                const orb = measureOrb() || feedTargets().orb;
                const p = orb ? { x: orb.x, y: orb.y } : worldToScreen(catRig.pos);
                el.style.left = p.x + 'px';
                el.style.top = p.y + 'px';
                el.style.width = el.style.height = (orb ? orb.r * 2 : 80) + 'px';
                el.style.margin = '-' + (orb ? orb.r : 40) + 'px 0 0 ' + (orb ? -orb.r : -40) + 'px';
                el.classList.remove('is-on');
                void el.offsetWidth;
                el.classList.add('is-on');
            }

            /* ======================================================================
               17. ОБНОВЛЕНИЕ ИСКР
               ====================================================================== */
            function updateSparks(pill, dt) {
                const pool = pill.sparkPool;
                let any = false;
                for (let i = 0; i < pool.items.length; i++) {
                    const s = pool.items[i];
                    if (!s.alive) { _m4.makeScale(0, 0, 0); pool.mesh.setMatrixAt(i, _m4); continue; }
                    s.t += dt;
                    if (s.t > s.dur) {
                        s.alive = false;
                        _m4.makeScale(0, 0, 0);
                        pool.mesh.setMatrixAt(i, _m4);
                        continue;
                    }
                    any = true;
                    s.vel.y -= 5.6 * dt;
                    s.pos.addScaledVector(s.vel, dt);
                    s.rot += s.vr * dt;
                    const p = s.t / s.dur;
                    const sz = s.size * (1 - p * 0.6);
                    _e.set(0, 0, s.rot);
                    _q.setFromEuler(_e);
                    _m4.compose(s.pos, _q, _v3.set(sz, sz * 0.6, sz));
                    pool.mesh.setMatrixAt(i, _m4);
                    pool.mesh.instanceColor.setXYZ(i, 0.86, 0.9, 1);
                }
                pool.mesh.instanceMatrix.needsUpdate = true;
                pool.mesh.instanceColor.needsUpdate = true;
                pool.mesh.visible = any;
                if (any) pool.mesh.count = pool.items.length;
            }
            /* ======================================================================
               18. ТИТРЫ, НАВИГАЦИЯ, КЛИКИ
               ====================================================================== */
            const fadeTweens = [];

            function isUiTarget(target) {
                if (!target || !target.closest) return false;
                return !!target.closest('button, a, input, textarea, select, .one-crt-card, .post-card, .bio-topline, .page-stage');
            }

            const raycaster = new THREE.Raycaster();
            const pointerNdc = new THREE.Vector2();

            function pickPill(clientX, clientY) {
                if (sceneState.name !== 'ready') return null;
                const rect = renderer.domElement.getBoundingClientRect();
                if (!rect.width) return null;
                pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
                pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
                raycaster.setFromCamera(pointerNdc, camera);
                const hits = raycaster.intersectObjects([redPill.hit, bluePill.hit], false);
                if (!hits.length) return null;
                return hits[0].object === redPill.hit ? redPill : bluePill;
            }

            window.addEventListener('pointermove', function (e) {
                const p = pickPill(e.clientX, e.clientY);
                hovered = p;
                dom.body.style.cursor = p && !isUiTarget(e.target) ? 'pointer' : '';
            });

            window.addEventListener('click', function (e) {
                // Пока открыта страница, случайный клик по фону НЕ собирает капсулы:
                // вернуть их можно кнопкой «К пилюлям», клавишей Esc или через ?debug=1.
                if (sceneState.name !== 'ready') return;
                if (isUiTarget(e.target)) return;
                const pill = pickPill(e.clientX, e.clientY);
                if (!pill) return;
                openPill(pill);
            });

            window.addEventListener('keydown', function (e) {
                if (e.key === 'Escape') {
                    if (sceneState.name === 'open') collectPill(pillById[sceneState.active]);
                    else if (sceneState.name === 'ready') { /* уже готов */ }
                }
                if (e.key === '1' && sceneState.name === 'ready') openPill(redPill);
                if (e.key === '2' && sceneState.name === 'ready') openPill(bluePill);
            });

            // Кнопки страниц
            document.addEventListener('click', function (e) {
                const actionEl = e.target.closest('[data-action]');
                if (actionEl) {
                    const action = actionEl.getAttribute('data-action');
                    if (action === 'back-to-pills') collectPill(pillById[sceneState.active]);
                    if (action === 'switch-to-red' || action === 'switch-to-blue') {
                        const target = action === 'switch-to-red' ? redPill : bluePill;
                        if (sceneState.name === 'ready' && !target.group.visible) resetAll();
                        // плавный переход: собрать текущую и открыть другую
                        if (sceneState.name === 'open') {
                            const current = sceneState.active;
                            sceneState.name = 'ready';
                            sceneState.locked = false;
                            sceneState.active = null;
                            resetAll();
                            setTimeout(function () { openPill(target); }, 60);
                        } else {
                            resetAll();
                            setTimeout(function () { openPill(target); }, 60);
                        }
                    }
                    return;
                }

                const chBtn = e.target.closest('[data-ch]');
                if (chBtn) {
                    const idx = Number(chBtn.getAttribute('data-ch'));
                    const btnAll = document.querySelectorAll('.one-ch-btn');
                    btnAll.forEach(function (b) { b.classList.toggle('active', b === chBtn); });
                    const idxEl = $('one-ch-index');
                    if (idxEl) idxEl.textContent = 'КАНАЛ 0' + (idx + 1) + ' / 07';
                    return;
                }

                const dbgBtn = e.target.closest('[data-dbg]');
                if (dbgBtn) {
                    e.preventDefault();
                    const what = dbgBtn.getAttribute('data-dbg');
                    if (what === 'open-red') { resetAll(); openPill(redPill); }
                    if (what === 'open-blue') { resetAll(); openPill(bluePill); }
                    if (what === 'collect') collectPill(pillById[sceneState.active]);
                    if (what === 'slow') {
                        const u = new URL(window.location.href);
                        if (u.searchParams.get('slow') === '1') u.searchParams.delete('slow');
                        else u.searchParams.set('slow', '1');
                        window.location.href = u.toString();
                    }
                }
            });

            dom.pageDope.addEventListener('scroll', function () {
                const show = dom.pageDope.classList.contains('is-visible') && dom.pageDope.scrollTop > 120;
                dom.floatBtn.classList.toggle('is-shown', show);
            }, { passive: true });

            // Скачивание автономного концепта одним файлом (все ассеты уже внутри).
            // Работает и по кнопке, и по ссылке с ?download=1 (для «прямой ссылки на скачивание»).
            function downloadConcept() {
                const fallbackName = 'onedopea-capsules-v2.html';
                const fileName = (window.location.pathname || '').split('/').pop() || fallbackName;
                const src = window.location.href.split('#')[0].split('?')[0];
                fetch(src, { cache: 'no-store' })
                    .then(function (r) {
                        if (!r.ok) throw new Error('fetch failed');
                        return r.blob();
                    })
                    .then(function (blob) {
                        const href = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = href;
                        a.download = fileName;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        setTimeout(function () { URL.revokeObjectURL(href); }, 4000);
                    })
                    .catch(function () { window.open(src, '_blank'); });
            }

            const downloadBtn = $('download-concept');
            if (downloadBtn) {
                downloadBtn.addEventListener('click', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    downloadConcept();
                });
            }
            if (PARAMS.get('download') === '1') {
                // даём странице дорисоваться, чтобы браузер не отменил сохранение
                setTimeout(downloadConcept, 350);
            }

            // Фолбэк-кнопки
            $('fb-red').addEventListener('click', function () { resetAll(); openPill(redPill); });
            $('fb-blue').addEventListener('click', function () { resetAll(); openPill(bluePill); });

            /* ======================================================================
               19. ГЛАВНЫЙ ЦИКЛ
               ====================================================================== */
            let stepLocked = false;
            let last = performance.now();
            let clock = 0;
            let fpsAcc = 0;
            let fpsFrames = 0;
            let fpsValue = 0;
            const MOUTH_SCREEN = { x: W / 2, y: H / 2 };

            function frame(now) {
                requestAnimationFrame(frame);
                const raw = Math.min((now - last) / 1000, 0.05);
                last = now;
                if (!stepLocked) stepScene(raw * TIME_SCALE);
                renderer.render(scene, camera);
                tickDebug(raw);
            }

            function stepScene(dt) {
                clock += dt;

                const activeId = sceneState.active;
                const active = activeId ? pillById[activeId] : null;

                // --- капсулы ---
                pills.forEach(function (p) {
                    if (p.state === 'pour') {
                        if (p.id === 'red') pourTickRed(p, dt);
                        else pourTickBlue(p, dt);
                    }
                    updatePill(p, dt, clock);
                });

                // --- глифы 3D ---
                const floorY = -worldHeightAt(0) * 0.5 + 0.42;
                pills.forEach(function (p) {
                    if (p.state !== 'pour' && p.state !== 'collect' && p.state !== 'lift') {
                        if (p.glyphPool.meshes[0].visible && p.state === 'idle') glyphPoolReset(p.glyphPool);
                    }
                    updateGlyphPool(p.glyphPool, dt, floorY,
                        function (it) {
                            // приземление: вспышка + подпитка колонки дождя
                            if (p.id === 'red') {
                                const sc = worldToScreen(it.pos);
                                rain.seed(sc.x, 0.85);
                                glyphs.ripple(sc.x, Math.min(sc.y, H * 0.94), '#7dfba4');
                                rain.target = Math.min(1, rain.target + 0.008);
                            }
                        },
                        function (it) {
                            // «перетекание» в фон: уходящий глиф вспыхивает в колонке
                            if (p.id === 'red') {
                                const sc = worldToScreen(it.pos);
                                rain.seed(sc.x, 0.5);
                            }
                        }
                    );
                    updateSparks(p, dt);
                });

                // --- сбор: конвейер глифов в пасть ---
                if (active && active.state === 'collect') {
                    const T = CFG.timing;
                    active.suckTimer = (active.suckTimer || 0) + dt;
                    const mouthNow = worldToScreen(pillWorldMouth(active, _v3));
                    MOUTH_SCREEN.x = mouthNow.x;
                    MOUTH_SCREEN.y = mouthNow.y;

                    const gate = T.collectDelay;
                    const span = T.collectDuration;
                    const mouthScr = worldToScreen(pillWorldMouth(active, _v3));
                    const mouthPx = pxToWorld(1) > 0
                        ? Math.max(28, Math.min(90, (0.62 * active.scale / worldHeightAt(0)) * H))
                        : 42;
                    glyphs.intake = {
                        x: mouthScr.x,
                        y: mouthScr.y + mouthPx * 0.62,
                        r: mouthPx,
                        t: (glyphs.intake ? glyphs.intake.t : 0) + 0,
                        strength: clamp(1 - Math.abs(prog0(active.suckTimer, gate, span) - 0.5) * 1.4, 0.15, 1)
                    };
                    if (active.suckTimer > gate) {
                        const prog = clamp((active.suckTimer - gate) / span, 0, 1);
                        while (active.suckSpawned < active.suckPlan.length &&
                            active.suckPlan[active.suckSpawned].delay <= prog) {
                            const plan = active.suckPlan[active.suckSpawned++];
                            if (active.id === 'red') {
                                glyphs.spawnSuck(plan.x, plan.y, MOUTH_SCREEN.x, MOUTH_SCREEN.y);
                            } else {
                                sparks.spawn(plan.x, plan.y, 0, -0.25);
                            }
                        }
                        // 3D-глифы: не чаще раза в 75 мс, только в первой половине сбора
                        if (active.id === 'red' && prog < 0.8 &&
                            active.suckTimer > (active.suck3D || 0) + 0.075) {
                            active.suck3D = active.suckTimer;
                            const pool = active.glyphPool;
                            for (let gi = 0; gi < pool.items.length; gi++) {
                                const it = pool.items[gi];
                                if (it.alive) continue;
                                it.alive = true;
                                it.state = 'suck';
                                it.t = 0;
                                it.dur = rand(0.5, 0.78);
                                it.from = new THREE.Vector3(rand(-2.6, 2.6), rand(-1.3, 1.3), rand(-0.1, 0.6));
                                it.to = pillWorldMouth(active, new THREE.Vector3());
                                it.pos.copy(it.from);
                                it.size = rand(0.1, 0.17);
                                it.scale = it.size;
                                it.rot = rand(0, 6.28);
                                it.color.set(pick(CFG.colors.glyph));
                                it.mesh.visible = true;
                                it.mesh.count = Math.max(it.mesh.count, it.index + 1);
                                break;
                            }
                        }
                    }
                    // финал сбора: крышка возвращается
                    if (active.suckTimer > gate + span && active.state === 'collect') {
                        active.state = 'capback';
                        active.t = 0;
                        active.capReturned = true;
                        active.cap.position.set(0.66, 0.2, 0.1);
                        active.cap.rotation.set(0.5, 0.34, 0.16);
                    }
                }

                // --- крышка: подлёт, посадка, «чпок» ---
                pills.forEach(function (p) {
                    if (p.state === 'capback') {
                        const T = CFG.timing;
                        const e = easeInOutCubic(clamp(p.t / T.capReturn, 0, 1));
                        p.cap.position.x = lerp(0.66, -SEG.nestOverlap / 2, e);
                        p.cap.position.y = lerp(0.2, 0, e);
                        p.cap.position.z = lerp(0.1, 0, e);
                        p.cap.rotation.x = lerp(0.5, -Math.PI * 2, e);
                        p.cap.rotation.y = lerp(0.34, 0, e);
                        p.cap.rotation.z = lerp(0.16, 0, e);
                        if (p.t >= T.capReturn) {
                            p.state = 'returnhome';
                            p.t = 0;
                            p.landing = 0.001;
                            setPillTransparent(p, false);
                            p.materials.forEach(function (m) { m.opacity = 1; });
                            p.shellAlpha = 1;
                            if (p.restoreThemeOnSeat) {
                                p.restoreThemeOnSeat = false;
                                setBodyTheme('default');
                                worldTheme = 'default';
                                rain.target = 0;
                                glyphs.intake = null;
                            }
                        }
                    }
                });

                if (pills.some(function (p) { return p.state === 'returnhome'; })) {
                    pills.forEach(function (p) {
                        if (p.state === 'returnhome' && p.landing > 0) {
                            p.landing += dt / 0.42;
                            if (p.landing >= 1) p.landing = 0;
                        }
                    });
                }

                // --- высыпание: переход в растворение ---
                if (active && active.state === 'pour' && active.id === 'red') {
                    // pourTickRed сам переводит в dissolve
                }
                if (active && active.state === 'dissolve') {
                    if (active.id === 'blue' && catRig.state === 'idle' && !active.pageShown) {
                        active.pageShown = true;
                        revealPage('blue');
                    }
                    if (active.shellAlpha < 0.02) {
                        active.state = 'hidden';
                        active.group.visible = false;
                    }
                }

                // --- кот ---
                updateCat(dt, clock);

                // Лента Dope проявляется ровно в тот момент, когда кот уже в аватаре
                if (active && active.id === 'blue' && !active.pageShown && catLaunched &&
                    (active.state === 'pour' || active.state === 'dissolve' || active.state === 'hidden') &&
                    (catRig.state === 'land' || catRig.state === 'idle' || catRig.state === 'gone')) {
                    active.pageShown = true;
                    revealPage('blue');
                }

                if (!active || active.state !== 'collect') glyphs.intake = null;

                // --- дождь и глифы ---
                rain.update(dt);
                glyphs.update(dt, MOUTH_SCREEN);

                // 2D-искры синей ветки
                if (dom.seedCanvas && sparks.list.length) {
                    // рисуем искры на seed-слое (он поверх дождя, но под капсулами)
                    const ctx = glyphs.ctx;
                    updateSparks2D(ctx, dt);
                } else if (sparks.list.length) {
                    updateSparks2D(glyphs.ctx, dt);
                }

                // --- спецэффекты кадра ---

            }

            function tickDebug(rawDt) {
                fpsAcc += rawDt; fpsFrames++;
                if (fpsAcc > 0.5) {
                    fpsValue = Math.round(fpsFrames / fpsAcc);
                    fpsAcc = 0; fpsFrames = 0;
                    if (DEBUG) {
                        dom.dbg.scene.textContent = sceneState.name;
                        dom.dbg.red.textContent = redPill.state + ' · ' + redPill.shellAlpha.toFixed(2);
                        dom.dbg.blue.textContent = bluePill.state + ' · ' + bluePill.shellAlpha.toFixed(2);
                        dom.dbg.cat.textContent = catRig.state +
                            (typeof FEED !== 'undefined' ? ' · коты:' + FEED.state.actors.length : '');
                        dom.dbg.glyphs.textContent = glyphs.list.length + ' / ' + (redPill.poured || 0);
                        dom.dbg.fps.textContent = fpsValue;
                    }
                }
            }

            function prog0(t, gate, span) {
                return clamp((t - gate) / span, 0, 1);
            }

            function updateSparks2D(ctx, dt) {
                sparks.update(dt, ctx);
            }

            /* ======================================================================
               19b. [V7] ЛЕНТА DOPE: карточки + коты
               ====================================================================== */
            // Карточки собираются один раз на старте, чтобы измерять их без мигания.
            let feedCards = [];
            function bootFeed() {
                feedCards = buildFeed();
            }

            /* ======================================================================
               20. СТАРТ
               ====================================================================== */
            function onResize() {
                W = window.innerWidth;
                H = window.innerHeight;
                camera.aspect = W / H;
                camera.updateProjectionMatrix();
                renderer.setSize(W, H);
                layoutPills();
                rain.resize();
                glyphs.resize();
                computeCatBaseScale();
                // пересчитываем масштаб кота для текущей геометрии
                catBaseScale = pxToWorld(CAT_BASE_PX);
            }

            bootFeed();
            rain.resize();
            glyphs.resize();
            layoutPills();
            computeCatBaseScale();
            window.addEventListener('resize', onResize);

            // Стартовое состояние: капсулы в руках, подпись «Выбирай!»
            pills.forEach(function (p) {
                resetPillVisual(p);
                p.pos.set(p.homeX, p.homeY, 0);
                p.group.position.copy(p.pos);
                p.angles.x = p.id === 'red' ? POSE_IDLE.x : -POSE_IDLE.x;
                p.angles.y = p.id === 'red' ? POSE_IDLE.y : -POSE_IDLE.y;
                p.angles.z = p.id === 'red' ? POSE_IDLE.z : -POSE_IDLE.z;
            });
            setCaption('Выбирай!', null);
            computeCatBaseScale();
            requestAnimationFrame(frame);

            // Небольшая «проверка» для отладки из консоли
            window.__capsules = {
                CFG: CFG,
                camera: camera,
                renderer: renderer,
                worldToScreen: worldToScreen,
                pills: pills,
                cat: catRig,
                hero: HERO,
                rig: { buildCatSVG: buildCatSVG, CatRig: CatRig },
                glyphs: glyphs,
                rain: rain,
                open: function (which) { resetAll(); openPill(pillById[which]); },
                collect: function () { collectPill(pillById[sceneState.active]); },
                step: function (dt, times) {
                    stepLocked = true;
                    const n = times || 1;
                    for (let i = 0; i < n; i++) stepScene(dt);
                    renderer.render(scene, camera);
                },
                unlock: function () { stepLocked = false; },
                state: sceneState
            };
        })();

    