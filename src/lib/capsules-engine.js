// Auto-extracted & modularized from capsules-segment-standalone.html
// Preserves 100% of the 3D gel capsules, real-DOM [data-frag] slot measurement,
// fragment assembly flight, pop-dissolve reveal, vortex suction, and mobile adaptive FPS.

export const SEGMENT_CONFIG = {
    pageAppearDelayMs: 900,
    keepCornerPillsVisible: true,
    hideCaptionWhenOpen: true,
};

let threeLoadPromise = null;

export function ensureThreeLoaded(basePath = '') {
    if (typeof window === 'undefined') return Promise.reject(new Error('SSR'));
    if (window.THREE) return Promise.resolve(window.THREE);
    if (!threeLoadPromise) {
        threeLoadPromise = new Promise((resolve, reject) => {
            const localScript = document.createElement('script');
            localScript.src = `${basePath}/three.min.js`;
            localScript.async = true;
            localScript.onload = () => {
                if (window.THREE) resolve(window.THREE);
                else reject(new Error('THREE missing after local load'));
            };
            localScript.onerror = () => {
                const cdnScript = document.createElement('script');
                cdnScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
                cdnScript.async = true;
                cdnScript.onload = () => (window.THREE ? resolve(window.THREE) : reject(new Error('THREE unavailable')));
                cdnScript.onerror = () => reject(new Error('Failed to load Three.js'));
                document.head.appendChild(cdnScript);
            };
            document.head.appendChild(localScript);
        });
    }
    return threeLoadPromise;
}

export function mountCapsulesEngine({
    webglContainer,
    matrixCanvas,
    pageOneEl,
    pageDopeEl,
    onThemeChange,
    onStageChange,
    onWebGLFallback,
}) {
    const THREE = window.THREE;
    let destroyed = false;
    let rafId = 0;
    let activeWorldTheme = 'default';
    let pageRevealTimer = null;
    const boundIframeCleanups = [];

    const QUALITY = {
        mobile:
            (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ||
            Math.min(window.innerWidth, window.innerHeight) < 720,
        reducedMotion: Boolean(
            window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ),
    };
    const FRAG_BOX_COUNT = QUALITY.mobile ? 84 : 136;
    const FRAG_DOT_COUNT = QUALITY.mobile ? 10 : 18;
    const FRAG_Z_PLANE = 0.9;
    const MOTION_SCALE = QUALITY.reducedMotion ? 0.35 : 1;
    const MAX_PIXEL_RATIO = Math.min(window.devicePixelRatio || 1, QUALITY.mobile ? 1.75 : 2);
    let pixelRatioCap = MAX_PIXEL_RATIO;

    // ================= МАТРИЧНЫЙ ДОЖДЬ ДЛЯ ТЕМЫ КРАСНОЙ ТАБЛЕТКИ =================
    const matrixCtx = matrixCanvas.getContext('2d');
    const matrixChars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF';
    let matrixDrops = [];
    let matrixCols = 0;

    function resizeMatrixCanvas() {
        matrixCanvas.width = window.innerWidth;
        matrixCanvas.height = window.innerHeight;
        const fontSize = 15;
        matrixCols = Math.ceil(matrixCanvas.width / fontSize);
        matrixDrops = new Array(matrixCols).fill(0).map(() => Math.random() * -40);
    }
    resizeMatrixCanvas();

    let matrixAccum = 0;
    function updateMatrixRain(dt) {
        if (activeWorldTheme !== 'red') return;
        matrixAccum += dt;
        if (matrixAccum < (QUALITY.mobile ? 0.085 : 0.05)) return;
        matrixAccum = 0;

        matrixCtx.fillStyle = 'rgba(2, 6, 3, 0.14)';
        matrixCtx.fillRect(0, 0, matrixCanvas.width, matrixCanvas.height);

        matrixCtx.font = '14px "JetBrains Mono", monospace';
        for (let i = 0; i < matrixCols; i++) {
            const ch = matrixChars.charAt(Math.floor(Math.random() * matrixChars.length));
            const x = i * 15;
            const y = matrixDrops[i] * 15;
            matrixCtx.fillStyle = Math.random() > 0.92 ? '#a7f3c0' : '#22c55e';
            matrixCtx.fillText(ch, x, y);

            if (y > matrixCanvas.height && Math.random() > 0.975) {
                matrixDrops[i] = 0;
            }
            matrixDrops[i] += 0.85;
        }
    }

    function showPageStage(which) {
        if (destroyed) return;
        const showOne = which === 'red';
        const showDope = which === 'blue';
        if (showDope && pageDopeEl) pageDopeEl.scrollTop = 0;
        onStageChange(showOne ? 'red' : showDope ? 'blue' : 'default');
    }

    function applyWorldTheme(themeName, opts) {
        if (destroyed) return;
        const deferPageReveal = Boolean(opts && opts.deferPageReveal);
        activeWorldTheme = themeName;
        if (pageRevealTimer) {
            clearTimeout(pageRevealTimer);
            pageRevealTimer = null;
        }

        onThemeChange(themeName);

        if (themeName === 'red' || themeName === 'blue') {
            if (!deferPageReveal) {
                pageRevealTimer = setTimeout(function () {
                    showPageStage(themeName);
                }, SEGMENT_CONFIG.pageAppearDelayMs);
            }
        } else {
            showPageStage('default');
        }
    }

    function updateResetButtonVisibility() {}

    function makeFallbackController() {
        return {
            backToPills: () => applyWorldTheme('default'),
            switchToRed: () => applyWorldTheme('red'),
            switchToBlue: () => applyWorldTheme('blue'),
            bindIframeWindow: () => {},
            destroy: () => {
                destroyed = true;
                if (pageRevealTimer) clearTimeout(pageRevealTimer);
            },
        };
    }



            const container = webglContainer;
            const scene = new THREE.Scene();

            const camera = new THREE.PerspectiveCamera(
                36,
                window.innerWidth / window.innerHeight,
                0.1,
                100
            );
            camera.position.set(0, 0.45, 7.6);
            camera.lookAt(0, 0, 0);

            let renderer;
            try {
                if (typeof THREE === 'undefined') throw new Error('THREE unavailable');
                renderer = new THREE.WebGLRenderer({
                    antialias: true,
                    alpha: true,
                    powerPreference: 'high-performance'
                });
            } catch (err) {
                onWebGLFallback();
                return makeFallbackController();
            }
            renderer.setPixelRatio(pixelRatioCap);
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setClearColor(0x000000, 0);
            renderer.toneMapping = THREE.ACESFilmicToneMapping;
            renderer.toneMappingExposure = 1.18;
            renderer.outputEncoding = THREE.sRGBEncoding;
            container.appendChild(renderer.domElement);

            // Процедурная студийная карта окружения для реалистичных глянцевых бликов на капсулах
            function createStudioEnvMap() {
                const envCanvas = document.createElement('canvas');
                envCanvas.width = 512;
                envCanvas.height = 256;
                const ctx = envCanvas.getContext('2d');

                const grad = ctx.createLinearGradient(0, 0, 0, 256);
                grad.addColorStop(0.0, '#ffffff');
                grad.addColorStop(0.32, '#f4f7ff');
                grad.addColorStop(0.55, '#d8e0ec');
                grad.addColorStop(0.75, '#eef2f7');
                grad.addColorStop(1.0, '#ffffff');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, 512, 256);

                // Яркие студийные софтбоксы
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(45, 22, 165, 52);
                ctx.fillRect(285, 26, 175, 48);
                ctx.fillStyle = 'rgba(255,255,255,0.85)';
                ctx.fillRect(110, 145, 290, 26);

                const tex = new THREE.CanvasTexture(envCanvas);
                tex.mapping = THREE.EquirectangularReflectionMapping;
                tex.encoding = THREE.sRGBEncoding;

                const pmrem = new THREE.PMREMGenerator(renderer);
                pmrem.compileEquirectangularShader();
                const envRT = pmrem.fromEquirectangular(tex);
                tex.dispose();
                pmrem.dispose();
                return envRT.texture;
            }

            scene.environment = createStudioEnvMap();

            // Студийное освещение
            const hemiLight = new THREE.HemisphereLight(0xffffff, 0xe8eef8, 1.05);
            scene.add(hemiLight);

            const keyLight = new THREE.DirectionalLight(0xffffff, 1.45);
            keyLight.position.set(3.5, 6.5, 5.5);
            scene.add(keyLight);

            const fillLight = new THREE.DirectionalLight(0xf0f6ff, 0.75);
            fillLight.position.set(-4.5, 2.5, 4.0);
            scene.add(fillLight);

            const rimLight = new THREE.DirectionalLight(0xffffff, 0.9);
            rimLight.position.set(0, -3.5, -4.5);
            scene.add(rimLight);

            // Деликатная каустическая тень под капсулой
            function createCausticShadowTexture(coreColor, midColor, outerColor) {
                const c = document.createElement('canvas');
                c.width = 256;
                c.height = 128;
                const ctx = c.getContext('2d');

                const g = ctx.createRadialGradient(128, 64, 12, 128, 64, 118);
                g.addColorStop(0.0, coreColor);
                g.addColorStop(0.45, midColor);
                g.addColorStop(0.8, outerColor);
                g.addColorStop(1.0, 'rgba(255,255,255,0)');

                ctx.fillStyle = g;
                ctx.fillRect(0, 0, 256, 128);

                const tex = new THREE.CanvasTexture(c);
                tex.needsUpdate = true;
                return tex;
            }

            // Построение одной половинки капсулы (открытый цилиндр + полусфера + ободок)
            function createCapsuleHalfMesh(side, radius, halfCylLen, outerMat, innerMat) {
                const halfGroup = new THREE.Group();

                // Внешний цилиндр половинки
                const cylGeo = new THREE.CylinderGeometry(radius, radius, halfCylLen, 42, 1, true);
                cylGeo.rotateZ(Math.PI / 2);
                cylGeo.translate(side * (halfCylLen * 0.5), 0, 0);
                const cylMesh = new THREE.Mesh(cylGeo, outerMat);
                cylMesh.renderOrder = 3;
                halfGroup.add(cylMesh);

                // Внешняя полусфера на торце
                const domeGeo = new THREE.SphereGeometry(
                    radius,
                    42,
                    24,
                    0,
                    Math.PI * 2,
                    0,
                    Math.PI * 0.5
                );
                domeGeo.rotateZ(side === 1 ? -Math.PI / 2 : Math.PI / 2);
                domeGeo.translate(side * halfCylLen, 0, 0);
                const domeMesh = new THREE.Mesh(domeGeo, outerMat);
                domeMesh.renderOrder = 3;
                halfGroup.add(domeMesh);

                // Внутренняя стенка полости (придаёт толщину желатиновой оболочке)
                const innerR = radius - 0.045;
                const innerCylGeo = new THREE.CylinderGeometry(innerR, innerR, halfCylLen, 32, 1, true);
                innerCylGeo.rotateZ(Math.PI / 2);
                innerCylGeo.translate(side * (halfCylLen * 0.5), 0, 0);
                const innerCylMesh = new THREE.Mesh(innerCylGeo, innerMat);
                innerCylMesh.renderOrder = 2;
                halfGroup.add(innerCylMesh);

                // Глянцевый ободок на срезе (хорошо виден при раскрытии и закручивании)
                const rimGeo = new THREE.TorusGeometry(radius - 0.022, 0.022, 14, 42);
                rimGeo.rotateY(Math.PI / 2);
                const rimMesh = new THREE.Mesh(rimGeo, outerMat);
                rimMesh.renderOrder = 4;
                halfGroup.add(rimMesh);

                // Лёгкая продольная насечка на ободке, чтобы было заметно закручивание при закрытии
                const seamDotGeo = new THREE.BoxGeometry(0.08, 0.035, 0.035);
                const seamDotMat = new THREE.MeshStandardMaterial({
                    color: 0xffffff,
                    roughness: 0.15,
                    metalness: 0.1,
                    transparent: true,
                    opacity: 0.55
                });
                const seamDot = new THREE.Mesh(seamDotGeo, seamDotMat);
                seamDot.position.set(side * 0.05, radius - 0.015, 0);
                seamDot.renderOrder = 4;
                halfGroup.add(seamDot);

                return halfGroup;
            }

            // Сборка полной капсулы с сыпучим содержимым и тенью
            function buildGelCapsule(options) {
                const radius = 0.52;
                const halfCylLen = 0.66;

                const group = new THREE.Group();
                group.position.set(options.baseX, options.baseY, options.baseZ);
                scene.add(group);

                // Насыщенный глянцевый полупрозрачный желатин (без transmission, чтобы чётко видеть внутренние гранулы)
                const shellMat = new THREE.MeshPhysicalMaterial({
                    color: options.shellColor,
                    emissive: options.emissiveColor,
                    emissiveIntensity: 0.24,
                    roughness: 0.07,
                    metalness: 0.02,
                    clearcoat: 1.0,
                    clearcoatRoughness: 0.04,
                    reflectivity: 1.0,
                    transparent: true,
                    opacity: 0.58,
                    depthWrite: false,
                    side: THREE.FrontSide
                });

                const innerWallMat = new THREE.MeshPhysicalMaterial({
                    color: options.innerWallColor,
                    emissive: options.emissiveColor,
                    emissiveIntensity: 0.15,
                    roughness: 0.18,
                    metalness: 0.0,
                    transparent: true,
                    opacity: 0.22,
                    depthWrite: false,
                    side: THREE.BackSide
                });

                const leftHalf = createCapsuleHalfMesh(-1, radius, halfCylLen, shellMat, innerWallMat);
                const rightHalf = createCapsuleHalfMesh(1, radius, halfCylLen, shellMat, innerWallMat);
                group.add(leftHalf);
                group.add(rightHalf);

                // Невидимая сфера-хитбокс для удобного клика/тапа по капсуле (в том числе в уменьшенном виде в углу)
                const hitGeo = new THREE.BoxGeometry(2.5, 1.35, 1.35);
                const hitMat = new THREE.MeshBasicMaterial({ visible: false });
                const hitMesh = new THREE.Mesh(hitGeo, hitMat);
                group.add(hitMesh);

                // ===== Сыпучее содержимое: фрагменты будущей страницы =====
                // Вместо абстрактных гранул — мелкие «кусочки интерфейса» (панели,
                // строки текста, чипы и точки): при раскрытии они высыпаются,
                // долетают до своих мест в раскладке страницы и складываются в неё.
                const fragMat = new THREE.MeshStandardMaterial({
                    color: 0xffffff,
                    emissive: options.innerEmissive,
                    emissiveIntensity: 0.35,
                    roughness: 0.3,
                    metalness: 0.06
                });

                const fragBoxGeo = new THREE.BoxGeometry(1, 1, 1);
                const fragDotGeo = new THREE.SphereGeometry(1, QUALITY.mobile ? 8 : 10, QUALITY.mobile ? 6 : 8);

                const fragBoxes = new THREE.InstancedMesh(fragBoxGeo, fragMat, FRAG_BOX_COUNT);
                fragBoxes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
                fragBoxes.frustumCulled = false;
                fragBoxes.renderOrder = 1;
                scene.add(fragBoxes);

                const fragDots = new THREE.InstancedMesh(fragDotGeo, fragMat, FRAG_DOT_COUNT);
                fragDots.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
                fragDots.frustumCulled = false;
                fragDots.renderOrder = 1;
                scene.add(fragDots);

                const boxFrags = [];
                const dotFrags = [];
                const dummy = new THREE.Object3D();

                // Одна «крошка» содержимого капсулы
                function spawnFrag(kind) {
                    const isDot = kind === 'dot';
                    const lx = (Math.random() * 2 - 1) * (halfCylLen + 0.24);
                    const maxR = Math.max(0.06, radius - 0.11);
                    const ang = Math.random() * Math.PI * 2;
                    const dist = Math.sqrt(Math.random()) * maxR;
                    const ly = Math.sin(ang) * dist - 0.06;
                    const lz = Math.cos(ang) * dist;

                    const origColor = new THREE.Color(options.innerColor);
                    const hsl = {};
                    origColor.getHSL(hsl);
                    origColor.setHSL(
                        hsl.h + (Math.random() - 0.5) * 0.025,
                        Math.min(1, hsl.s * (0.94 + Math.random() * 0.12)),
                        THREE.MathUtils.clamp(hsl.l * (0.86 + Math.random() * 0.24), 0.18, 0.78)
                    );

                    const themeColor = new THREE.Color(options.themeGrainColor);
                    const thsl = {};
                    themeColor.getHSL(thsl);
                    themeColor.setHSL(
                        thsl.h + (Math.random() - 0.5) * 0.02,
                        Math.min(1, thsl.s * (0.92 + Math.random() * 0.14)),
                        THREE.MathUtils.clamp(thsl.l * (0.86 + Math.random() * 0.26), 0.25, 0.88)
                    );

                    const baseScale = isDot
                        ? new THREE.Vector3(0.05, 0.05, 0.05)
                        : new THREE.Vector3(0.08 + Math.random() * 0.1, 0.035 + Math.random() * 0.045, 0.032);

                    return {
                        kind: kind,
                        radius: isDot ? 0.05 : 0.06,
                        pos: new THREE.Vector3(lx, ly, lz),
                        vel: new THREE.Vector3(),
                        worldPos: new THREE.Vector3(options.baseX + lx, options.baseY + ly, options.baseZ + lz),
                        worldVel: new THREE.Vector3(),
                        rot: new THREE.Vector3(Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28),
                        rotVel: new THREE.Vector3(),
                        rotFrom: new THREE.Vector3(),
                        flatRot: new THREE.Vector3(),
                        halfSide: lx < 0 ? -1 : 1,
                        spilled: false,
                        pourDelay: 0,
                        collectDelay: 0,
                        assembleDelay: 0,
                        assembleDur: 0.9,
                        assembleP: 0,
                        assembleFrom: new THREE.Vector3(),
                        arcAmp: 0.2,
                        arrived: false,
                        hidden: false,
                        fadeP: 0,
                        fadeDelay: 0,
                        fadeFromScale: new THREE.Vector3(0.1, 0.05, 0.03),
                        swirlPhase: Math.random() * Math.PI * 2,
                        slotIdx: 0,
                        origColor: origColor,
                        targetColor: themeColor,
                        colorMix: 0,
                        baseScale: baseScale,
                        curScale: baseScale.clone(),
                        targetPos: new THREE.Vector3(),
                        targetScale: baseScale.clone()
                    };
                }

                for (let i = 0; i < FRAG_BOX_COUNT; i++) {
                    const f = spawnFrag('chip');
                    boxFrags.push(f);
                    dummy.position.copy(f.worldPos);
                    dummy.rotation.set(f.rot.x, f.rot.y, f.rot.z);
                    dummy.scale.set(f.baseScale.x, f.baseScale.y, f.baseScale.z);
                    dummy.updateMatrix();
                    fragBoxes.setMatrixAt(i, dummy.matrix);
                    fragBoxes.setColorAt(i, f.origColor);
                }
                for (let i = 0; i < FRAG_DOT_COUNT; i++) {
                    const f = spawnFrag('dot');
                    dotFrags.push(f);
                    dummy.position.copy(f.worldPos);
                    dummy.rotation.set(0, 0, 0);
                    dummy.scale.set(f.baseScale.x, f.baseScale.y, f.baseScale.z);
                    dummy.updateMatrix();
                    fragDots.setMatrixAt(i, dummy.matrix);
                    fragDots.setColorAt(i, f.origColor);
                }

                fragBoxes.instanceMatrix.needsUpdate = true;
                fragDots.instanceMatrix.needsUpdate = true;
                if (fragBoxes.instanceColor) fragBoxes.instanceColor.needsUpdate = true;
                if (fragDots.instanceColor) fragDots.instanceColor.needsUpdate = true;

                // Мягкая каустическая тень на «полу» под капсулой
                const shadowTex = createCausticShadowTexture(
                    options.shadowCore,
                    options.shadowMid,
                    options.shadowOuter
                );
                const shadowGeo = new THREE.PlaneGeometry(3.15, 1.55);
                const shadowMat = new THREE.MeshBasicMaterial({
                    map: shadowTex,
                    transparent: true,
                    opacity: 0.42,
                    depthWrite: false
                });
                const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
                shadowMesh.rotation.x = -Math.PI / 2;
                shadowMesh.position.set(options.baseX, -1.22, options.baseZ);
                scene.add(shadowMesh);

                return {
                    id: options.id,
                    group,
                    leftHalf,
                    rightHalf,
                    hitMesh,
                    fragBoxes,
                    fragDots,
                    boxFrags,
                    dotFrags,
                    fragMat,
                    shadowMesh,
                    radius,
                    halfCylLen,
                    baseX: options.baseX,
                    baseY: options.baseY,
                    baseZ: options.baseZ,
                    innerEmissive: options.innerEmissive,
                    themeGrainEmissive: options.themeGrainEmissive,
                    state: 'closed', // 'closed' | 'open' | 'dock_closing' | 'docked' | 'undocking' | 'collecting' | 'closing'
                    openProgress: 0,
                    pageRevealed: false,
                    revealTimer: 0,
                    openTimer: 0,
                    dockTimer: 0,
                    undockTimer: 0,
                    collectTimer: 0,
                    closingProgress: 0,
                    suctionSide: -1,
                    curScale: 1,
                    collectInPlace: false,
                    collectAnchor: new THREE.Vector3(),
                    collectScale: 1,
                    themeTriggered: false,
                    prevOuterPos: new THREE.Vector3(options.baseX, options.baseY, options.baseZ),
                    outerVel: new THREE.Vector3(0, 0, 0),
                    angularVelImpulse: new THREE.Vector3(0, 0, 0),
                    clickImpulse: new THREE.Vector3(0, 0, 0)
                };
            }

            // Красная капсула с синим сыпучим содержимым (при высыпании -> зелёная Матрица BOTCONTROL)
            const redPill = buildGelCapsule({
                id: 'red',
                baseX: -1.72,
                baseY: 0.08,
                baseZ: 0,
                shellColor: 0xff0514,
                emissiveColor: 0x7a0008,
                innerWallColor: 0xd90010,
                innerColor: 0x0044ff,
                innerEmissive: 0x001a88,
                themeGrainColor: 0x36ff7a,
                themeGrainEmissive: 0x16a34a,
                shadowCore: 'rgba(255, 65, 55, 0.34)',
                shadowMid: 'rgba(240, 20, 30, 0.16)',
                shadowOuter: 'rgba(220, 0, 20, 0.04)'
            });

            // Синяя капсула с красным сыпучим содержимым (при высыпании -> лавандовый ONEDOPEA)
            const bluePill = buildGelCapsule({
                id: 'blue',
                baseX: 1.72,
                baseY: 0.08,
                baseZ: 0,
                shellColor: 0x0038ff,
                emissiveColor: 0x00157a,
                innerWallColor: 0x0028d6,
                innerColor: 0xff0818,
                innerEmissive: 0x80000a,
                themeGrainColor: 0x9aa8f8,
                themeGrainEmissive: 0x5c6bc0,
                shadowCore: 'rgba(55, 110, 255, 0.34)',
                shadowMid: 'rgba(20, 65, 245, 0.16)',
                shadowOuter: 'rgba(0, 40, 220, 0.04)'
            });

            // Несинхронизированные гармоники для хаотичного вращения по всем осям и дрейфа на 5–30 пикселей
            const motionProfiles = {
                red: {
                    rotX: { baseSpeed: 0.34, f1: 0.61, a1: 0.55, f2: 1.37, a2: 0.32, f3: 2.11, a3: 0.16, phase: 0.4 },
                    rotY: { baseSpeed: -0.46, f1: 0.73, a1: 0.62, f2: 1.19, a2: 0.28, f3: 1.87, a3: 0.18, phase: 1.7 },
                    rotZ: { baseSpeed: 0.27, f1: 0.53, a1: 0.48, f2: 1.49, a2: 0.26, f3: 2.33, a3: 0.14, phase: 2.9 },
                    driftX: { f1: 0.71, f2: 1.29, ampPx: 22, phase: 0.2 },
                    driftY: { f1: 0.89, f2: 1.51, ampPx: 26, phase: 1.3 },
                    driftZ: { f1: 0.63, f2: 1.13, ampPx: 14, phase: 2.5 }
                },
                blue: {
                    rotX: { baseSpeed: -0.39, f1: 0.67, a1: 0.58, f2: 1.27, a2: 0.30, f3: 1.99, a3: 0.17, phase: 2.1 },
                    rotY: { baseSpeed: 0.42, f1: 0.59, a1: 0.64, f2: 1.43, a2: 0.31, f3: 2.23, a3: 0.15, phase: 0.8 },
                    rotZ: { baseSpeed: -0.31, f1: 0.79, a1: 0.50, f2: 1.31, a2: 0.24, f3: 1.73, a3: 0.16, phase: 3.6 },
                    driftX: { f1: 0.83, f2: 1.41, ampPx: 24, phase: 1.9 },
                    driftY: { f1: 0.67, f2: 1.37, ampPx: 20, phase: 0.6 },
                    driftZ: { f1: 0.77, f2: 1.21, ampPx: 16, phase: 3.1 }
                }
            };

            const redAngles = { x: 0.2, y: 0.4, z: -0.15 };
            const blueAngles = { x: -0.25, y: -0.35, z: 0.18 };

            // Вспомогательные переиспользуемые векторы и матрицы
            const _invQuat = new THREE.Quaternion();
            const _gravityLocal = new THREE.Vector3();
            const _accelWorld = new THREE.Vector3();
            const _accelLocal = new THREE.Vector3();
            const _targetWorldPos = new THREE.Vector3();
            const _leftWorldCenter = new THREE.Vector3();
            const _rightWorldCenter = new THREE.Vector3();
            const _rimWorldPos = new THREE.Vector3();
            const _grainDummy = new THREE.Object3D();
            const _tempColor = new THREE.Color();
            const _origEmissive = new THREE.Color();
            const _themeEmissive = new THREE.Color();
            const _worldVec = new THREE.Vector3();

            function pixelsToWorldUnits(px) {
                const dist = camera.position.z;
                const vFovRad = THREE.MathUtils.degToRad(camera.fov);
                const visibleHeight = 2 * Math.tan(vFovRad / 2) * dist;
                return (px / Math.max(window.innerHeight, 1)) * visibleHeight;
            }

            // Целевые координаты левого нижнего угла и масштаб (~200px ширины)
            function getCornerDockTransform() {
                const dist = camera.position.z;
                const vFovRad = THREE.MathUtils.degToRad(camera.fov);
                const visibleHeight = 2 * Math.tan(vFovRad / 2) * dist;
                const visibleWidth = visibleHeight * camera.aspect;
                const pxPerUnit = window.innerWidth / visibleWidth;

                const targetPixelWidth = Math.min(200, window.innerWidth * 0.34);
                const capsuleWorldWidth = 2.36;
                const scale = THREE.MathUtils.clamp(targetPixelWidth / (capsuleWorldWidth * pxPerUnit), 0.24, 0.56);

                const marginX = pixelsToWorldUnits(Math.min(130, window.innerWidth * 0.17));
                const marginY = pixelsToWorldUnits(Math.min(86, window.innerHeight * 0.13));

                return {
                    x: -visibleWidth * 0.5 + marginX,
                    y: -visibleHeight * 0.5 + marginY,
                    z: 0.45,
                    scale
                };
            }

            // Целевые координаты правого верхнего угла для второй капсулы (отступ от верха 50px)
            function getTopRightDockTransform() {
                const dist = camera.position.z;
                const vFovRad = THREE.MathUtils.degToRad(camera.fov);
                const visibleHeight = 2 * Math.tan(vFovRad / 2) * dist;
                const visibleWidth = visibleHeight * camera.aspect;
                const pxPerUnit = window.innerWidth / visibleWidth;

                const targetPixelWidth = Math.min(200, window.innerWidth * 0.34);
                const capsuleWorldWidth = 2.36;
                const scale = THREE.MathUtils.clamp(targetPixelWidth / (capsuleWorldWidth * pxPerUnit), 0.24, 0.56);

                const halfHeightPx = (1.04 * scale * pxPerUnit) * 0.5;
                const halfWidthPx = (capsuleWorldWidth * scale * pxPerUnit) * 0.5;
                const marginTop = pixelsToWorldUnits(50 + halfHeightPx);
                const marginRight = pixelsToWorldUnits(32 + halfWidthPx);

                return {
                    x: visibleWidth * 0.5 - marginRight,
                    y: visibleHeight * 0.5 - marginTop,
                    z: 0.45,
                    scale
                };
            }

            function getOffscreenBottomY() {
                const dist = camera.position.z;
                const vFovRad = THREE.MathUtils.degToRad(camera.fov);
                const visibleHeight = 2 * Math.tan(vFovRad / 2) * dist;
                return -visibleHeight * 0.5 - 0.9;
            }

            // Адаптивное базовое расположение капсул для мобильных и десктопов
            function updateResponsiveBasePositions() {
                const isNarrow = window.innerWidth < 680;
                if (isNarrow) {
                    redPill.baseX = 0;
                    redPill.baseY = 0.88;
                    bluePill.baseX = 0;
                    bluePill.baseY = -0.78;
                    camera.position.z = 9.4;
                } else {
                    redPill.baseX = -1.72;
                    redPill.baseY = 0.08;
                    bluePill.baseX = 1.72;
                    bluePill.baseY = 0.08;
                    camera.position.z = 7.6;
                }
            }
            updateResponsiveBasePositions();

            /* ==========================================================================
               СБОРКА СТРАНИЦЫ ИЗ ФРАГМЕНТОВ (РОЛЬ «UI-ИНЖЕНЕР ИНТЕГРАЦИИ»)
               Снимаем реальную раскладку страницы One / Dope (getBoundingClientRect +
               computed-стили) и раздаём фрагментам координаты, размеры и цвета —
               поэтому высыпающееся содержимое складывается в копию страницы.
               ========================================================================== */

            function forEachFrag(pillObj, fn) {
                for (let i = 0; i < pillObj.boxFrags.length; i++) fn(pillObj.boxFrags[i]);
                for (let i = 0; i < pillObj.dotFrags.length; i++) fn(pillObj.dotFrags[i]);
            }

            function writeFragInstance(mesh, i, f, pillScale) {
                _grainDummy.position.copy(f.worldPos);
                _grainDummy.rotation.set(f.rot.x, f.rot.y, f.rot.z);
                _grainDummy.scale.set(
                    Math.max(0.0001, f.curScale.x * pillScale),
                    Math.max(0.0001, f.curScale.y * pillScale),
                    Math.max(0.0001, f.curScale.z * pillScale)
                );
                _grainDummy.updateMatrix();
                mesh.setMatrixAt(i, _grainDummy.matrix);
            }

            function writeFragColor(mesh, i, f) {
                _tempColor.copy(f.origColor).lerp(f.targetColor, f.colorMix);
                mesh.setColorAt(i, _tempColor);
            }

            function cssColorToRgb(str) {
                const m = /rgba?\(([^)]+)\)/.exec(str || '');
                if (!m) return null;
                const parts = m[1].split(',').map(function (s) { return parseFloat(s); });
                if (parts.length < 3 || parts.slice(0, 3).some(function (v) { return !isFinite(v); })) return null;
                return {
                    r: parts[0] / 255,
                    g: parts[1] / 255,
                    b: parts[2] / 255,
                    a: parts.length > 3 && isFinite(parts[3]) ? parts[3] : 1
                };
            }

            function makePxSlot(kind, left, top, w, h, color, z) {
                return {
                    kind: kind,
                    pxLeft: left,
                    pxTop: top,
                    wPx: w,
                    hPx: h,
                    cx: left + w / 2,
                    cy: top + h / 2,
                    z: z,
                    color: new THREE.Color(
                        THREE.MathUtils.clamp(color.r, 0, 1),
                        THREE.MathUtils.clamp(color.g, 0, 1),
                        THREE.MathUtils.clamp(color.b, 0, 1)
                    ),
                    index: 0,
                    pos: new THREE.Vector3(),
                    scale: new THREE.Vector3()
                };
            }

            // Перевод экранных пикселей в мировые координаты на плоскости сборки страницы
            function projectSlotToWorld(slot) {
                const dist = Math.max(0.5, camera.position.z - slot.z);
                const visH = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) * 0.5) * dist;
                const visW = visH * camera.aspect;
                slot.pos.set(
                    (slot.cx / window.innerWidth - 0.5) * visW,
                    (0.5 - slot.cy / window.innerHeight) * visH,
                    slot.z
                );
                const w = (slot.wPx / window.innerHeight) * visH;
                const h = (slot.hPx / window.innerHeight) * visH;
                if (slot.kind === 'dot') {
                    const d = Math.max(0.02, Math.min(w, h)) * 0.5;
                    slot.scale.set(d, d, d * 0.34);
                } else {
                    slot.scale.set(
                        Math.max(0.02, w),
                        Math.max(0.013, h),
                        slot.kind === 'panel' ? 0.05 : 0.034
                    );
                }
            }

            // Съём реальной раскладки страницы: каждый элемент с data-frag становится слотом
            function computePageSlots(which) {
                const pageEl = which === 'red' ? pageOneEl : pageDopeEl;
                const isRed = which === 'red';
                const slots = [];

                pageEl.classList.add('is-measuring');
                if (which === 'blue') pageEl.scrollTop = 0;

                const vw = window.innerWidth;
                const vh = window.innerHeight;
                const els = pageEl.querySelectorAll('[data-frag]');

                for (let q = 0; q < els.length; q++) {
                    const el = els[q];
                    const kind = el.getAttribute('data-frag');
                    const r = el.getBoundingClientRect();
                    if (r.width < 5 || r.height < 5) continue;
                    if (r.bottom < -30 || r.top > vh + 30) continue;

                    const cs = getComputedStyle(el);
                    const bg = cssColorToRgb(cs.backgroundColor);
                    const fg = cssColorToRgb(cs.color);

                    const rect = {
                        left: Math.max(0, Math.min(r.left, vw)),
                        top: Math.max(0, Math.min(r.top, vh)),
                        width: Math.min(r.width, vw),
                        height: Math.min(r.height, vh)
                    };

                    if (kind === 'panel') {
                        const col = (bg && bg.a > 0.15)
                            ? bg
                            : (isRed ? { r: 0.04, g: 0.14, b: 0.08, a: 1 } : { r: 1, g: 1, b: 1, a: 1 });
                        // Крупные панели режем на плитки, чтобы карточка собиралась из кусков
                        const cols = THREE.MathUtils.clamp(Math.round(rect.width / 240), 1, 3);
                        const rows = THREE.MathUtils.clamp(Math.round(rect.height / 190), 1, 3);
                        const gap = 3;
                        for (let ty = 0; ty < rows; ty++) {
                            for (let tx = 0; tx < cols; tx++) {
                                const w = rect.width / cols;
                                const h = rect.height / rows;
                                slots.push(makePxSlot('panel',
                                    rect.left + tx * w + gap * 0.5,
                                    rect.top + ty * h + gap * 0.5,
                                    w - gap, h - gap, col, FRAG_Z_PLANE - 0.04));
                            }
                        }
                    } else if (kind === 'chip') {
                        const col = (bg && bg.a > 0.2)
                            ? bg
                            : (fg && fg.a > 0.2)
                                ? fg
                                : (isRed ? { r: 0.29, g: 0.86, b: 0.5, a: 1 } : { r: 0.55, g: 0.6, b: 0.95, a: 1 });
                        slots.push(makePxSlot('chip',
                            rect.left, rect.top + rect.height * 0.08,
                            rect.width, rect.height * 0.84, col, FRAG_Z_PLANE));
                    } else if (kind === 'dot') {
                        const size = Math.min(rect.width, rect.height);
                        const col = (bg && bg.a > 0.15)
                            ? bg
                            : (isRed ? { r: 0.49, g: 0.98, b: 0.64, a: 1 } : { r: 0.49, g: 0.6, b: 0.92, a: 1 });
                        slots.push(makePxSlot('dot',
                            rect.left + (rect.width - size) / 2,
                            rect.top + (rect.height - size) / 2,
                            size, size, col, FRAG_Z_PLANE + 0.04));
                    } else {
                        // Строки текста: делим высоту блока на строчки и кладём «плашки строк»
                        const col = (fg && fg.a > 0.2)
                            ? fg
                            : (isRed ? { r: 0.62, g: 0.95, b: 0.72, a: 1 } : { r: 0.4, g: 0.46, b: 0.6, a: 1 });
                        const lhCss = parseFloat(cs.lineHeight);
                        const fsCss = parseFloat(cs.fontSize) || 13;
                        const lineH = isFinite(lhCss) && lhCss > 2 ? lhCss : fsCss * 1.5;
                        const n = THREE.MathUtils.clamp(Math.round(rect.height / lineH), 1, 6);
                        const align = cs.textAlign;
                        for (let li = 0; li < n; li++) {
                            const isLast = li === n - 1 && n > 1;
                            const wFrac = isLast ? 0.45 + Math.random() * 0.35 : 0.82 + Math.random() * 0.16;
                            const wPx = rect.width * Math.min(1, wFrac);
                            let lx = rect.left;
                            if (align === 'center') lx = rect.left + (rect.width - wPx) / 2;
                            else if (align === 'right' || align === 'end') lx = rect.left + rect.width - wPx;
                            const rowH = rect.height / n;
                            const hPx = Math.min(lineH * 0.32, rowH * 0.62);
                            slots.push(makePxSlot('line',
                                lx, rect.top + (li + 0.5) * rowH - hPx / 2,
                                wPx, hPx, col, FRAG_Z_PLANE + 0.02));
                        }
                    }
                }

                pageEl.classList.remove('is-measuring');

                // Сборка сверху вниз: сначала «проявляется» шапка, затем контент
                slots.sort(function (a, b) { return (a.pxTop - b.pxTop) || (a.pxLeft - b.pxLeft); });
                for (let i = 0; i < slots.length; i++) {
                    slots[i].index = i;
                    projectSlotToWorld(slots[i]);
                }
                return slots;
            }

            // Запасной макет, если разметку страницы измерить не удалось
            function fallbackPageSlots(which, isDot) {
                const isRed = which === 'red';
                const slots = [];
                const cx = window.innerWidth / 2;
                if (isDot) {
                    slots.push(makePxSlot('dot', cx - 40, 110, 80, 80,
                        isRed ? { r: 0.49, g: 0.98, b: 0.64, a: 1 } : { r: 0.49, g: 0.6, b: 0.92, a: 1 },
                        FRAG_Z_PLANE + 0.04));
                } else {
                    const colW = Math.min(560, window.innerWidth * 0.86);
                    const x = cx - colW / 2;
                    let y = window.innerHeight * 0.2;
                    const surf = isRed ? { r: 0.04, g: 0.14, b: 0.08, a: 1 } : { r: 1, g: 1, b: 1, a: 1 };
                    const txt = isRed ? { r: 0.62, g: 0.95, b: 0.72, a: 1 } : { r: 0.4, g: 0.46, b: 0.6, a: 1 };
                    for (let k = 0; k < 3; k++) {
                        const h = 92 + k * 12;
                        slots.push(makePxSlot('panel', x, y, colW, h, surf, FRAG_Z_PLANE - 0.04));
                        slots.push(makePxSlot('line', x + 22, y + 24, colW * 0.58, 9, txt, FRAG_Z_PLANE + 0.02));
                        slots.push(makePxSlot('line', x + 22, y + 44, colW * 0.4, 9, txt, FRAG_Z_PLANE + 0.02));
                        y += h + 26;
                    }
                }
                for (let i = 0; i < slots.length; i++) {
                    slots[i].index = i;
                    projectSlotToWorld(slots[i]);
                }
                return slots;
            }

            function assignFragSet(set, slots) {
                for (let i = 0; i < set.length; i++) {
                    const f = set[i];
                    const slot = slots[i % slots.length];
                    const dup = Math.floor(i / slots.length);
                    f.slotIdx = slot.index;
                    f.targetColor.copy(slot.color);
                    if (dup === 0) {
                        // Первый проход — точные куски страницы в натуральную величину
                        f.targetPos.copy(slot.pos);
                        f.targetScale.copy(slot.scale);
                    } else {
                        // Повторные проходы — мелкие осколки внутри того же блока
                        f.targetPos.set(
                            slot.pos.x + (Math.random() - 0.5) * slot.scale.x * 0.72,
                            slot.pos.y + (Math.random() - 0.5) * slot.scale.y * 0.72,
                            slot.pos.z + 0.012 * dup
                        );
                        const shard = 0.22 + Math.random() * 0.26;
                        f.targetScale.set(
                            Math.max(0.02, slot.scale.x * shard),
                            Math.max(0.012, slot.scale.y * shard * (0.8 + Math.random() * 0.6)),
                            slot.scale.z
                        );
                    }
                    f.assembleDelay = f.pourDelay + 0.5 + Math.random() * 0.5 + slot.index * 0.006 + dup * 0.1;
                    f.assembleDur = 0.68 + Math.random() * 0.42;
                    f.fadeDelay = slot.index * 0.004 + Math.random() * 0.14;
                }
            }

            function assignFragmentsToPage(pillObj) {
                const slots = computePageSlots(pillObj.id);
                const boxSlots = [];
                const dotSlots = [];
                for (let i = 0; i < slots.length; i++) {
                    (slots[i].kind === 'dot' ? dotSlots : boxSlots).push(slots[i]);
                }
                assignFragSet(pillObj.boxFrags, boxSlots.length ? boxSlots : fallbackPageSlots(pillObj.id, false));
                assignFragSet(pillObj.dotFrags, dotSlots.length ? dotSlots : fallbackPageSlots(pillObj.id, true));
            }

            // Проявление настоящей страницы, когда фрагменты заняли свои места
            function revealPageForPill(pillObj) {
                if (pillObj.pageRevealed) return;
                pillObj.pageRevealed = true;
                pillObj.revealTimer = 0;
                if (activeWorldTheme === pillObj.id) {
                    if (pageRevealTimer) {
                        clearTimeout(pageRevealTimer);
                        pageRevealTimer = null;
                    }
                    showPageStage(pillObj.id);
                }
            }

            // Удержание гранулы внутри закрытой капсулы
            function constrainGrainInsideCapsule(g, maxRadius, halfCylLen) {
                const rLimit = Math.max(0.04, maxRadius - g.radius);
                const absX = Math.abs(g.pos.x);

                if (absX <= halfCylLen) {
                    const radial = Math.hypot(g.pos.y, g.pos.z);
                    if (radial > rLimit) {
                        const scale = rLimit / radial;
                        g.pos.y *= scale;
                        g.pos.z *= scale;
                        const ny = g.pos.y / rLimit;
                        const nz = g.pos.z / rLimit;
                        const vn = g.vel.y * ny + g.vel.z * nz;
                        if (vn > 0) {
                            g.vel.y -= 1.15 * vn * ny;
                            g.vel.z -= 1.15 * vn * nz;
                        }
                    }
                } else {
                    const signX = Math.sign(g.pos.x);
                    const dx = g.pos.x - signX * halfCylLen;
                    const distFromSphereCenter = Math.hypot(dx, g.pos.y, g.pos.z);
                    if (distFromSphereCenter > rLimit) {
                        const nx = dx / distFromSphereCenter;
                        const ny = g.pos.y / distFromSphereCenter;
                        const nz = g.pos.z / distFromSphereCenter;

                        g.pos.x = signX * halfCylLen + nx * rLimit;
                        g.pos.y = ny * rLimit;
                        g.pos.z = nz * rLimit;

                        const vn = g.vel.x * nx + g.vel.y * ny + g.vel.z * nz;
                        if (vn > 0) {
                            g.vel.x -= 1.15 * vn * nx;
                            g.vel.y -= 1.15 * vn * ny;
                            g.vel.z -= 1.15 * vn * nz;
                        }
                    }
                }
            }

            // ================= СЦЕНАРИИ СОСТОЯНИЙ =================

            // 1. Клик по закрытой капсуле -> перемещение в центр, раскрытие и поэтапное высыпание
            function openPill(pillObj, angles) {
                if (pillObj.state !== 'closed') return;

                // Если другая капсула активна или в углу — запускаем её засасывание на месте без пересечения с центром
                const otherPill = pillObj === redPill ? bluePill : redPill;
                const otherAngles = pillObj === redPill ? blueAngles : redAngles;
                if (otherPill.state === 'open') {
                    const dockInfo = getCornerDockTransform();
                    const distToCenter = Math.hypot(otherPill.group.position.x, otherPill.group.position.y - 0.32);
                    if (distToCenter < 1.9) {
                        otherPill.collectAnchor.set(dockInfo.x, dockInfo.y, dockInfo.z);
                        otherPill.collectScale = dockInfo.scale;
                    } else {
                        otherPill.collectAnchor.copy(otherPill.group.position);
                        otherPill.collectScale = otherPill.curScale;
                    }
                    startCollectingPill(otherPill, otherAngles, true);
                } else if (otherPill.state === 'dock_closing' || otherPill.state === 'docked') {
                    const dockInfo = getCornerDockTransform();
                    const distToCenter = Math.hypot(otherPill.group.position.x, otherPill.group.position.y - 0.32);
                    if (distToCenter < 1.9) {
                        otherPill.collectAnchor.set(dockInfo.x, dockInfo.y, dockInfo.z);
                        otherPill.collectScale = dockInfo.scale;
                    } else {
                        otherPill.collectAnchor.copy(otherPill.group.position);
                        otherPill.collectScale = otherPill.curScale;
                    }
                    startUndockPill(otherPill, otherAngles, true);
                }

                pillObj.collectInPlace = false;
                pillObj.state = 'open';
                pillObj.openTimer = 0;
                pillObj.themeTriggered = false;

                angles.x = Math.atan2(Math.sin(angles.x), Math.cos(angles.x));
                angles.y = Math.atan2(Math.sin(angles.y), Math.cos(angles.y));
                angles.z = Math.atan2(Math.sin(angles.z), Math.cos(angles.z));

                forEachFrag(pillObj, function (f) {
                    f.halfSide = f.pos.x < 0 ? -1 : 1;
                    f.spilled = false;
                    f.hidden = false;
                    f.arrived = false;
                    f.assembleP = 0;
                    f.fadeP = 0;
                    f.colorMix = 0;
                    f.curScale.copy(f.baseScale);
                    // Поэтапное сползание в 4 волны: ближние к срезу высыпаются первыми
                    const depth = Math.min(1, Math.abs(f.pos.x) / 0.85);
                    const stage = Math.floor(depth * 3.6);
                    f.pourDelay = stage * 0.34 + Math.random() * 0.22;
                });
                pillObj.pageRevealed = false;
                pillObj.revealTimer = 0;
                // Раздаём фрагментам адреса на странице: куда лететь и чем стать
                assignFragmentsToPage(pillObj);
                updateResetButtonVisibility();
            }

            // 2. Повторный клик по капсуле в левом нижнем углу -> возврат в центр (или раскрытие на месте при переключении)
            function startUndockPill(pillObj, angles, inPlace = false) {
                if (pillObj.state !== 'docked' && pillObj.state !== 'dock_closing') return;

                if (activeWorldTheme === pillObj.id) {
                    applyWorldTheme('default');
                }

                pillObj.collectInPlace = inPlace;
                pillObj.state = 'undocking';
                pillObj.undockTimer = 0;

                angles.x = Math.atan2(Math.sin(angles.x), Math.cos(angles.x));
                angles.y = Math.atan2(Math.sin(angles.y), Math.cos(angles.y));
                angles.z = Math.atan2(Math.sin(angles.z), Math.cos(angles.z));
                updateResetButtonVisibility();
            }

            // 3. Засасывание содержимого нижней половинкой капсулы в несколько этапов
            function startCollectingPill(pillObj, angles, inPlace = false) {
                if (pillObj.state !== 'open' && pillObj.state !== 'undocking') return;
                pillObj.group.updateMatrixWorld(true);

                if (activeWorldTheme === pillObj.id) {
                    applyWorldTheme('default');
                }

                pillObj.collectInPlace = inPlace;

                // Определяем половинку, которая ближе к низу экрана
                _leftWorldCenter.set(-0.45, 0, 0).applyMatrix4(pillObj.leftHalf.matrixWorld);
                _rightWorldCenter.set(0.45, 0, 0).applyMatrix4(pillObj.rightHalf.matrixWorld);
                pillObj.suctionSide = (_leftWorldCenter.y <= _rightWorldCenter.y) ? -1 : 1;

                pillObj.state = 'collecting';
                pillObj.collectTimer = 0;
                pillObj.closingProgress = 0;

                angles.x = Math.atan2(Math.sin(angles.x), Math.cos(angles.x));
                angles.y = Math.atan2(Math.sin(angles.y), Math.cos(angles.y));
                angles.z = Math.atan2(Math.sin(angles.z), Math.cos(angles.z));

                const offscreenY = getOffscreenBottomY();
                const sSide = pillObj.suctionSide;
                const wasRevealed = pillObj.pageRevealed;

                forEachFrag(pillObj, function (f) {
                    const depthFrac = Math.random();
                    const lx = sSide * (0.06 + depthFrac * 0.78);
                    const maxR = Math.max(0.05, 0.35 - f.radius);
                    const ang = Math.random() * Math.PI * 2;
                    const dist = Math.sqrt(Math.random()) * maxR;

                    f.halfSide = sSide;
                    f.pos.set(lx, Math.sin(ang) * dist, Math.cos(ang) * dist);
                    f.vel.set(0, 0, 0);

                    // 4 последовательные волны обратного засасывания
                    const wave = 3 - Math.floor(depthFrac * 3.4);
                    f.collectDelay = wave * 0.32 + Math.random() * 0.2;
                    f.rotVel.set((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4);

                    if (f.spilled || f.hidden) {
                        if (f.hidden && wasRevealed) {
                            // Фрагмент «отклеивается» от страницы со своего собранного места —
                            // страница как будто рассыпается обратно в капсулу
                            f.worldPos.copy(f.targetPos);
                            f.curScale.copy(f.targetScale).multiplyScalar(0.9);
                        } else if (f.hidden || f.worldPos.y < offscreenY - 0.8 || inPlace) {
                            const spreadX = inPlace ? 0.55 : 1.1;
                            const spreadZ = inPlace ? 0.4 : 0.7;
                            f.worldPos.y = offscreenY - 0.2 - wave * 0.6 - Math.random() * 0.8;
                            f.worldPos.x = pillObj.group.position.x + (Math.random() - 0.5) * spreadX;
                            f.worldPos.z = pillObj.group.position.z + (Math.random() - 0.5) * spreadZ;
                            f.curScale.copy(f.baseScale);
                        }
                        f.spilled = true;
                        f.hidden = false;
                        f.fadeP = 0;
                        f.assembleP = 0;
                        f.arrived = false;
                        f.worldVel.set(0, 0, 0);
                    }
                });
                pillObj.pageRevealed = false;
                pillObj.revealTimer = 0;
                updateResetButtonVisibility();
            }

            function resetPill(pillObj, angles) {
                if (pillObj.state === 'open') {
                    startCollectingPill(pillObj, angles);
                } else if (pillObj.state === 'dock_closing' || pillObj.state === 'docked') {
                    startUndockPill(pillObj, angles);
                }
            }

            // ================= ОСНОВНОЙ ШАГ ФИЗИКИ И АНИМАЦИИ КАПСУЛЫ =================
            function stepPillAnimation(pillObj, motion, angles, dt, t) {
                const smoothLerp = 1 - Math.exp(-5.5 * dt);

                pillObj.angularVelImpulse.multiplyScalar(Math.exp(-2.8 * dt));
                pillObj.clickImpulse.multiplyScalar(Math.exp(-3.5 * dt));

                let omegaX = 0;
                let omegaY = 0;
                let omegaZ = 0;
                let targetScale = 1.0;

                // Небольшие хаотичные сдвиги 5–30 пикселей
                const driftX = pixelsToWorldUnits(
                    Math.sin(t * motion.driftX.f1 + motion.driftX.phase) * motion.driftX.ampPx * 0.65 +
                    Math.cos(t * motion.driftX.f2 + motion.driftX.phase * 1.3) * motion.driftX.ampPx * 0.35
                ) * MOTION_SCALE;
                const driftY = pixelsToWorldUnits(
                    Math.cos(t * motion.driftY.f1 + motion.driftY.phase) * motion.driftY.ampPx * 0.65 +
                    Math.sin(t * motion.driftY.f2 + motion.driftY.phase * 0.9) * motion.driftY.ampPx * 0.35
                ) * MOTION_SCALE;
                const driftZ = pixelsToWorldUnits(
                    Math.sin(t * motion.driftZ.f1 + motion.driftZ.phase) * motion.driftZ.ampPx
                ) * MOTION_SCALE;

                // Определяем целевую позицию капсулы в зависимости от состояния
                let targetPosX = pillObj.baseX + driftX;
                let targetPosY = pillObj.baseY + driftY;
                let targetPosZ = pillObj.baseZ + driftZ;

                if (pillObj.state === 'open') {
                    // В центре экрана (чуть выше центра для удобного высыпания вниз)
                    targetPosX = driftX * 0.25;
                    targetPosY = 0.32 + driftY * 0.25;
                    targetPosZ = 0.35;
                } else if (pillObj.state === 'undocking' || pillObj.state === 'collecting' || pillObj.state === 'closing') {
                    if (pillObj.collectInPlace) {
                        // Засасывание и закрытие на текущей позиции без перелёта в центр
                        targetPosX = pillObj.collectAnchor.x + driftX * 0.16;
                        targetPosY = pillObj.collectAnchor.y + driftY * 0.16;
                        targetPosZ = pillObj.collectAnchor.z;
                        targetScale = pillObj.collectScale;
                    } else {
                        targetPosX = driftX * 0.25;
                        targetPosY = 0.32 + driftY * 0.25;
                        targetPosZ = 0.35;
                    }
                } else if (pillObj.state === 'dock_closing' || pillObj.state === 'docked') {
                    const dockInfo = getCornerDockTransform();
                    targetPosX = dockInfo.x + driftX * 0.16;
                    targetPosY = dockInfo.y + driftY * 0.16;
                    targetPosZ = dockInfo.z;
                    targetScale = dockInfo.scale;
                }

                // Если другая капсула активна, вторая (закрытая) капсула улетает в правый верхний угол (50px от верха)
                const otherPill = pillObj === redPill ? bluePill : redPill;
                const isParkedTopRight = pillObj.state === 'closed' && otherPill.state !== 'closed';
                if (isParkedTopRight) {
                    const topRightInfo = getTopRightDockTransform();
                    targetPosX = topRightInfo.x + driftX * 0.16;
                    targetPosY = topRightInfo.y + driftY * 0.16;
                    targetPosZ = topRightInfo.z;
                    targetScale = topRightInfo.scale;

                    // Если капсула перелетает из левого нижнего угла в правый верхний, огибаем центр по верхней дуге
                    const otherInCenter = otherPill.state === 'open' ||
                        ((otherPill.state === 'undocking' || otherPill.state === 'collecting' || otherPill.state === 'closing') && !otherPill.collectInPlace);
                    if (otherInCenter && pillObj.group.position.x < 0.6 && pillObj.group.position.y < topRightInfo.y - 0.65) {
                        targetPosX = Math.min(pillObj.group.position.x, -1.6);
                    }
                }

                // Плавное движение позиции капсулы
                const posLerp = 1 - Math.exp(-4.6 * dt);
                pillObj.group.position.x += (targetPosX - pillObj.group.position.x) * posLerp;
                pillObj.group.position.y += (targetPosY - pillObj.group.position.y) * posLerp;
                pillObj.group.position.z += (targetPosZ - pillObj.group.position.z) * posLerp;

                // Вычисляем ускорение внешней оболочки для инерции сыпучего содержимого
                _accelWorld.subVectors(pillObj.group.position, pillObj.prevOuterPos).divideScalar(Math.max(dt, 0.001));
                const instantAccX = (_accelWorld.x - pillObj.outerVel.x) / Math.max(dt, 0.001);
                const instantAccY = (_accelWorld.y - pillObj.outerVel.y) / Math.max(dt, 0.001);
                const instantAccZ = (_accelWorld.z - pillObj.outerVel.z) / Math.max(dt, 0.001);
                pillObj.outerVel.copy(_accelWorld);
                pillObj.prevOuterPos.copy(pillObj.group.position);
                _accelWorld.set(
                    THREE.MathUtils.clamp(instantAccX, -18, 18),
                    THREE.MathUtils.clamp(instantAccY, -18, 18),
                    THREE.MathUtils.clamp(instantAccZ, -18, 18)
                );

                // Логика половинок и углов по состояниям
                if (pillObj.state === 'closed') {
                    pillObj.openProgress += (0 - pillObj.openProgress) * (1 - Math.exp(-4.5 * dt));

                    pillObj.leftHalf.position.lerp(_targetWorldPos.set(0, 0, 0), smoothLerp);
                    pillObj.leftHalf.rotation.set(
                        pillObj.leftHalf.rotation.x * (1 - smoothLerp),
                        pillObj.leftHalf.rotation.y * (1 - smoothLerp),
                        pillObj.leftHalf.rotation.z * (1 - smoothLerp)
                    );
                    pillObj.rightHalf.position.lerp(_targetWorldPos.set(0, 0, 0), smoothLerp);
                    pillObj.rightHalf.rotation.set(
                        pillObj.rightHalf.rotation.x * (1 - smoothLerp),
                        pillObj.rightHalf.rotation.y * (1 - smoothLerp),
                        pillObj.rightHalf.rotation.z * (1 - smoothLerp)
                    );

                    omegaX = (motion.rotX.baseSpeed +
                        Math.sin(t * motion.rotX.f1 + motion.rotX.phase) * motion.rotX.a1 +
                        Math.cos(t * motion.rotX.f2 + motion.rotX.phase * 1.4) * motion.rotX.a2 +
                        Math.sin(t * motion.rotX.f3) * motion.rotX.a3) +
                        pillObj.angularVelImpulse.x;

                    omegaY = (motion.rotY.baseSpeed +
                        Math.cos(t * motion.rotY.f1 + motion.rotY.phase) * motion.rotY.a1 +
                        Math.sin(t * motion.rotY.f2 + motion.rotY.phase * 0.8) * motion.rotY.a2 +
                        Math.cos(t * motion.rotY.f3) * motion.rotY.a3) +
                        pillObj.angularVelImpulse.y;

                    omegaZ = (motion.rotZ.baseSpeed +
                        Math.sin(t * motion.rotZ.f1 + motion.rotZ.phase) * motion.rotZ.a1 +
                        Math.cos(t * motion.rotZ.f2 + motion.rotZ.phase * 1.7) * motion.rotZ.a2 +
                        Math.sin(t * motion.rotZ.f3) * motion.rotZ.a3) +
                        pillObj.angularVelImpulse.z;

                    if (MOTION_SCALE !== 1) {
                        omegaX *= 0.55;
                        omegaY *= 0.55;
                        omegaZ *= 0.55;
                    }

                    angles.x += omegaX * dt;
                    angles.y += omegaY * dt;
                    angles.z += omegaZ * dt;

                } else if (pillObj.state === 'open') {
                    pillObj.openTimer += dt;
                    // Медленное раскрытие и наклон открытыми краями вниз
                    pillObj.openProgress += (1 - pillObj.openProgress) * (1 - Math.exp(-2.2 * dt));
                    const op = pillObj.openProgress;

                    // Лёгкая дрожь половинок во время высыпания — «физичность» тряски
                    const wobble = Math.sin(pillObj.openTimer * 5.4) * 0.022 * op * (1 - op * 0.55);

                    pillObj.leftHalf.position.set(-0.62 * op, -0.08 * op, 0);
                    pillObj.leftHalf.rotation.set(0.08 * op + wobble, 0.14 * op, -0.98 * op - wobble * 2);

                    pillObj.rightHalf.position.set(0.62 * op, -0.08 * op, 0);
                    pillObj.rightHalf.rotation.set(-0.08 * op - wobble, -0.14 * op, 0.98 * op + wobble * 2);

                    const orientBlend = 1 - Math.exp(-3.4 * dt);
                    const targetX = 0.16 + Math.sin(t * 0.9 + motion.rotX.phase) * 0.06;
                    const targetY = Math.sin(t * 0.65 + motion.rotY.phase) * 0.18;
                    const targetZ = Math.sin(t * 0.8 + motion.rotZ.phase) * 0.08;

                    angles.x += (targetX - angles.x) * orientBlend;
                    angles.y += (targetY - angles.y) * orientBlend;
                    angles.z += (targetZ - angles.z) * orientBlend;

                } else if (pillObj.state === 'dock_closing') {
                    pillObj.dockTimer += dt;
                    pillObj.openProgress += (0 - pillObj.openProgress) * (1 - Math.exp(-4.6 * dt));
                    const op = pillObj.openProgress;

                    pillObj.leftHalf.position.set(-0.62 * op, -0.08 * op, 0);
                    pillObj.leftHalf.rotation.set(0.08 * op, 0.14 * op, -0.98 * op);
                    pillObj.rightHalf.position.set(0.62 * op, -0.08 * op, 0);
                    pillObj.rightHalf.rotation.set(-0.08 * op, -0.14 * op, 0.98 * op);

                    const dockInfo = getCornerDockTransform();
                    targetScale = dockInfo.scale;

                    const orientBlend = 1 - Math.exp(-4.2 * dt);
                    angles.x += (0.14 - angles.x) * orientBlend;
                    angles.y += (0.18 - angles.y) * orientBlend;
                    angles.z += (-0.12 - angles.z) * orientBlend;

                    if (pillObj.dockTimer > 1.2 && Math.abs(pillObj.curScale - dockInfo.scale) < 0.03) {
                        pillObj.state = 'docked';
                    }

                } else if (pillObj.state === 'docked') {
                    pillObj.openProgress = 0;
                    pillObj.leftHalf.position.set(0, 0, 0);
                    pillObj.leftHalf.rotation.set(0, 0, 0);
                    pillObj.rightHalf.position.set(0, 0, 0);
                    pillObj.rightHalf.rotation.set(0, 0, 0);

                    const dockInfo = getCornerDockTransform();
                    targetScale = dockInfo.scale;

                    const orientBlend = 1 - Math.exp(-4.0 * dt);
                    angles.x += (0.16 + Math.sin(t * 1.1 + motion.rotX.phase) * 0.08 - angles.x) * orientBlend;
                    angles.y += (0.22 + Math.cos(t * 0.85 + motion.rotY.phase) * 0.14 - angles.y) * orientBlend;
                    angles.z += (-0.10 + Math.sin(t * 0.95 + motion.rotZ.phase) * 0.08 - angles.z) * orientBlend;

                } else if (pillObj.state === 'undocking') {
                    pillObj.undockTimer += dt;
                    targetScale = pillObj.collectInPlace ? pillObj.collectScale : 1.0;

                    const openTrigger = pillObj.collectInPlace
                        ? THREE.MathUtils.clamp(pillObj.undockTimer / 0.45, 0, 1)
                        : THREE.MathUtils.clamp((pillObj.undockTimer - 0.35) / 0.65, 0, 1);
                    pillObj.openProgress += (openTrigger - pillObj.openProgress) * (1 - Math.exp(-4.5 * dt));
                    const op = pillObj.openProgress;

                    pillObj.leftHalf.position.set(-0.62 * op, -0.08 * op, 0);
                    pillObj.leftHalf.rotation.set(0.08 * op, 0.14 * op, -0.98 * op);
                    pillObj.rightHalf.position.set(0.62 * op, -0.08 * op, 0);
                    pillObj.rightHalf.rotation.set(-0.08 * op, -0.14 * op, 0.98 * op);

                    const orientBlend = 1 - Math.exp(-4.8 * dt);
                    angles.x += (0.16 - angles.x) * orientBlend;
                    angles.y += (0 - angles.y) * orientBlend;
                    angles.z += (0 - angles.z) * orientBlend;

                    const scaleReady = pillObj.collectInPlace ? true : (pillObj.curScale > 0.92);
                    const undockDoneTime = pillObj.collectInPlace ? 0.55 : 1.0;
                    if (pillObj.undockTimer >= undockDoneTime && scaleReady) {
                        startCollectingPill(pillObj, angles, pillObj.collectInPlace);
                    }

                } else if (pillObj.state === 'collecting') {
                    pillObj.collectTimer += dt;
                    pillObj.openProgress += (1 - pillObj.openProgress) * (1 - Math.exp(-4.0 * dt));
                    const op = pillObj.openProgress;
                    const sSide = pillObj.suctionSide;

                    if (sSide === -1) {
                        // Левая (нижняя) половинка смотрит открытым срезом строго вниз и засасывает гранулы
                        pillObj.leftHalf.position.set(-0.22 * op, -0.10 * op, 0);
                        pillObj.leftHalf.rotation.set(0.05 * op, 0, -Math.PI * 0.5 * op);
                        // Правая половинка ждёт в стороне
                        pillObj.rightHalf.position.set(0.88 * op, 0.34 * op, 0);
                        pillObj.rightHalf.rotation.set(-0.12 * op, 0.18 * op, 0.42 * op);
                    } else {
                        // Правая (нижняя) половинка смотрит открытым срезом строго вниз и засасывает гранулы
                        pillObj.rightHalf.position.set(0.22 * op, -0.10 * op, 0);
                        pillObj.rightHalf.rotation.set(0.05 * op, 0, Math.PI * 0.5 * op);
                        // Левая половинка ждёт в стороне
                        pillObj.leftHalf.position.set(-0.88 * op, 0.34 * op, 0);
                        pillObj.leftHalf.rotation.set(-0.12 * op, -0.18 * op, -0.42 * op);
                    }

                    const orientBlend = 1 - Math.exp(-4.2 * dt);
                    angles.x += (0.12 - angles.x) * orientBlend;
                    angles.y += (0 - angles.y) * orientBlend;
                    angles.z += (0 - angles.z) * orientBlend;

                } else if (pillObj.state === 'closing') {
                    // Вторая половинка подлетает соосно, надевается и закручивается на 2 оборота
                    pillObj.closingProgress += dt * 0.72;
                    const c = Math.min(1, pillObj.closingProgress);
                    const ease = c < 0.5 ? 2 * c * c : 1 - Math.pow(-2 * c + 2, 2) / 2;
                    const op = 1 - ease;
                    pillObj.openProgress = op;
                    const sSide = pillObj.suctionSide;

                    const twist = (1 - ease) * Math.PI * 4.0;
                    const axialSlide = op * 0.78;

                    if (sSide === -1) {
                        pillObj.leftHalf.position.set(-0.22 * op, -0.10 * op, 0);
                        pillObj.leftHalf.rotation.set(0.05 * op, 0, -Math.PI * 0.5 * op);

                        pillObj.rightHalf.position.set(axialSlide, 0.18 * op, 0);
                        pillObj.rightHalf.rotation.set(twist, 0, 0.16 * op);
                    } else {
                        pillObj.rightHalf.position.set(0.22 * op, -0.10 * op, 0);
                        pillObj.rightHalf.rotation.set(0.05 * op, 0, Math.PI * 0.5 * op);

                        pillObj.leftHalf.position.set(-axialSlide, 0.18 * op, 0);
                        pillObj.leftHalf.rotation.set(twist, 0, -0.16 * op);
                    }

                    const orientBlend = 1 - Math.exp(-3.6 * dt);
                    angles.x += (0.14 - angles.x) * orientBlend;
                    angles.y += (0 - angles.y) * orientBlend;
                    angles.z += (0 - angles.z) * orientBlend;

                    if (c >= 1) {
                        pillObj.state = 'closed';
                        pillObj.collectInPlace = false;
                        pillObj.openProgress = 0;
                        pillObj.leftHalf.position.set(0, 0, 0);
                        pillObj.leftHalf.rotation.set(0, 0, 0);
                        pillObj.rightHalf.position.set(0, 0, 0);
                        pillObj.rightHalf.rotation.set(0, 0, 0);
                        updateResetButtonVisibility();
                    }
                }

                // Масштабирование капсулы
                const scaleLerp = 1 - Math.exp(-4.5 * dt);
                pillObj.curScale += (targetScale - pillObj.curScale) * scaleLerp;
                pillObj.group.scale.setScalar(pillObj.curScale);

                pillObj.group.rotation.set(angles.x, angles.y, angles.z);
                pillObj.group.updateMatrixWorld(true);

                // ================= ФИЗИКА ФРАГМЕНТОВ СТРАНИЦЫ =================
                const boxFrags = pillObj.boxFrags;
                const dotFrags = pillObj.dotFrags;
                const totalFrags = boxFrags.length + dotFrags.length;
                const innerMaxR = pillObj.radius - 0.085;
                const innerHalfCyl = pillObj.halfCylLen - 0.03;
                const offscreenY = getOffscreenBottomY();
                let boxesDirty = false;
                let dotsDirty = false;

                if (pillObj.state === 'closed') {
                    // Внутри закрытой капсулы фрагменты пересыпаются как крупный песок
                    _invQuat.copy(pillObj.group.quaternion).invert();
                    _gravityLocal.set(0, -13.5, 0).applyQuaternion(_invQuat);
                    _accelLocal.copy(_accelWorld).multiplyScalar(-0.75).applyQuaternion(_invQuat);

                    const subSteps = QUALITY.mobile ? 1 : 2;
                    const subDt = dt / subSteps;

                    for (let step = 0; step < subSteps; step++) {
                        for (let s = 0; s < 2; s++) {
                            const set = s === 0 ? boxFrags : dotFrags;
                            for (let i = 0; i < set.length; i++) {
                                const f = set[i];
                                f.vel.x += (_gravityLocal.x + _accelLocal.x) * subDt;
                                f.vel.y += (_gravityLocal.y + _accelLocal.y) * subDt;
                                f.vel.z += (_gravityLocal.z + _accelLocal.z) * subDt;

                                // Сухое трение и вязкое затухание
                                const damp = Math.exp(-3.4 * subDt);
                                f.vel.multiplyScalar(damp);

                                f.pos.addScaledVector(f.vel, subDt);
                                constrainGrainInsideCapsule(f, innerMaxR, innerHalfCyl);
                            }
                        }

                        // Лёгкое взаимное расталкивание соседей (только десктоп — экономим CPU на мобильных)
                        if (!QUALITY.mobile) {
                            for (let i = 0; i < boxFrags.length; i++) {
                                const a = boxFrags[i];
                                for (let j = i + 1; j < Math.min(boxFrags.length, i + 10); j++) {
                                    const b = boxFrags[j];
                                    const dx = b.pos.x - a.pos.x;
                                    const dy = b.pos.y - a.pos.y;
                                    const dz = b.pos.z - a.pos.z;
                                    const minDist = (a.radius + b.radius) * 0.96;
                                    const d2 = dx * dx + dy * dy + dz * dz;
                                    if (d2 > 0.00001 && d2 < minDist * minDist) {
                                        const d = Math.sqrt(d2);
                                        const push = (minDist - d) * 0.42 / d;
                                        a.pos.x -= dx * push;
                                        a.pos.y -= dy * push;
                                        a.pos.z -= dz * push;
                                        b.pos.x += dx * push;
                                        b.pos.y += dy * push;
                                        b.pos.z += dz * push;
                                    }
                                }
                            }
                        }
                    }

                    // Плавное возвращение свечения фрагментов к исходному
                    _origEmissive.setHex(pillObj.innerEmissive);
                    pillObj.fragMat.emissive.lerp(_origEmissive, 1 - Math.exp(-5 * dt));

                    for (let s = 0; s < 2; s++) {
                        const set = s === 0 ? boxFrags : dotFrags;
                        const mesh = s === 0 ? pillObj.fragBoxes : pillObj.fragDots;
                        for (let i = 0; i < set.length; i++) {
                            const f = set[i];
                            f.worldPos.copy(f.pos).applyMatrix4(pillObj.group.matrixWorld);
                            f.curScale.copy(f.baseScale);
                            writeFragInstance(mesh, i, f, pillObj.curScale);

                            if (f.colorMix > 0.001) {
                                f.colorMix = Math.max(0, f.colorMix - dt * 2.5);
                                writeFragColor(mesh, i, f);
                                if (s === 0) boxesDirty = true; else dotsDirty = true;
                            }
                        }
                    }

                } else if (pillObj.state === 'open') {
                    // Фазы жизни фрагмента: сползание к срезу -> высыпание с кувырканием ->
                    // полёт на своё место в раскладке страницы -> растворение в настоящем контенте
                    let spilledCount = 0;
                    let assembledCount = 0;
                    let fadedCount = 0;

                    _themeEmissive.setHex(pillObj.themeGrainEmissive);
                    pillObj.fragMat.emissive.lerp(_themeEmissive, 1 - Math.exp(-2.2 * dt));

                    if (pillObj.pageRevealed) pillObj.revealTimer += dt;

                    for (let s = 0; s < 2; s++) {
                        const set = s === 0 ? boxFrags : dotFrags;
                        const mesh = s === 0 ? pillObj.fragBoxes : pillObj.fragDots;

                        for (let i = 0; i < set.length; i++) {
                            const f = set[i];
                            const halfObj = f.halfSide === -1 ? pillObj.leftHalf : pillObj.rightHalf;

                            if (!f.spilled) {
                                if (pillObj.openTimer >= f.pourDelay && pillObj.openProgress > 0.25) {
                                    // Фрагмент скользит по внутренней стенке своей половинки к открытому срезу (x -> 0)
                                    const slideSpeed = 1.65 + (pillObj.openTimer - f.pourDelay) * 1.4;
                                    f.pos.x -= Math.sign(f.pos.x || f.halfSide) * slideSpeed * dt;
                                    f.pos.y *= Math.exp(-1.5 * dt);
                                    f.pos.z *= Math.exp(-1.5 * dt);

                                    // Достигнув открытого ободка — высыпается наружу в мировые координаты
                                    if (Math.abs(f.pos.x) <= 0.05) {
                                        f.spilled = true;
                                        f.worldPos.copy(f.pos).applyMatrix4(halfObj.matrixWorld);
                                        f.worldVel.set(
                                            (Math.random() - 0.5) * 0.9,
                                            -0.55 - Math.random() * 0.7,
                                            (Math.random() - 0.5) * 0.7
                                        );
                                        f.rotVel.set(
                                            (Math.random() - 0.5) * 7,
                                            (Math.random() - 0.5) * 7,
                                            (Math.random() - 0.5) * 7
                                        );
                                    }
                                }
                                if (!f.spilled) {
                                    f.worldPos.copy(f.pos).applyMatrix4(halfObj.matrixWorld);
                                }
                            }

                            if (f.spilled) {
                                spilledCount++;

                                if (f.assembleP <= 0 && pillObj.openTimer < f.assembleDelay) {
                                    // Свободное падение с кувырканием сразу после высыпания
                                    f.worldVel.y -= 9.8 * dt;
                                    f.worldVel.multiplyScalar(Math.exp(-0.35 * dt));
                                    f.worldPos.addScaledVector(f.worldVel, dt);
                                    f.rot.x += f.rotVel.x * dt;
                                    f.rot.y += f.rotVel.y * dt;
                                    f.rot.z += f.rotVel.z * dt;
                                } else if (f.assembleP < 1) {
                                    // Полёт к своему месту на странице по дуге
                                    if (f.assembleP <= 0) {
                                        f.assembleFrom.copy(f.worldPos);
                                        f.rotFrom.copy(f.rot);
                                        f.flatRot.set(
                                            Math.round(f.rot.x / (Math.PI * 2)) * Math.PI * 2,
                                            Math.round(f.rot.y / (Math.PI * 2)) * Math.PI * 2,
                                            Math.round(f.rot.z / (Math.PI * 2)) * Math.PI * 2
                                        );
                                        f.arcAmp = THREE.MathUtils.clamp(f.assembleFrom.distanceTo(f.targetPos) * 0.13, 0.05, 0.4);
                                    }
                                    f.assembleP = Math.min(1, f.assembleP + dt / f.assembleDur);
                                    const e = 1 - Math.pow(1 - f.assembleP, 3);
                                    f.worldPos.lerpVectors(f.assembleFrom, f.targetPos, e);
                                    f.worldPos.y += Math.sin(e * Math.PI) * f.arcAmp;
                                    const jitter = (1 - e) * 0.045;
                                    f.worldPos.x += Math.sin(t * 6.3 + f.swirlPhase) * jitter;
                                    f.worldPos.z += Math.cos(t * 5.1 + f.swirlPhase * 1.7) * jitter;
                                    f.rot.x = f.rotFrom.x + (f.flatRot.x - f.rotFrom.x) * e;
                                    f.rot.y = f.rotFrom.y + (f.flatRot.y - f.rotFrom.y) * e;
                                    f.rot.z = f.rotFrom.z + (f.flatRot.z - f.rotFrom.z) * e;
                                    f.curScale.lerpVectors(f.baseScale, f.targetScale, e);
                                    if (f.assembleP >= 1) {
                                        f.arrived = true;
                                        f.rot.copy(f.flatRot);
                                        f.curScale.copy(f.targetScale);
                                    }
                                } else {
                                    assembledCount++;
                                }

                                // Окрашивание в цвет целевого блока страницы
                                if (f.colorMix < 1) {
                                    f.colorMix = Math.min(1, f.colorMix + dt * 2.1);
                                    writeFragColor(mesh, i, f);
                                    if (s === 0) boxesDirty = true; else dotsDirty = true;
                                }

                                // После проявления настоящей страницы фрагмент тает с лёгким «попом»
                                if (pillObj.pageRevealed && pillObj.revealTimer > f.fadeDelay) {
                                    if (f.fadeP <= 0) f.fadeFromScale.copy(f.curScale);
                                    if (f.fadeP < 1) {
                                        f.fadeP = Math.min(1, f.fadeP + dt / 0.5);
                                        const fp = f.fadeP;
                                        const pop = 1 + Math.sin(Math.min(fp * 1.7, 1) * Math.PI) * 0.14;
                                        const shrink = Math.max(0.0001, (1 - fp) * pop);
                                        f.curScale.copy(f.fadeFromScale).multiplyScalar(shrink);
                                        if (f.fadeP >= 1) f.hidden = true;
                                    } else {
                                        f.hidden = true;
                                    }
                                }
                                if (f.hidden) fadedCount++;
                            }

                            writeFragInstance(mesh, i, f, pillObj.curScale);
                        }
                    }

                    // Фон темы включается почти сразу после начала высыпания,
                    // но страницу проявит сама сборка фрагментов (revealPageForPill)
                    if (!pillObj.themeTriggered && spilledCount > totalFrags * 0.1) {
                        pillObj.themeTriggered = true;
                        applyWorldTheme(pillObj.id, { deferPageReveal: true });
                    }

                    // Проявляем настоящую страницу, когда большинство фрагментов заняли свои места
                    if (!pillObj.pageRevealed) {
                        const ready = totalFrags > 0 ? (assembledCount + fadedCount) / totalFrags : 1;
                        if (ready > 0.55 || pillObj.openTimer > 5.0) {
                            revealPageForPill(pillObj);
                        }
                    }

                    // Все фрагменты растворились в странице — пустая капсула закрывается и уплывает в угол
                    if (fadedCount >= totalFrags * 0.98 || pillObj.openTimer > 8.0) {
                        pillObj.state = 'dock_closing';
                        pillObj.dockTimer = 0;
                    }

                } else if (pillObj.state === 'dock_closing' || pillObj.state === 'docked' || pillObj.state === 'undocking') {
                    // Фрагменты уже растворились в странице — прячем их до возврата
                    for (let s = 0; s < 2; s++) {
                        const set = s === 0 ? boxFrags : dotFrags;
                        const mesh = s === 0 ? pillObj.fragBoxes : pillObj.fragDots;
                        for (let i = 0; i < set.length; i++) {
                            const f = set[i];
                            f.curScale.set(0.0001, 0.0001, 0.0001);
                            writeFragInstance(mesh, i, f, 1);
                        }
                    }

                } else if (pillObj.state === 'collecting') {
                    // Поэтапное вихревое засасывание фрагментов обратно в нижнюю половинку
                    const suctionHalf = pillObj.suctionSide === -1 ? pillObj.leftHalf : pillObj.rightHalf;
                    _rimWorldPos.set(0, 0, 0).applyMatrix4(suctionHalf.matrixWorld);

                    _origEmissive.setHex(pillObj.innerEmissive);
                    pillObj.fragMat.emissive.lerp(_origEmissive, 1 - Math.exp(-2.8 * dt));

                    let returnedCount = 0;

                    for (let s = 0; s < 2; s++) {
                        const set = s === 0 ? boxFrags : dotFrags;
                        const mesh = s === 0 ? pillObj.fragBoxes : pillObj.fragDots;

                        for (let i = 0; i < set.length; i++) {
                            const f = set[i];
                            _targetWorldPos.copy(f.pos).applyMatrix4(suctionHalf.matrixWorld);

                            if (!f.spilled) {
                                f.worldPos.copy(_targetWorldPos);
                                returnedCount++;
                            } else if (pillObj.collectTimer >= f.collectDelay) {
                                // Сначала тянем к открытому ободку, затем внутрь дна половинки
                                const toRimX = _rimWorldPos.x - f.worldPos.x;
                                const toRimY = _rimWorldPos.y - f.worldPos.y;
                                const toRimZ = _rimWorldPos.z - f.worldPos.z;
                                const distToRim = Math.hypot(toRimX, toRimY, toRimZ);

                                const rimThresh = 0.32 * Math.max(0.4, pillObj.curScale);
                                const arriveThresh = 0.09 * Math.max(0.5, pillObj.curScale);
                                const aimPos = distToRim > rimThresh ? _rimWorldPos : _targetWorldPos;
                                const dx = aimPos.x - f.worldPos.x;
                                const dy = aimPos.y - f.worldPos.y;
                                const dz = aimPos.z - f.worldPos.z;
                                const dist = Math.hypot(dx, dy, dz);

                                if (dist < arriveThresh && aimPos === _targetWorldPos) {
                                    f.spilled = false;
                                    f.worldPos.copy(_targetWorldPos);
                                    f.curScale.copy(f.baseScale);
                                    returnedCount++;
                                } else {
                                    const pullSpeed = 4.8 + Math.min(5.5, (pillObj.collectTimer - f.collectDelay) * 3.8);
                                    const swirl = Math.min(0.45, dist * 0.25);
                                    const ang = t * 7.5 + f.swirlPhase;

                                    f.worldPos.x += (dx / Math.max(dist, 0.001)) * pullSpeed * dt + Math.cos(ang) * swirl * dt;
                                    f.worldPos.y += (dy / Math.max(dist, 0.001)) * pullSpeed * dt;
                                    f.worldPos.z += (dz / Math.max(dist, 0.001)) * pullSpeed * dt + Math.sin(ang) * swirl * dt;

                                    // На лету фрагмент сжимается до «крошки», чтобы пройти в ободок
                                    f.curScale.lerp(f.baseScale, 1 - Math.exp(-5 * dt));
                                    f.rot.x += f.rotVel.x * dt;
                                    f.rot.y += f.rotVel.y * dt;
                                    f.rot.z += f.rotVel.z * dt;
                                }

                                // Возвращаем исходный контрастный цвет по мере втягивания
                                if (f.colorMix > 0) {
                                    f.colorMix = Math.max(0, f.colorMix - dt * 2.2);
                                    writeFragColor(mesh, i, f);
                                    if (s === 0) boxesDirty = true; else dotsDirty = true;
                                }
                            }

                            writeFragInstance(mesh, i, f, pillObj.curScale);
                        }
                    }

                    // Когда все волны затянуты внутрь — надеваем и закручиваем вторую половинку
                    if (returnedCount >= totalFrags * 0.96 || pillObj.collectTimer > 3.4) {
                        for (let s = 0; s < 2; s++) {
                            const set = s === 0 ? boxFrags : dotFrags;
                            const mesh = s === 0 ? pillObj.fragBoxes : pillObj.fragDots;
                            for (let i = 0; i < set.length; i++) {
                                const f = set[i];
                                f.spilled = false;
                                f.hidden = false;
                                f.fadeP = 0;
                                f.assembleP = 0;
                                f.arrived = false;
                                f.colorMix = 0;
                                f.curScale.copy(f.baseScale);
                                mesh.setColorAt(i, f.origColor);
                            }
                        }
                        boxesDirty = true;
                        dotsDirty = true;
                        pillObj.state = 'closing';
                        pillObj.closingProgress = 0;
                    }

                } else if (pillObj.state === 'closing') {
                    // Фрагменты едут внутри наполненной половинки, пока вторая закручивается сверху
                    const suctionHalf = pillObj.suctionSide === -1 ? pillObj.leftHalf : pillObj.rightHalf;
                    for (let s = 0; s < 2; s++) {
                        const set = s === 0 ? boxFrags : dotFrags;
                        const mesh = s === 0 ? pillObj.fragBoxes : pillObj.fragDots;
                        for (let i = 0; i < set.length; i++) {
                            const f = set[i];
                            f.worldPos.copy(f.pos).applyMatrix4(suctionHalf.matrixWorld);
                            writeFragInstance(mesh, i, f, pillObj.curScale);
                        }
                    }
                }

                pillObj.fragBoxes.instanceMatrix.needsUpdate = true;
                pillObj.fragDots.instanceMatrix.needsUpdate = true;
                if (boxesDirty && pillObj.fragBoxes.instanceColor) {
                    pillObj.fragBoxes.instanceColor.needsUpdate = true;
                }
                if (dotsDirty && pillObj.fragDots.instanceColor) {
                    pillObj.fragDots.instanceColor.needsUpdate = true;
                }

                // Обновление деликатной тени под капсулой
                const isDarkBg = activeWorldTheme === 'red';
                const shadowVisibility =
                    (pillObj.state === 'docked' || pillObj.state === 'dock_closing' || isParkedTopRight || isDarkBg)
                        ? 0.0
                        : 0.42;

                pillObj.shadowMesh.material.opacity += (shadowVisibility - pillObj.shadowMesh.material.opacity) * (1 - Math.exp(-4 * dt));
                pillObj.shadowMesh.position.x = pillObj.group.position.x;
                pillObj.shadowMesh.position.z = pillObj.group.position.z;

                const heightFactor = THREE.MathUtils.clamp(1.15 - (pillObj.group.position.y + 0.3) * 0.25, 0.72, 1.25);
                const yawCos = Math.abs(Math.cos(angles.y));
                pillObj.shadowMesh.scale.set(
                    (0.75 + 0.32 * yawCos) * heightFactor * pillObj.curScale,
                    heightFactor * pillObj.curScale,
                    1
                );
                pillObj.shadowMesh.rotation.z = -angles.y * 0.45;
            }




    // ================= ОБРАБОТКА КЛИКОВ И НАВЕДЕНИЯ =================
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    function isInteractivePageTarget(target) {
        if (!target || !target.closest) return false;
        return Boolean(
            target.closest(
                'button, a, input, textarea, select, iframe, .one-crt-card, .post-card, .bio-topline, #hud, .tv-nav, #bug, #rew, #slide-card, #oracle-cta'
            )
        );
    }

    function getIntersectedPill(clientX, clientY) {
        if (!SEGMENT_CONFIG.keepCornerPillsVisible && activeWorldTheme !== 'default') return null;
        const rect = renderer.domElement.getBoundingClientRect();
        if (!rect.width || !rect.height) return null;
        pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);

        const hits = raycaster.intersectObjects([redPill.hitMesh, bluePill.hitMesh], false);
        if (!hits.length) return null;
        return hits[0].object === redPill.hitMesh ? redPill : bluePill;
    }

    function handlePillClick(clientX, clientY) {
        const pill = getIntersectedPill(clientX, clientY);
        if (!pill) return false;
        const angles = pill === redPill ? redAngles : blueAngles;

        if (pill.state === 'closed') {
            openPill(pill, angles);
        } else if (pill.state === 'open') {
            startCollectingPill(pill, angles);
        } else if (pill.state === 'docked' || pill.state === 'dock_closing') {
            startUndockPill(pill, angles);
        }
        return true;
    }

    function onWindowPointerMove(e) {
        if (isInteractivePageTarget(e.target)) {
            document.body.style.cursor = '';
            return;
        }
        const hovered = getIntersectedPill(e.clientX, e.clientY);
        document.body.style.cursor = hovered ? 'pointer' : '';
    }

    function onWindowClick(e) {
        if (isInteractivePageTarget(e.target)) return;
        handlePillClick(e.clientX, e.clientY);
    }

    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        updateResponsiveBasePositions();
        resizeMatrixCanvas();
        [redPill, bluePill].forEach(function (p) {
            if (p.state === 'open' && p.themeTriggered) assignFragmentsToPage(p);
        });
    }

    window.addEventListener('pointermove', onWindowPointerMove);
    window.addEventListener('click', onWindowClick);
    window.addEventListener('resize', onWindowResize);

    // Проброс кликов/ховера по угловым 3D-капсулам поверх same-origin iframe (matrix.html)
    function bindIframeWindow(iframeWin) {
        if (!iframeWin) return;
        try {
            const onIframeMove = (ev) => {
                if (isInteractivePageTarget(ev.target)) {
                    iframeWin.document.body.style.cursor = '';
                    return;
                }
                const hovered = getIntersectedPill(ev.clientX, ev.clientY);
                iframeWin.document.body.style.cursor = hovered ? 'pointer' : '';
            };
            const onIframeClick = (ev) => {
                if (isInteractivePageTarget(ev.target)) return;
                if (handlePillClick(ev.clientX, ev.clientY)) {
                    ev.preventDefault();
                    ev.stopPropagation();
                }
            };
            iframeWin.addEventListener('pointermove', onIframeMove);
            iframeWin.addEventListener('click', onIframeClick, true);
            boundIframeCleanups.push(() => {
                try {
                    iframeWin.removeEventListener('pointermove', onIframeMove);
                    iframeWin.removeEventListener('click', onIframeClick, true);
                } catch {}
            });
        } catch {}
    }

    // ================= ЦИКЛ АНИМАЦИИ =================
    let lastTime = performance.now();
    let elapsed = 0;
    let perfAccum = 0;
    let perfFrames = 0;

    function animate(now) {
        if (destroyed) return;
        rafId = requestAnimationFrame(animate);
        const dt = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;
        elapsed += dt;

        perfAccum += dt;
        perfFrames++;
        if (perfAccum >= 1.5) {
            const avg = perfAccum / perfFrames;
            if (avg > 0.024 && pixelRatioCap > 1.0) {
                pixelRatioCap = Math.max(1.0, pixelRatioCap - 0.25);
                renderer.setPixelRatio(pixelRatioCap);
                renderer.setSize(window.innerWidth, window.innerHeight);
            } else if (avg < 0.013 && pixelRatioCap < MAX_PIXEL_RATIO) {
                pixelRatioCap = Math.min(MAX_PIXEL_RATIO, pixelRatioCap + 0.25);
                renderer.setPixelRatio(pixelRatioCap);
                renderer.setSize(window.innerWidth, window.innerHeight);
            }
            perfAccum = 0;
            perfFrames = 0;
        }

        updateMatrixRain(dt);
        stepPillAnimation(redPill, motionProfiles.red, redAngles, dt, elapsed);
        stepPillAnimation(bluePill, motionProfiles.blue, blueAngles, dt, elapsed);

        renderer.render(scene, camera);
    }

    rafId = requestAnimationFrame(animate);

    return {
        backToPills() {
            resetPill(redPill, redAngles);
            resetPill(bluePill, blueAngles);
            applyWorldTheme('default');
        },
        switchToRed() {
            showPageStage('default');
            if (redPill.state !== 'closed') {
                redPill.state = 'closed';
                redPill.openProgress = 0;
            }
            openPill(redPill, redAngles);
        },
        switchToBlue() {
            showPageStage('default');
            if (bluePill.state !== 'closed') {
                bluePill.state = 'closed';
                bluePill.openProgress = 0;
            }
            openPill(bluePill, blueAngles);
        },
        openImmediate(which) {
            if (which === 'red') {
                openPill(redPill, redAngles);
            } else if (which === 'blue') {
                openPill(bluePill, blueAngles);
            }
        },
        bindIframeWindow,
        destroy() {
            destroyed = true;
            cancelAnimationFrame(rafId);
            if (pageRevealTimer) clearTimeout(pageRevealTimer);
            window.removeEventListener('pointermove', onWindowPointerMove);
            window.removeEventListener('click', onWindowClick);
            window.removeEventListener('resize', onWindowResize);
            document.body.style.cursor = '';
            while (boundIframeCleanups.length) {
                const fn = boundIframeCleanups.pop();
                fn();
            }
            try {
                renderer.dispose();
                if (renderer.domElement && renderer.domElement.parentNode === webglContainer) {
                    webglContainer.removeChild(renderer.domElement);
                }
            } catch {}
        },
    };
}
