        /* ==========================================================================
           [V7] МОСТ МЕЖДУ 3D-ДВИЖКОМ И ЛЕНТОЙ
           --------------------------------------------------------------------------
           Движок капсул сообщает о ключевых кадрах, лента на них отвечает:
             onCatLeap         — кот выпрыгнул из синей капсулы (лента показана размыто)
             onCatLandedOnPost — кот сел на первую публикацию → карточка «оживает»
             onCatArrived      — кот забрался на фото профиля → 3D-кот уходит,
                                 вместо него в аватаре включается живой 2D-кот
             onCatLeaving      — капсулу собирают → коты замирают, главный убегает
           ========================================================================== */
        const FEED = (function () {
            const state = {
                director: null,
                actors: [],
                hero: null,
                arrived: false,
                leaving: false,
                started: false
            };

            const PAGE = '#page-dope';

            function q(sel, root) { return (root || document).querySelector(sel); }
            function qa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

            function makeHero() {
                const orb = q(PAGE + ' .profile-orb');
                if (!orb) return null;
                const scene = q('[data-cat-scene="hero"]', orb);
                if (!scene) return null;
                // идемпотентно: повторный вызов не должен создавать второго кота
                if (state.hero && state.hero.actor && state.hero.scene === scene) return state.hero;
                const actor = new CatActor({
                    card: q(PAGE + ' .bio-header') || orb,
                    index: -1,
                    script: 'dance',
                    scene: scene,
                    walker: null,
                    paws: null,
                    hero: true
                });
                actor.sprite.style.width = '62px';
                actor.sprite.style.height = '62px';
                actor.sprite.style.margin = '-31px 0 0 -31px';
                actor.sprite.style.opacity = '0';
                actor.setActive(false);
                actor.frozen = true;
                if (state.director) state.director.add(actor);
                return { orb: orb, scene: scene, sprite: actor.sprite, actor: actor };
            }

            /* Включение «живой» ленты: карточки уже собраны, коты стартуют
               в тот момент, когда главный кот забрался в аватар. */
            function boot() {
                if (state.started) return;
                state.started = true;

                // Карточки собираем прямо здесь (а не в движке): так лента работает,
                // даже если 3D-сцена не поднялась.
                if (!qa(PAGE + ' .post-card').length) buildFeed();

                const cards = qa(PAGE + ' .post-card');
                const director = new CatDirector();
                state.director = director;

                cards.forEach(function (card, index) {
                    const post = DOPE_POSTS[index];
                    if (!post) return;
                    const avatar = q('.cat-avatar', card);
                    const scene = q('.cat-scene', card);
                    if (!avatar || !scene) return;
                    const actor = new CatActor({
                        card: card,
                        index: index,
                        script: post.cat,
                        scene: scene,
                        walker: q('[data-cat-walker="' + index + '"]', card),
                        paws: q('[data-cat-paws="' + index + '"]', card)
                    });
                    // базовый размер кота под аватар 42px
                    actor.sprite.style.width = '38px';
                    actor.sprite.style.height = '38px';
                    actor.sprite.style.margin = '-19px 0 0 -19px';
                    actor.sprite.style.opacity = '0';
                    actor.setActive(false);
                    actor.card = card;
                    director.add(actor);
                    state.actors.push(actor);
                    card._cat = actor;

                    // «chase»: кот бегает за курсором внутри аватара
                    if (post.cat === 'chase') {
                        card.addEventListener('pointermove', function (e) {
                            const r = scene.getBoundingClientRect();
                            scene.dataset.pointerX = ((e.clientX - r.left) / r.width * 2 - 1) * 9;
                            scene.dataset.pointerY = ((e.clientY - r.top) / r.height * 2 - 1) * 9;
                        });
                        card.addEventListener('pointerleave', function () {
                            delete scene.dataset.pointerX;
                            delete scene.dataset.pointerY;
                        });
                    }
                });

                state.hero = makeHero();
                director.observe(cards);
                director.start();
                director.paused = true;

                // логотипы проектов в «окошках» аватаров (data: URL ставим из JS,
                    // иначе кавычки ломают inline-стиль)
                qa(PAGE + ' .cat-door[data-mark]').forEach(function (el) {
                    el.style.backgroundImage = 'url("' + el.dataset.mark + '")';
                });

                bindActions();
                return state;
            }

            /* --- Реакции соцкнопок (лента «как настоящая») --- */
            function bindActions() {
                if (state.actionsBound) return;
                state.actionsBound = true;
                qa(PAGE + ' .social-action').forEach(function (btn) {
                    btn.addEventListener('click', function (e) {
                        e.preventDefault();
                        e.stopPropagation();
                        const act = btn.dataset.act;
                        const card = btn.closest('.post-card');
                        if (act === 'like' || act === 'repost') {
                            const on = btn.classList.toggle('is-active');
                            const counter = q('[data-count="' + act + '"]', btn);
                            const post = DOPE_POSTS[parseInt(card.dataset.post, 10)];
                            if (counter && post) {
                                const base = act === 'like' ? post.likes : post.reposts;
                                counter.textContent = formatNum(base + (on ? 1 : 0));
                            }
                            if (on && act === 'like') heartPop(btn);
                        } else if (act === 'save') {
                            btn.classList.toggle('is-saved');
                            const path = q('path', btn);
                            if (path) path.setAttribute('fill', btn.classList.contains('is-saved') ? 'rgba(63,157,106,.25)' : 'none');
                        } else if (act === 'share') {
                            const url = location.origin + location.pathname + '#' + card.id;
                            if (navigator.clipboard) {
                                navigator.clipboard.writeText(url).then(function () { toast('Ссылка на пост скопирована'); },
                                    function () { toast(url); });
                            } else {
                                toast(url);
                            }
                        } else if (act === 'comment') {
                            toast('Комментарии появятся в следующей итерации');
                        }
                    });
                });
            }

            function heartPop(btn) {
                const heart = document.createElement('span');
                heart.className = 'heart-pop';
                heart.textContent = '♥';
                const r = btn.getBoundingClientRect();
                heart.style.left = (r.left + 18) + 'px';
                heart.style.top = (r.top + 4) + 'px';
                document.body.appendChild(heart);
                setTimeout(function () { heart.remove(); }, 900);
            }

            let toastTimer = null;
            function toast(text) {
                let el = q('#dope-toast');
                if (!el) {
                    el = document.createElement('div');
                    el.id = 'dope-toast';
                    document.body.appendChild(el);
                }
                el.textContent = text;
                el.classList.add('is-on');
                clearTimeout(toastTimer);
                toastTimer = setTimeout(function () { el.classList.remove('is-on'); }, 2200);
            }

            /* --- Ключевые кадры движка --- */
            function onCatLeap() {
                state.leaving = false;
                state.arrived = false;
                const page = q(PAGE);
                if (page) page.classList.add('is-cat-incoming');
            }

            function onCatLandedOnPost() {
                const card = q(PAGE + ' .post-card[data-post="0"]');
                if (!card) return;
                card.classList.remove('is-lit');
                void card.offsetWidth;
                card.classList.add('is-lit');
                // пыль от посадки
                const puff = document.createElement('span');
                puff.className = 'card-land-puff';
                card.appendChild(puff);
                setTimeout(function () { puff.remove(); }, 900);
                setTimeout(function () { card.classList.remove('is-lit'); }, 1600);
            }

            function onCatArrived() {
                state.arrived = true;
                const page = q(PAGE);
                if (page) {
                    page.classList.remove('is-cat-incoming');
                    page.classList.add('is-cat-home');
                }
                const hero = state.hero;
                if (hero) {
                    hero.sprite.style.opacity = '1';
                    if (hero.actor) {
                        hero.actor.frozen = false;
                        hero.actor.setActive(true);
                        hero.actor.t = 0;
                    }
                    hero.orb.classList.add('is-cat-home');
                    hero.orb.classList.remove('is-cat-landing');
                    void hero.orb.offsetWidth;
                    hero.orb.classList.add('is-cat-landing');
                    setTimeout(function () { hero.orb.classList.remove('is-cat-landing'); }, 900);
                }
                // все коты в ленте оживают
                if (state.director) state.director.paused = false;
                // «Сцена» просыпается у всех карточек сразу: IntersectionObserver
                // не срабатывает на смену visibility у .page-stage, поэтому включаем
                // котов явно (дальше видимостью управляет скролл).
                state.actors.forEach(function (a) {
                    a.frozen = false;
                    a.setActive(true);
                });
                // главный кот в аватаре — танцует от радости
                if (state.hero) {
                    const orbScene = state.hero.scene;
                    for (let i = 0; i < 5; i++) {
                        setTimeout(function () { spawnNote(orbScene); }, i * 130);
                    }
                }
            }

            function onClimbTrail(pt) {
                const card = q(PAGE + ' .post-card[data-post="0"]');
                if (!card || !pt) return;
                const paws = card.querySelector('[data-cat-paws="0"]');
                if (!paws) return;
                const r = card.getBoundingClientRect();
                const dot = document.createElement('i');
                dot.style.left = (pt.x - r.left).toFixed(1) + 'px';
                dot.style.top = (pt.y - r.top).toFixed(1) + 'px';
                dot.style.width = dot.style.height = '4px';
                dot.style.background = 'rgba(96, 124, 205, 0.5)';
                paws.appendChild(dot);
                setTimeout(function () { dot.remove(); }, 1400);
            }

            function onCatLeaving() {
                state.arrived = false;
                state.leaving = true;
                const page = q(PAGE);
                if (page) page.classList.remove('is-cat-home', 'is-cat-incoming');
                if (state.hero) {
                    const h = state.hero;
                    h.sprite.style.opacity = '0';
                    h.orb.classList.remove('is-cat-home');
                    if (h.actor) { h.actor.frozen = true; h.actor.setActive(false); }
                }
                if (state.director) state.director.paused = true;
            }

            function onPageOpen(which) {
                if (which !== 'blue') return;
                boot();
                const page = q(PAGE);
                if (page) page.scrollTop = 0;
            }

            function onPageClose() {
                const page = q(PAGE);
                if (page) {
                    page.classList.remove('is-cat-home', 'is-cat-incoming');
                    page.scrollTop = 0;
                }
                if (state.director) state.director.paused = true;
                if (state.hero) {
                    state.hero.sprite.style.opacity = '0';
                    state.hero.orb.classList.remove('is-cat-home');
                    if (state.hero.actor) { state.hero.actor.frozen = true; state.hero.actor.setActive(false); }
                }
                state.arrived = false;
                state.leaving = false;
            }

            return {
                boot: boot,
                state: state,
                onCatLeap: onCatLeap,
                onCatLandedOnPost: onCatLandedOnPost,
                onCatArrived: onCatArrived,
                onCatLeaving: onCatLeaving,
                onClimbTrail: onClimbTrail,
                onPageOpen: onPageOpen,
                onPageClose: onPageClose,
                toast: toast
            };
        })();

        // для отладки/тестов: доступ к ленте и котам из консоли
        try {
            window.FEED = FEED;
            window.DOPE_POSTS = DOPE_POSTS;
        } catch (e) { /* игнорируем */ }
