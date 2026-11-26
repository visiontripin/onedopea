        /* ==========================================================================
           [V9] ГЕРОЙ-КОТ: выпрыгивание из капсулы → посадка на публикацию →
           карабканье на место фото профиля (и обратный побег при сборе).
           --------------------------------------------------------------------------
           Почему переписано. Раньше кот был одной растровой картинкой в 3D-сцене,
           которой меняли координаты: он «перетаскивался» как наклейка и не мог
           ни оттолкнуться, ни перебрать лапами. Теперь весь путь идёт в DOM по
           экранным координатам, а позы ставит векторный риг:

             emerge  — кот вылезает из горлышка капсулы и приседает для толчка
             leap    — толчок и полёт по дуге: в воздухе работает цикл бега
             land    — приземление на карточку: сплющивание и оглядка
             climb   — карабканье по левой кромке карточки к аватару:
                       корпус наклонён, лапы по очереди перехватывают
             flee    — обратный побег в капсулу при сборе страницы
           ========================================================================== */
        const HERO = (function () {
            const S = {
                el: null, svg: null, rig: null,
                state: 'idle', t: 0,
                x: 0, y: 0, scale: 0.5, facing: 1, tilt: 0,
                phase: 0,
                from: null, to: null, ctrl: null,
                onDone: null, clawTimer: 0, home: false, climbP: 0
            };
            const BASE_W = 190;   // ширина кота в «натуральную величину»

            function ensure() {
                if (S.el) return;
                const layer = document.getElementById('cat-fx-layer') || document.body;
                const el = document.createElement('div');
                el.className = 'hero-cat';
                el.setAttribute('aria-hidden', 'true');
                el.innerHTML = buildCatSVG();
                layer.appendChild(el);
                S.el = el;
                S.svg = el.querySelector('svg');
                S.svg.classList.add('cat-rig');
                S.rig = new CatRig(S.svg);
            }

            function place() {
                const w = BASE_W * S.scale;
                const h = w * 0.87;
                // на узких экранах кромка карточки почти у края окна: поджимаем кота,
                // чтобы он не уезжал за левую границу и не обрезался
                const px = Math.max(S.x, w * 0.5 + 4);
                S.el.style.width = w.toFixed(1) + 'px';
                S.el.style.height = h.toFixed(1) + 'px';
                S.el.style.transform =
                    'translate3d(' + (px - w * 0.5).toFixed(1) + 'px,' +
                    (S.y - h).toFixed(1) + 'px,0)';
                // rotate → scaleX: кот сначала поворачивается (наклон/карабканье),
                // затем зеркалится. Так наклон читается одинаково при любом направлении.
                S.svg.style.transform = 'rotate(' + S.tilt.toFixed(3) + 'rad) scaleX(' + S.facing + ')';
            }

            function bez(p) {
                const u = 1 - p;
                return {
                    x: u * u * S.from.x + 2 * u * p * S.ctrl.x + p * p * S.to.x,
                    y: u * u * S.from.y + 2 * u * p * S.ctrl.y + p * p * S.to.y
                };
            }

            /* --- Старт: кот вылезает из капсулы --- */
            function launch(opts) {
                ensure();
                const from = opts.from;
                S.state = 'emerge';
                S.t = 0;
                S.phase = 0;
                S.from = { x: from.x, y: from.y };
                S.to = { x: opts.to.x, y: opts.to.y };
                S.postW = opts.postW || 320;
                S.orb = opts.orb || null;
                S.scale = 0.16;
                S.facing = S.to.x < S.from.x ? -1 : 1;
                S.home = false;
                S.climbP = 0;
                S.el.style.opacity = '1';
                S.el.classList.add('is-flying');
                S.el.classList.remove('is-climbing');
                S.rig.poseLand(0);
                place();
            }

            /* --- Обратный побег: из аватара в капсулу --- */
            function flee(from, to, onDone) {
                ensure();
                S.state = 'flee';
                S.t = 0;
                S.phase = 0;
                S.from = { x: from.x, y: from.y };
                S.to = { x: to.x, y: to.y };
                S.ctrl = {
                    x: (S.from.x + S.to.x) / 2,
                    y: Math.min(S.from.y, S.to.y) - Math.max(70, Math.abs(S.from.y - S.to.y) * 0.3)
                };
                S.facing = S.to.x < S.from.x ? -1 : 1;
                S.scale = 0.62;
                S.onDone = onDone || null;
                S.el.style.opacity = '1';
                S.el.classList.add('is-flying');
                S.el.classList.remove('is-climbing');
            }

            function finish(home) {
                S.state = 'idle';
                S.t = 0;
                S.tilt = 0;
                // «дома» — значит стоит в аватаре: по этому флагу движок понимает,
                // что при сборе страницы кота надо уводить в капсулу
                S.home = home === true;
                S.el.style.opacity = '0';
                S.el.classList.remove('is-flying', 'is-climbing');
            }

            function update(dt) {
                if (S.state === 'idle' || !S.el) return;
                S.t += dt;

                if (S.state === 'emerge') {
                    // 0.24 c: кот «вытягивается» из горлышка и приседает
                    const p = Math.min(1, S.t / 0.24);
                    S.scale = 0.16 + easeOutCubicLocal(p) * 0.26;
                    S.x = S.from.x;
                    S.y = S.from.y - easeOutCubicLocal(p) * 10;
                    S.rig.poseLand(1 - p * 0.55);
                    if (p >= 1) {
                        S.state = 'leap';
                        S.t = 0;
                        S.scale = 0.42;
                        const gy = Math.min(S.from.y, S.to.y);
                        S.ctrl = {
                            x: S.from.x + (S.to.x - S.from.x) * 0.42,
                            y: gy - Math.max(80, Math.abs(S.to.y - S.from.y) * 0.3)
                        };
                        if (typeof FEED !== 'undefined' && FEED.onCatJumped) FEED.onCatJumped();
                    }
                } else if (S.state === 'leap') {
                    // полёт: дуга + рост, в воздухе лапы продолжают бежать
                    const p = Math.min(1, S.t / 0.72);
                    const e = easeOutCubicLocal(p);
                    const at = bez(e);
                    const at2 = bez(Math.min(1, e + 0.02));
                    S.x = at.x;
                    S.y = at.y;
                    const dxs = Math.abs(at2.x - at.x) > 0.3 ? (at2.x - at.x) : 0.3 * S.facing;
                    S.tilt = clampNumLocal(Math.atan2(at2.y - at.y, Math.abs(dxs)) * 1.1, -0.42, 0.42);
                    const landScale = clampNumLocal(S.postW / 300, 0.42, 0.9);
                    S.scale = 0.42 + (landScale - 0.42) * easeOutQuintLocal(p);
                    S.phase = (S.phase + dt * 3.6) % 1;
                    S.rig.poseFly(S.phase * 0.6 + 0.2);
                    if (p >= 1) {
                        S.state = 'land';
                        S.t = 0;
                        S.tilt = 0;
                        S.el.classList.remove('is-flying');
                        S.rig.poseLand(0);
                        if (typeof FEED !== 'undefined' && FEED.onCatLandedOnPost) FEED.onCatLandedOnPost();
                    }
                } else if (S.state === 'land') {
                    // приземление: сплющивание, потом короткая оглядка
                    const p = Math.min(1, S.t / 0.5);
                    S.rig.poseLand(1 - easeOutCubicLocal(p));
                    S.y += (S.to.y - S.y) * (1 - Math.exp(-12 * dt));
                    if (p >= 1) {
                        const orb = orbTarget();
                        const card = document.querySelector('#page-dope .post-card[data-post="0"]');
                        const cr = card ? card.getBoundingClientRect() : null;
                        S.state = 'climb';
                        S.t = 0;
                        S.climbT = 0;
                        S.from = { x: S.x, y: S.y };
                        // кромка карточки: кот сначала подходит к ней, затем лезет вверх.
                        // На узких экранах кромка почти у края окна — не даём коту
                        // уехать за границу viewport, иначе он обрезается.
                        const edge = cr ? cr.left - 12 : S.from.x - 120;
                        S.edgeX = Math.max(edge, 38);
                        S.mid = { x: S.edgeX, y: S.from.y - 30 };
                        S.to = orb ? { x: orb.x, y: orb.y + orb.h * 0.3 } : { x: S.edgeX, y: S.from.y - 180 };
                        S.dist = Math.abs(S.mid.x - S.from.x) + Math.abs(S.to.y - S.mid.y) + Math.abs(S.to.x - S.mid.x);
                        S.dur = Math.max(1.1, S.dist / 210);
                        S.facing = 1;       // голова вверх, лапы к кромке карточки
                        S.el.classList.add('is-climbing');
                        if (typeof FEED !== 'undefined' && FEED.onClimbStart) FEED.onClimbStart();
                    }
                } else if (S.state === 'climb') {
                    // Карабканье по «стене» карточки: подход к кромке, затем подъём
                    // по ней к аватару. Лапы перебирают синхронно с пройденным путём.
                    const p = Math.min(1, S.t / S.dur);
                    S.climbP = p;                          // прогресс подъёма (для отладки)
                    const q1 = 0.34;                       // доля пути «подойти к кромке»
                    let speed;
                    if (p < q1) {
                        const u = easeInOutCubicLocal(p / q1);
                        S.x = S.from.x + (S.mid.x - S.from.x) * u;
                        S.y = S.from.y + (S.mid.y - S.from.y) * u;
                        speed = 0.55;
                    } else {
                        const u = easeInOutCubicLocal((p - q1) / (1 - q1));
                        const jitter = Math.sin(p * Math.PI * 7) * 5 * (1 - p * 0.6);
                        S.x = S.mid.x + (S.to.x - S.mid.x) * u + jitter;
                        S.y = S.mid.y + (S.to.y - S.mid.y) * u - Math.abs(Math.sin(p * Math.PI * 6)) * 6;
                        speed = 1;
                    }
                    S.scale = clampNumLocal(S.postW / 300, 0.42, 0.9) * (1 - p * 0.34);
                    // перебор лап привязан к пути: на подъёме — быстрее
                    S.phase = (S.phase + dt * (2.2 + speed * 3.4)) % 1;
                    S.rig.poseClimb(S.phase);
                    // кот «встаёт на стену»: доворачиваем риг к вертикали,
                    // чтобы лапы были на кромке, а голова смотрела вверх
                    S.tilt = -0.72 - Math.sin(p * Math.PI * 2) * 0.05;
                    S.clawTimer += dt;
                    if (S.clawTimer > 0.1) {
                        S.clawTimer = 0;
                        if (typeof FEED !== 'undefined' && FEED.onClimbTrail) {
                            FEED.onClimbTrail({ x: S.x + 26, y: S.y - 4 });
                        }
                    }
                    if (p >= 1) {
                        finish(true);
                        if (typeof FEED !== 'undefined' && FEED.onCatArrived) FEED.onCatArrived();
                    }
                } else if (S.state === 'flee') {
                    // обратный побег: бег по дуге и «всасывание» в капсулу
                    const p = Math.min(1, S.t / 0.95);
                    const e = easeInOutCubicLocal(p);
                    const at = bez(e);
                    S.x = at.x;
                    S.y = at.y;
                    S.scale = 0.62 - e * 0.46;
                    S.phase = (S.phase + dt * 4.2) % 1;
                    S.rig.poseRun(S.phase);
                    S.tilt = Math.atan2(S.to.y - S.from.y, Math.abs(S.to.x - S.from.x) + 1) * e * 0.5;
                    if (p >= 1) {
                        finish(false);
                        const done = S.onDone;
                        S.onDone = null;
                        if (done) done();
                    }
                }
                place();
            }

            function orbTarget() {
                const orb = document.querySelector('#page-dope .profile-orb');
                if (!orb) return null;
                const r = orb.getBoundingClientRect();
                return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
            }

            function reset() {
                if (!S.el) return;
                S.state = 'idle';
                S.home = false;
                S.t = 0;
                S.el.style.opacity = '0';
                S.el.classList.remove('is-flying', 'is-climbing');
            }

            return {
                state: S,
                ensure: ensure,
                launch: launch,
                flee: flee,
                update: update,
                reset: reset,
                orbTarget: orbTarget
            };
        })();

        function easeOutCubicLocal(t) { return 1 - Math.pow(1 - t, 3); }
        function easeOutQuintLocal(t) { return 1 - Math.pow(1 - t, 5); }
        function easeInOutCubicLocal(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
        function clampNumLocal(v, a, b) { return v < a ? a : (v > b ? b : v); }
