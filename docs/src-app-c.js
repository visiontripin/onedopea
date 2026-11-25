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
                    const orb = measureOrb();
                    if (orb) {
                        catRig.state = 'return';
                        catRig.t = 0;
                        catRig.from.copy(screenToWorld(orb.x, orb.y, 0.8));
                        catRig.pos.copy(catRig.from);
                        catRig.root.visible = true;
                        catRig.scale = catBaseScale * 0.55;
                    }
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
                    targetScale = 1.28;
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
                pill.shellAlpha = damp(pill.shellAlpha, alphaTarget, pill.state === 'dissolve' ? 5.2 : 6, dt);
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
                const orb = measureOrb();
                catRig.state = 'leap';
                catLaunched = true;
                catRig.t = 0;
                catRig.from.copy(mouth);
                catRig.pos.copy(mouth);
                catRig.facing = -1;
                catRig.to = orb
                    ? screenToWorld(orb.x, orb.y, 0.85)
                    : screenToWorld(W * 0.18, H * 0.32, 0.85);
                // в аватаре кот должен «уместиться» в круг, а не накрыть его
                catRig.landScale = orb
                    ? pxToWorld(orb.r * 1.55)
                    : catBaseScale * 0.7;
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
                    // короткая пауза «кот вписался в аватар», затем он растворяется
                    const pause = CFG.timing.catLandPause;
                    if (cat.t < pause) {
                        cat.scale = lerp(catRig.landScale, catRig.landScale * 0.96, easeOutCubic(cat.t / pause));
                        cat.alpha = 1;
                        cat.pos.x += (cat.to.x - cat.pos.x) * (1 - Math.exp(-9 * dt));
                        cat.pos.y += (cat.to.y - cat.pos.y) * (1 - Math.exp(-9 * dt));
                    } else {
                        const p = clamp((cat.t - pause) / 0.4, 0, 1);
                        cat.scale = lerp(catRig.landScale * 0.96, catRig.landScale * 0.3, easeInCubic(p));
                        cat.alpha = 1 - p;
                        cat.pos.y -= dt * 0.16;
                        if (p >= 1) {
                            cat.state = 'idle';
                            cat.alpha = 1;
                            cat.root.visible = false;
                        }
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
                // squash-stretch по вертикали: капсула «дышит» в беге
                const squash = 1 + Math.sin((cat.t || 0) * 13) * 0.035;
                cat.rig.scale.y *= squash;
                cat.rig.rotation.z = cat.state === 'run'
                    ? Math.sin((cat.t || 0) * 13) * 0.045 - cat.facing * 0.03
                    : 0;
                if (cat.state === 'run' || cat.state === 'land') {
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

                // тень на «полу» страницы
                const floorY = cat.to ? Math.min(cat.to.y - 0.35, cat.pos.y) : cat.pos.y - 0.35;
                cat.shadow.visible = true;
                cat.shadow.position.set(0, floorY - cat.pos.y + 0.04, -0.02);
                const d = clamp(1 - (cat.pos.y - floorY) * 0.5, 0.35, 1);
                cat.shadow.scale.set(cat.scale * 1.1 * d, d, 1);
                cat.shadow.material.opacity = 0.42 * d * (cat.alpha === undefined ? 1 : cat.alpha);
            }

            function onCatLand() {
                const orb = dom.orb;
                if (orb) {
                    orb.classList.remove('is-cat-landing');
                    void orb.offsetWidth;
                    orb.classList.add('is-cat-landing');
                    setTimeout(function () { orb.classList.remove('is-cat-landing'); }, 900);
                }
                flashCatPuff();
            }

            function flashCatPuff() {
                const el = dom.catPuff;
                const orb = measureOrb();
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
