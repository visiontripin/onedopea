        /* ==========================================================================
           [V9] КОТ-ПЕРСОНАЖ: векторный скелет с шарнирами
           --------------------------------------------------------------------------
           Раньше кот был одной растровой картинкой: он не мог бежать, махать лапами
           или отталкиваться — поэтому и читался как «наклейка, которую таскают».
           Теперь это SVG-риг: тело, голова, четыре двухзвенные лапы, хвост, глаза.
           Каждая часть — отдельная группа со своим шарниром, анимация ставит им
           реальные углы (rotate) и масштабы (squash/stretch), поэтому кот именно
           бежит, отталкивается, карабкается и садится.
           ========================================================================== */
        const rigClamp = (v, a, b) => (v < a ? a : (v > b ? b : v));

        const CAT_INK = '#2b3a86';
        const CAT_INK_DARK = '#22306f';
        const CAT_BELLY = '#f2f5ff';
        const CAT_OUTLINE = '#1b2557';
        const CAT_COLLAR = '#5f74c9';
        const CAT_NOSE = '#ffb2ba';
        const CAT_WHISKER = '#b9c4e6';

        /* Одна лапа: бедро (hip → knee) + голень (knee → foot) + ступня.
           Каждая часть обёрнута в <g> с transform-origin в шарнире. */
        function catLeg(id, hip, knee, foot, wide) {
            const w1 = wide ? 8.6 : 7.6;
            const w2 = wide ? 7.0 : 6.2;
            return `
            <g class="leg" data-leg="${id}" style="transform-origin:${hip[0]}px ${hip[1]}px">
              <g class="thigh" style="transform-origin:${hip[0]}px ${hip[1]}px">
                <line x1="${hip[0]}" y1="${hip[1]}" x2="${knee[0]}" y2="${knee[1]}"
                      stroke="${CAT_OUTLINE}" stroke-width="${w1 + 3.2}" stroke-linecap="round"/>
                <line x1="${hip[0]}" y1="${hip[1]}" x2="${knee[0]}" y2="${knee[1]}"
                      stroke="${CAT_INK}" stroke-width="${w1}" stroke-linecap="round"/>
                <g class="shin" style="transform-origin:${knee[0]}px ${knee[1]}px">
                  <circle cx="${knee[0]}" cy="${knee[1]}" r="${w1 * 0.42}"
                          fill="${CAT_INK}" stroke="${CAT_OUTLINE}" stroke-width="2"/>
                  <line x1="${knee[0]}" y1="${knee[1]}" x2="${foot[0]}" y2="${foot[1]}"
                        stroke="${CAT_OUTLINE}" stroke-width="${w2 + 3}" stroke-linecap="round"/>
                  <line x1="${knee[0]}" y1="${knee[1]}" x2="${foot[0]}" y2="${foot[1]}"
                        stroke="${CAT_INK}" stroke-width="${w2}" stroke-linecap="round"/>
                  <ellipse class="paw" cx="${foot[0]}" cy="${foot[1]}" rx="${w2 * 0.92}" ry="${w2 * 0.66}"
                           fill="${CAT_INK}" stroke="${CAT_OUTLINE}" stroke-width="1.9"
                           style="transform-origin:${foot[0]}px ${foot[1]}px"/>
                </g>
              </g>
            </g>`;
        }

        function buildCatSVG() {
            return `
<svg class="catSvg" viewBox="0 0 124 108" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <clipPath id="catBodyClip"><ellipse cx="62" cy="62" rx="27" ry="18.5"/></clipPath>
  </defs>

  <ellipse class="catShadow" cx="62" cy="100" rx="25" ry="4.2"
           fill="rgba(37,52,104,0.18)" style="transform-origin:62px 100px"/>

  <!-- дальние лапы -->
  ${catLeg('backFar', [45, 64], [42, 78], [41, 92], false)}
  ${catLeg('frontFar', [78, 64], [82, 78], [84, 92], false)}

  <!-- хвост -->
  <g class="tail" style="transform-origin:37px 62px">
    <path class="tailPath" d="M37 62 C 26 60, 19 48, 21 36"
          fill="none" stroke="${CAT_OUTLINE}" stroke-width="11.2" stroke-linecap="round"/>
    <path class="tailPath2" d="M37 62 C 26 60, 19 48, 21 36"
          fill="none" stroke="${CAT_INK}" stroke-width="7.8" stroke-linecap="round"/>
  </g>

  <!-- тело -->
  <g class="torso" style="transform-origin:62px 74px">
    <ellipse cx="62" cy="62" rx="27" ry="18.5"
             fill="${CAT_INK}" stroke="${CAT_OUTLINE}" stroke-width="3"/>
    <g clip-path="url(#catBodyClip)">
      <ellipse cx="70" cy="72" rx="15" ry="10" fill="${CAT_BELLY}"/>
      <path d="M44 50 q5 4.5 0 9 M52 47 q5 4.5 0 9 M60 46 q5 4.5 0 9"
            fill="none" stroke="${CAT_INK_DARK}" stroke-width="3.2" stroke-linecap="round"/>
    </g>
  </g>

  <!-- ближние лапы -->
  ${catLeg('backNear', [50, 66], [47, 80], [46, 94], true)}
  ${catLeg('frontNear', [74, 66], [77, 81], [75, 95], true)}

  <!-- голова -->
  <g class="head" style="transform-origin:92px 42px">
    <g class="ear earL">
      <path d="M81 30 L78 12 L93 24 Z" fill="${CAT_INK}" stroke="${CAT_OUTLINE}" stroke-width="2.4"
            stroke-linejoin="round"/>
      <path d="M83 27 L82 18 L89 24 Z" fill="#7a8acf"/>
    </g>
    <g class="ear earR">
      <path d="M100 26 L106 10 L109 28 Z" fill="${CAT_INK}" stroke="${CAT_OUTLINE}" stroke-width="2.4"
            stroke-linejoin="round"/>
      <path d="M102 25 L105 17 L106 26 Z" fill="#7a8acf"/>
    </g>
    <circle cx="92" cy="42" r="17" fill="${CAT_INK}" stroke="${CAT_OUTLINE}" stroke-width="3"/>
    <ellipse cx="96" cy="48" rx="10" ry="7" fill="${CAT_BELLY}"/>
    <g class="eye eyeL" style="transform-origin:88px 40px">
      <ellipse cx="88" cy="40" rx="4.3" ry="5" fill="#ffffff"/>
      <ellipse class="pupil" cx="89" cy="40.4" rx="2.2" ry="2.8" fill="#141a33"/>
    </g>
    <g class="eye eyeR" style="transform-origin:100px 39px">
      <ellipse cx="100" cy="39" rx="4.1" ry="4.8" fill="#ffffff"/>
      <ellipse class="pupil" cx="101" cy="39.4" rx="2.1" ry="2.7" fill="#141a33"/>
    </g>
    <path d="M94.5 46 l2.2 1.5 -2.2 1.5 -2.2 -1.5 Z" fill="${CAT_NOSE}"/>
    <path d="M93.6 50 q1.4 2.2 3 0" fill="none" stroke="${CAT_OUTLINE}" stroke-width="1.3"
          stroke-linecap="round"/>
    <g class="whiskers" stroke="${CAT_WHISKER}" stroke-width="1.4" stroke-linecap="round" fill="none">
      <path d="M103 45 q8 -2 11 -4"/>
      <path d="M103 48 q8 1 11 2"/>
      <path d="M83 46 q-8 -2 -10 -5"/>
      <path d="M83 49 q-8 1 -10 3"/>
    </g>
    <path d="M80 57 q13 5 25 1" fill="none" stroke="${CAT_COLLAR}" stroke-width="4.2"
          stroke-linecap="round"/>
    <circle cx="92" cy="60" r="3.1" fill="#d6ddff" stroke="${CAT_OUTLINE}" stroke-width="1.1"/>
  </g>
</svg>`;
        }

        /* ======================================================================
           РИГ: доступ к шарнирам + позы
           ====================================================================== */
        class CatRig {
            constructor(svgEl) {
                this.svg = svgEl;
                this.legs = {};
                ['backFar', 'frontFar', 'backNear', 'frontNear'].forEach((id) => {
                    const leg = svgEl.querySelector('[data-leg="' + id + '"]');
                    this.legs[id] = {
                        leg: leg,
                        thigh: leg.querySelector('.thigh'),
                        shin: leg.querySelector('.shin'),
                        paw: leg.querySelector('.paw')
                    };
                });
                this.tail = svgEl.querySelector('.tail');
                this.torso = svgEl.querySelector('.torso');
                this.head = svgEl.querySelector('.head');
                this.shadow = svgEl.querySelector('.catShadow');
                this.eyes = [svgEl.querySelector('.eyeL'), svgEl.querySelector('.eyeR')];
                this.pupils = Array.from(svgEl.querySelectorAll('.pupil'));
                this.blinkT = Math.random() * 3;
                this.blink = 0;
            }

            _set(el, angle, extra) {
                if (!el) return;
                el.style.transform = 'rotate(' + angle.toFixed(2) + 'deg)' + (extra || '');
            }

            /* --- тело: наклон + squash/stretch --- */
            setBody(angle, squashY, squashX, dy) {
                if (!this.torso) return;
                this.torso.style.transform =
                    'translateY(' + (dy || 0).toFixed(2) + 'px) rotate(' + angle.toFixed(2) + 'deg) ' +
                    'scale(' + squashX.toFixed(3) + ',' + squashY.toFixed(3) + ')';
            }

            setHead(angle, dy, dx) {
                if (!this.head) return;
                this.head.style.transform = 'translate(' + (dx || 0).toFixed(2) + 'px,' +
                    (dy || 0).toFixed(2) + 'px) rotate(' + angle.toFixed(2) + 'deg)';
            }

            setTail(angle, curl) {
                if (!this.tail) return;
                this.tail.style.transform = 'rotate(' + angle.toFixed(2) + 'deg)';
                const p1 = this.tail.querySelector('.tailPath');
                const p2 = this.tail.querySelector('.tailPath2');
                if (p1 && p2) {
                    // «волна» по хвосту: изгиб гуляет от основания к кончику
                    const c = curl;
                    const d = 'M37 62 C ' + (26 - c * 0.5).toFixed(1) + ' ' + (60 - c * 0.4).toFixed(1) +
                        ', ' + (19 - c * 1.1).toFixed(1) + ' ' + (48 - c * 1.5).toFixed(1) +
                        ', ' + (21 + c * 0.9).toFixed(1) + ' ' + (36 - c * 2.1).toFixed(1);
                    p1.setAttribute('d', d);
                    p2.setAttribute('d', d);
                }
            }

            /* Одна лапа: угол бедра, угол колена (относительный). */
            setLeg(id, hipAngle, kneeAngle) {
                const L = this.legs[id];
                if (!L) return;
                this._set(L.thigh, hipAngle);
                this._set(L.shin, kneeAngle);
            }

            /* --- ПОЗЫ --- */

            /* Бег (галоп): фаза 0..1. Диагональные пары работают в противофазе. */
            poseRun(phase) {
                const n = phase * Math.PI * 2;
                const s1 = Math.sin(n), s2 = Math.sin(n + Math.PI);
                const c1 = Math.cos(n), c2 = Math.cos(n + Math.PI);
                // ближние лапы — основная пара, дальние — с небольшим офсетом
                this.setLeg('frontNear', s1 * 34, Math.max(0, c1) * 34);
                this.setLeg('backNear', s2 * 32, Math.max(0, c2) * 30);
                this.setLeg('frontFar', s2 * 28, Math.max(0, c2) * 28);
                this.setLeg('backFar', s1 * 26, Math.max(0, c1) * 26);
                // корпус: покачивание + сжатие на отталкивании
                const bob = Math.abs(Math.sin(n)) * 2.2;
                const squash = 1 + Math.sin(n * 2) * 0.06;
                this.setBody(Math.sin(n) * 3.4, squash, 1 / squash, -bob);
                this.setHead(Math.sin(n) * 4 - 3, Math.sin(n * 2) * 1.6, Math.sin(n) * 1.2);
                this.setTail(-10 + Math.sin(n) * 12, 8 + Math.sin(n + 0.8) * 9);
                this._shadow(1 - bob * 0.05);
            }

            /* --- ПОЛЁТ. Силуэт вытянут по траектории: передние лапы вперёд,
               задние отведены назад, хвост выпрямлен в струю. ---------------- */
            poseFly(p) {
                const tuck = Math.sin(Math.min(1, p * 1.1) * Math.PI);
                const reach = 1 - Math.abs(p - 0.45) * 0.5;
                // передние лапы выброшены вперёд, задние — назад (поза прыжка)
                this.setLeg('frontNear', -46 - tuck * 16, -34 - tuck * 10);
                this.setLeg('frontFar', -40 - tuck * 12, -28 - tuck * 8);
                this.setLeg('backNear', 40 + tuck * 18, 30 + tuck * 12);
                this.setLeg('backFar', 34 + tuck * 14, 24 + tuck * 10);
                const stretch = 1.14 + tuck * 0.1;
                this.setBody(-4, stretch, 1 / stretch, 0);
                this.setHead(-10 - tuck * 4, 0, 1);
                this.setTail(-34 - tuck * 10, 4 + (1 - tuck) * 8);
                this._shadow(0.5);
                void reach;
            }

            /* --- КАРАБКАНЬЕ. Риг поворачивается целиком (кот «встаёт на стену»),
               а поза — это умеренный цикл перебора: передние лапы тянутся вверх
               по стене, задние подтягиваются следом. Больших углов не нужно:
               силуэт вертикальный, и лапы читаются как лапы, а не как макароны. */
            poseClimb(phase) {
                const n = phase * Math.PI * 2;
                const s1 = Math.sin(n), s2 = Math.sin(n + Math.PI);
                const lift = Math.max(0, s1), lift2 = Math.max(0, s2);
                // Передние лапы по очереди «забрасываются» выше головы — это и есть
                // перехват; задние подтягиваются следом, корпус прижат к стене.
                this.setLeg('frontNear', -78 + s1 * 30, -18 - lift * 26);
                this.setLeg('frontFar', -66 + s2 * 28, -12 - lift2 * 24);
                this.setLeg('backNear', 34 + s2 * 16, 22 + lift2 * 14);
                this.setLeg('backFar', 26 + s1 * 14, 18 + lift * 12);
                this.setBody(-6 + Math.sin(n) * 3, 1.02, 0.99, -Math.abs(s1) * 1.2);
                this.setHead(-30 + Math.sin(n) * 5, -2, 1);
                this.setTail(34 + Math.sin(n) * 12, 6);
            }

            /* --- ЦАРАПАНЬЕ. Стоит на задних, передней лапой бьёт по двери. -- */
            poseScratch(phase) {
                const f = Math.sin(phase * Math.PI * 2);
                this.setLeg('frontNear', -66 + f * 30, -22 - Math.max(0, f) * 26);
                this.setLeg('frontFar', -48 + Math.max(0, -f) * 18, -12);
                this.setLeg('backNear', 26, 20);
                this.setLeg('backFar', 20, 16);
                this.setBody(-20, 1.06, 0.95, 0);
                this.setHead(-14 + f * 2, -2, 2);
                this.setTail(30 + f * 6, 10);
            }

            /* --- ТАНЕЦ. Перенос веса, подскок, «лапы вверх» по такту. --------- */
            poseDance(t) {
                const beat = t * 5.2;
                const hop = Math.max(0, Math.sin(beat));
                const side = Math.sin(beat * 0.5);
                this.setLeg('frontNear', -30 + Math.sin(beat) * 30, 26 + hop * 18);
                this.setLeg('frontFar', -24 - Math.sin(beat) * 26, 20 + hop * 16);
                this.setLeg('backNear', 12 + Math.cos(beat) * 12, -8);
                this.setLeg('backFar', 8 - Math.cos(beat) * 10, -6);
                this.setBody(side * 5 - 3, 1 + hop * 0.07, 1 - hop * 0.04, -hop * 1.8);
                this.setHead(-6 + side * 6, -hop * 1.4, side * 1.6);
                this.setTail(-12 + side * 22, 12 + side * 10);
            }

            /* Прыжок: p 0..1 — от приседа до вытянутого полёта. */
            poseLeap(p) {
                const tuck = Math.sin(Math.min(1, p * 1.15) * Math.PI);
                this.setLeg('frontNear', -22 - tuck * 34, 34 + tuck * 26);
                this.setLeg('backNear', 20 + tuck * 28, -16 - tuck * 26);
                this.setLeg('frontFar', -18 - tuck * 30, 30 + tuck * 22);
                this.setLeg('backFar', 18 + tuck * 24, -14 - tuck * 22);
                const stretch = 1 + tuck * 0.18;
                this.setBody(-6 + tuck * 10, stretch, 1 / stretch, 0);
                this.setHead(-8 + tuck * 6, 0, 0);
                this.setTail(-22 - tuck * 18, 10 + tuck * 10);
                this._shadow(0.55);
            }

            /* Приземление: сплющивание p 1 → 0. */
            poseLand(p) {
                const sq = 0.74 + (1 - p) * 0.26;
                this.setLeg('frontNear', 16, 30);
                this.setLeg('backNear', -12, -22);
                this.setLeg('frontFar', 12, 26);
                this.setLeg('backFar', -10, -18);
                this.setBody(0, sq, 1 + (1 - sq) * 0.9, (1 - sq) * 4);
                this.setHead(0, (1 - sq) * 6, 0);
                this.setTail(-18, 6);
                this._shadow(1.1);
            }

            /* Сидит (для аватаров): дышит, хвост качается, глаза моргают. */
            poseSit(t, mood) {
                const breathe = Math.sin(t * 2.1) * 0.02;
                const sway = Math.sin(t * 1.1) * 3;
                this.setLeg('frontNear', 4, 6);
                this.setLeg('backNear', -8, -10);
                this.setLeg('frontFar', 0, 4);
                this.setLeg('backFar', -6, -8);
                this.setBody(0, 1 + breathe, 1 - breathe * 0.6, -Math.abs(breathe) * 8);
                this.setHead(Math.sin(t * 0.9) * 3, Math.sin(t * 2.1) * 0.8, Math.sin(t * 0.7) * 0.8);
                this.setTail(-6 + sway, 5 + Math.sin(t * 1.6) * 4);
                this._shadow(1);
                if (mood === 'sleep') {
                    this.setHead(6 + Math.sin(t * 0.8) * 2, 2, 0);
                    this.setEyeOpen(0.08);
                }
            }

            /* Стоит (старт/финиш). */
            poseIdle(t) {
                this.setLeg('frontNear', 2, 4);
                this.setLeg('backNear', -4, -6);
                this.setLeg('frontFar', 0, 2);
                this.setLeg('backFar', -3, -5);
                this.setBody(Math.sin(t * 1.4) * 0.8, 1 + Math.sin(t * 2.2) * 0.012, 1, 0);
                this.setHead(Math.sin(t * 1.1) * 2, 0, 0);
                this.setTail(-8 + Math.sin(t * 1.3) * 6, 6);
                this._shadow(1);
            }

            _shadow(scale) {
                if (!this.shadow) return;
                this.shadow.style.transform = 'scale(' + scale.toFixed(2) + ',' + (0.9 + scale * 0.1).toFixed(2) + ')';
                this.shadow.style.opacity = String(0.55 / Math.max(0.6, scale));
            }

            twitchEar(amount) {
                const e = this.svg.querySelector('.earR');
                if (e) e.style.transform = 'rotate(' + amount.toFixed(2) + 'deg)';
            }

            setEyeOpen(open) {
                this.eyes.forEach((e) => { if (e) e.style.transform = 'scaleY(' + open.toFixed(2) + ')'; });
            }

            updateBlink(dt) {
                this.blinkT -= dt;
                if (this.blinkT <= 0) {
                    this.blinkT = 2 + Math.random() * 3.4;
                    this.blink = 1;
                }
                if (this.blink > 0) {
                    this.blink = Math.max(0, this.blink - dt * 6);
                    this.setEyeOpen(1 - this.blink * 0.92);
                }
            }

            lookAt(dx, dy) {
                const x = rigClamp(dx, -1, 1) * 1.5;
                const y = rigClamp(dy, -1, 1) * 1.5;
                this.pupils.forEach((p) => {
                    p.setAttribute('transform', 'translate(' + x.toFixed(2) + ',' + y.toFixed(2) + ')');
                });
            }
        }

