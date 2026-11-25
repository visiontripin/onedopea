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
                        dom.dbg.cat.textContent = catRig.state;
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
