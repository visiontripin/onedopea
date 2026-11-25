
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
               9. КОТ-ЛОГОТИП  [V4]
               ----------------------------------------------------------------------
               Силуэт из логотипа (белый слой) + мягкая цветная подложка-обводка.
               Бежит «галопом»: присед → прыжок, squash-stretch, наклон, шлейф.
               ====================================================================== */
            const CAT_DATA_URL = 'data:image/png;base64,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';

            /**
             * Готовим два спрайта кота из одного PNG с альфой:
             *  • ink   — «чернильный» силуэт бренда (для светлой ленты Dope);
             *  • plate — тот же силуэт, раздутый в белую стикерную обводку
             *            (рисуем его 12 раз со сдвигом, потом кладём ink сверху).
             */
            function makeCatTextures(onReady) {
                const img = new Image();
                img.onload = function () {
                    const S = 512;
                    const canvasFor = function (draw) {
                        const cv = document.createElement('canvas');
                        cv.width = cv.height = S;
                        const x = cv.getContext('2d');
                        x.clearRect(0, 0, S, S);
                        draw(x, cv);
                        const t = new THREE.CanvasTexture(cv);
                        if ('encoding' in t) t.encoding = THREE.sRGBEncoding;
                        t.minFilter = THREE.LinearFilter;
                        t.anisotropy = 4;
                        return t;
                    };

                    const ink = canvasFor(function (x) {
                        x.drawImage(img, 0, 0, S, S);
                        x.globalCompositeOperation = 'source-in';
                        x.fillStyle = '#2b3a86';
                        x.fillRect(0, 0, S, S);
                    });

                    const plate = canvasFor(function (x) {
                        const steps = 20;
                        const r = 9;
                        for (let i = 0; i < steps; i++) {
                            const a = i / steps * Math.PI * 2;
                            x.drawImage(img, Math.cos(a) * r, Math.sin(a) * r, S, S);
                        }
                        x.globalCompositeOperation = 'source-in';
                        x.fillStyle = '#ffffff';
                        x.fillRect(0, 0, S, S);
                        x.drawImage(img, 0, 0, S, S);
                    });

                    onReady({ ink: ink, plate: plate });
                };
                img.src = CAT_DATA_URL;
            }

            function buildCat() {
                const root = new THREE.Group();
                root.visible = false;
                scene.add(root);

                const rig = new THREE.Group();       // squash / stretch / наклон
                root.add(rig);

                // цветная подложка (обводка + мягкая тень)
                const halo = new THREE.Mesh(
                    new THREE.PlaneGeometry(1, 1),
                    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1, depthWrite: false })
                );
                halo.position.set(0.006, -0.006, -0.002);
                rig.add(halo);

                // ink-силуэт: изображение уже нужного цвета, множитель белый
                const sprite = new THREE.Mesh(
                    new THREE.PlaneGeometry(1, 1),
                    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false })
                );
                sprite.renderOrder = 9;
                rig.add(sprite);

                // шлейф скорости
                const ghosts = [];
                for (let i = 0; i < 3; i++) {
                    const g = new THREE.Mesh(
                        new THREE.PlaneGeometry(1, 1),
                        new THREE.MeshBasicMaterial({
                            color: 0xffffff,
                            transparent: true,
                            opacity: 0.34 - i * 0.1,
                            depthWrite: false
                        })
                    );
                    g.renderOrder = 8;
                    g.visible = false;
                    rig.add(g);
                    ghosts.push(g);
                }

                // тень на «полу»
                const shTex = shadowTexture('40,55,110');
                const shadow = new THREE.Mesh(
                    new THREE.PlaneGeometry(1, 0.24),
                    new THREE.MeshBasicMaterial({ map: shTex, transparent: true, opacity: 0.5, depthWrite: false })
                );
                shadow.position.z = -0.05;
                root.add(shadow);

                return {
                    root: root, rig: rig, sprite: sprite, halo: halo, ghosts: ghosts, shadow: shadow,
                    ready: false,
                    state: 'idle',
                    t: 0,
                    pos: new THREE.Vector3(),
                    from: new THREE.Vector3(),
                    to: new THREE.Vector3(),
                    ctrl: new THREE.Vector3(),
                    scale: 0.5,
                    baseScale: 0.5,
                    facing: -1,
                    trail: [],
                    ghosts: ghosts
                };
            }
            const catRig = buildCat();
            makeCatTextures(function (tex) {
                catRig.halo.material.map = tex.plate;
                catRig.halo.material.needsUpdate = true;
                catRig.sprite.material.map = tex.ink;
                catRig.sprite.material.needsUpdate = true;
                catRig.ghosts.forEach(function (g) {
                    g.material.map = tex.ink;
                    g.material.needsUpdate = true;
                });
                catRig.ready = true;
            });

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
                    const orb = measureOrb() || feedTargets().orb;
                    if (orb) {
                        catRig.state = 'return';
                        catRig.t = 0;
                        catRig.from.copy(screenToWorld(orb.x, orb.y, 0.8));
                        catRig.pos.copy(catRig.from);
                        catRig.root.visible = true;
                        catRig.scale = catBaseScale * 0.55;
                        catRig.squash = 1;
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
                if (!catRig.ready) {
                    catRig.ready = true;
                }
                const mouth = pillWorldMouth(pill, new THREE.Vector3());
                const target = feedTargets();
                catRig.state = 'leap';
                catLaunched = true;
                catRig.t = 0;
                catRig.from.copy(mouth);
                catRig.pos.copy(mouth);
                catRig.facing = -1;
                // [V7] Первая цель — первая публикация: кот приземляется на неё,
                // затем карабкается наверх, к месту фото профиля.
                catRig.post = target.post;
                catRig.orb = target.orb;
                catRig.to = target.post
                    ? screenToWorld(target.post.x, target.post.y, 0.85)
                    : (target.orb ? screenToWorld(target.orb.x, target.orb.y, 0.85) : screenToWorld(W * 0.5, H * 0.7, 0.85));
                catRig.landScale = target.post
                    ? pxToWorld(Math.min(target.post.w || 90, 132) * 0.92)
                    : (target.orb ? pxToWorld(target.orb.r * 2.1) : catBaseScale * 0.8);
                catRig.ctrl.set(
                    lerp(mouth.x, catRig.to.x, 0.42),
                    Math.max(mouth.y, catRig.to.y) + 0.9,
                    lerp(mouth.z, catRig.to.z, 0.5)
                );
                catRig.root.visible = true;
                catRig.alpha = 1;
                catRig.scale = catBaseScale * 0.35;
                catRig.retTo = null;
                catRig.trail.length = 0;
                catRig.ghosts.forEach(function (g) { g.visible = false; });
                dom.catPuff.classList.remove('is-on');
                void dom.catPuff.offsetWidth;
                if (typeof FEED !== 'undefined' && FEED.onCatLeap) FEED.onCatLeap();
            }

            function updateCat(dt, now) {
                const cat = catRig;
                if (cat.state === 'idle') {
                    cat.root.visible = false;
                    return;
                }
                cat.t += dt;

                if (cat.state !== 'land' && cat.state !== 'gone') cat.alpha = 1;
                if (cat.state === 'leap') {
                    // Выпрыгивание: короткая дуга вверх-вперёд + рост
                    const p = clamp(cat.t / 0.42, 0, 1);
                    const e = easeOutCubic(p);
                    cat.pos.lerpVectors(cat.from, cat.ctrl, e * 0.55);
                    cat.scale = lerp(catBaseScale * 0.3, catBaseScale * 1.02, easeOutQuint(p));
                    cat.facing = cat.to.x < cat.from.x ? -1 : 1;
                    if (p >= 1) {
                        cat.state = 'run';
                        cat.t = 0;
                        cat.runFrom = cat.pos.clone();
                        cat.runCtrl = cat.ctrl.clone();
                        cat.runDur = CFG.timing.catRunDuration;
                        cat.trail.length = 0;
                    }
                } else if (cat.state === 'run') {
                    const p = clamp(cat.t / cat.runDur, 0, 1);
                    const e = easeInOutCubic(p);
                    const u = 1 - e;
                    // квадратичная дуга «бег с прыжками»
                    cat.pos.x = u * u * cat.runFrom.x + 2 * u * e * cat.runCtrl.x + e * e * cat.to.x;
                    cat.pos.y = u * u * cat.runFrom.y + 2 * u * e * cat.runCtrl.y + e * e * cat.to.y;
                    cat.pos.z = lerp(cat.runFrom.z, cat.to.z, e);
                    // галоп: 4 отталкивания за пробег
                    const gait = Math.abs(Math.sin(p * Math.PI * 3.4));
                    cat.pos.y += gait * 0.16 * (1 - p * 0.55);
                    cat.scale = lerp(catBaseScale, catRig.landScale, easeInOutCubic(p));
                    if (cat.to.x < cat.runFrom.x) cat.facing = -1; else cat.facing = 1;

                    // шлейф
                    cat.trailTimer = (cat.trailTimer || 0) + dt;
                    if (cat.trailTimer > 0.045) {
                        cat.trailTimer = 0;
                        cat.trail.unshift({ x: cat.pos.x, y: cat.pos.y, s: cat.scale });
                        if (cat.trail.length > 3) cat.trail.pop();
                    }
                    if (p >= 1) {
                        cat.state = 'land';
                        cat.t = 0;
                        cat.trail.length = 0;
                        onCatLand();
                    }
                } else if (cat.state === 'land') {
                    // [V7] Кот приземлился на первую публикацию: приседает, оглядывается,
                    // затем карабкается вверх — к месту фото профиля.
                    const settle = 0.42;
                    if (cat.t < settle) {
                        const p = easeOutCubic(cat.t / settle);
                        const squash = 1 - 0.26 * Math.sin(p * Math.PI) + Math.sin(cat.t * 22) * 0.02 * (1 - p);
                        cat.scale = catRig.landScale * (0.94 + 0.06 * p);
                        cat.squash = squash;
                        cat.pos.x += (catRig.to.x - cat.pos.x) * (1 - Math.exp(-14 * dt));
                        cat.pos.y += (catRig.to.y - cat.pos.y) * (1 - Math.exp(-14 * dt));
                    } else {
                        // старт карабканья: цель — аватар (фото профиля)
                        const orb = feedTargets().orb || catRig.orb;
                        catRig.climbFrom = catRig.pos.clone();
                        catRig.climbTo = orb ? screenToWorld(orb.x, orb.y, 0.85) : catRig.to.clone();
                        catRig.climbDur = 1.05;
                        cat.state = 'climb';
                        cat.t = 0;
                        cat.squash = 1;
                        cat.scale = catRig.landScale;
                        if (typeof FEED !== 'undefined' && FEED.onCatLandedOnPost) FEED.onCatLandedOnPost();
                    }
                } else if (cat.state === 'climb') {
                    // Карабканье: зигзаг «по стене» карточки — два толчка лапами,
                    // лёгкое покачивание, «когти» цепляются за край.
                    const p = clamp(cat.t / catRig.climbDur, 0, 1);
                    const e = easeInOutCubic(p);
                    const from = catRig.climbFrom, to = catRig.climbTo;
                    const zig = Math.sin(p * Math.PI * 3.2) * 0.11 * (1 - p * 0.4);
                    cat.pos.x = lerp(from.x, to.x, e);
                    cat.pos.y = lerp(from.y, to.y, e) + zig;
                    cat.pos.z = lerp(from.z, to.z, e);
                    const stroke = Math.abs(Math.sin(p * Math.PI * 6));
                    cat.pos.y += stroke * 0.045;
                    cat.facing = (p > 0.62) ? 1 : -1;
                    cat.scale = lerp(catRig.landScale, catRig.landScale * 0.78, e);
                    cat.squash = 1 + Math.sin(p * Math.PI * 6) * 0.05;
                    cat.rig.rotation.z = Math.sin(p * Math.PI * 3.2) * 0.12;
                    // когти цепляются за карточку: оставляем следы по траектории
                    catRig.clawTimer = (catRig.clawTimer || 0) + dt;
                    if (catRig.clawTimer > 0.1) {
                        catRig.clawTimer = 0;
                        if (typeof FEED !== 'undefined' && FEED.onClimbTrail) FEED.onClimbTrail(worldToScreen(cat.pos));
                    }
                    if (p >= 1) {
                        // забрался: кот «входит» в аватар — дальше живёт 2D-кот в ленте
                        cat.state = 'idle';
                        cat.t = 0;
                        cat.alpha = 1;
                        cat.root.visible = false;
                        cat.rig.rotation.z = 0;
                        cat.squash = 1;
                        if (typeof FEED !== 'undefined' && FEED.onCatArrived) FEED.onCatArrived();
                    }
                } else if (cat.state === 'return') {
                    // Обратный путь: из аватара в пасть капсулы
                    const dur = 0.95;
                    const p = clamp(cat.t / dur, 0, 1);
                    const e = easeInOutCubic(p);
                    if (!cat.retTo) {
                        cat.retTo = pillWorldMouth(pillById.blue, new THREE.Vector3());
                        cat.retCtrl = new THREE.Vector3(
                            lerp(cat.from.x, cat.retTo.x, 0.5),
                            Math.max(cat.from.y, cat.retTo.y) + 0.85,
                            lerp(cat.from.z, cat.retTo.z, 0.5)
                        );
                    }
                    const u = 1 - e;
                    cat.pos.x = u * u * cat.from.x + 2 * u * e * cat.retCtrl.x + e * e * cat.retTo.x;
                    cat.pos.y = u * u * cat.from.y + 2 * u * e * cat.retCtrl.y + e * e * cat.retTo.y;
                    cat.pos.z = lerp(cat.from.z, cat.retTo.z, e);
                    const gait = Math.abs(Math.sin(p * Math.PI * 3));
                    cat.pos.y += gait * 0.14;
                    cat.facing = cat.retTo.x < cat.from.x ? -1 : 1;
                    cat.scale = lerp(catBaseScale * 0.4, catBaseScale * 0.42, p) * (1 - p * 0.75);
                    cat.trailTimer = (cat.trailTimer || 0) + dt;
                    if (cat.trailTimer > 0.05) {
                        cat.trailTimer = 0;
                        cat.trail.unshift({ x: cat.pos.x, y: cat.pos.y, s: cat.scale });
                        if (cat.trail.length > 2) cat.trail.pop();
                    }
                    if (p >= 1) {
                        cat.state = 'gone';
                        cat.root.visible = false;
                        cat.trail.length = 0;
                        cat.retTo = null;
                    }
                }

                if (cat.state === 'gone') {
                    cat.root.visible = false;
                    return;
                }

                // --- применяем трансформ ---
                cat.root.position.copy(cat.pos);
                const bob = Math.sin((cat.t || 0) * 2) * 0.01;
                cat.root.position.y += bob;
                cat.rig.scale.set(cat.facing * cat.scale, cat.scale, 1);
                // squash-stretch по вертикали: капсула «дышит» в беге.
                // [V7] В посадке/карабканье сквош задаёт сам стейт (cat.squash).
                const squash = cat.squash !== undefined ? cat.squash : 1 + Math.sin((cat.t || 0) * 13) * 0.035;
                cat.rig.scale.y *= squash;
                cat.rig.scale.x *= (1 / Math.max(0.6, squash * 0.5 + 0.5));
                if (cat.state === 'run') {
                    cat.rig.rotation.z = Math.sin((cat.t || 0) * 13) * 0.045 - cat.facing * 0.03;
                } else if (cat.state !== 'climb') {
                    cat.rig.rotation.z = 0;
                }
                if (cat.state === 'run' || cat.state === 'land' || cat.state === 'climb') {
                    const sc = worldToScreen(cat.pos);
                    const trail = document.getElementById('cat-light-trail');
                    if (trail) {
                        trail.style.background =
                            'radial-gradient(circle at ' + (sc.x / W * 100).toFixed(1) + '% ' +
                            (sc.y / H * 100).toFixed(1) + '%, rgba(150, 168, 255, 0.26), transparent 34%)';
                    }
                }
                const mat = cat.sprite.material;
                mat.opacity = cat.alpha === undefined ? 1 : cat.alpha;
                cat.halo.material.opacity = 0.92 * (cat.alpha === undefined ? 1 : cat.alpha);
                cat.halo.scale.set(1.02, 1.02, 1);

                // шлейф-призраки
                cat.ghosts.forEach(function (g, i) {
                    const tr = cat.trail[i];
                    if (!tr || cat.state === 'land') { g.visible = false; return; }
                    g.visible = true;
                    g.position.set(tr.x - cat.pos.x, tr.y - cat.pos.y, -0.01 - i * 0.005);
                    g.scale.set(cat.facing * tr.s, tr.s, 1);
                    g.material.opacity = (0.26 - i * 0.075) * (cat.alpha === undefined ? 1 : cat.alpha);
                });

                // тень на «полу» страницы (для climb — тень прижата к карточке)
                const floorY = cat.to ? Math.min(cat.to.y - 0.35, cat.pos.y) : cat.pos.y - 0.35;
                cat.shadow.visible = true;
                cat.shadow.position.set(0, floorY - cat.pos.y + 0.04, -0.02);
                const d = clamp(1 - (cat.pos.y - floorY) * 0.5, 0.35, 1);
                cat.shadow.scale.set(cat.scale * 1.1 * d, d, 1);
                cat.shadow.material.opacity = 0.42 * d * (cat.alpha === undefined ? 1 : cat.alpha);
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
                dom.catSprite.style.opacity = '0';
                dom.catShadow.style.opacity = '0';

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

    