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
            const CAT_DATA_URL = 'CAT_SPRITE_DATA_URL';

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
