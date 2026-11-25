'use client';

import { useEffect, useRef, useState } from 'react';
import Feed from './Feed';
import { createClient } from '@/lib/supabase/client';
import { ensureThreeLoaded, mountCapsulesEngine, SEGMENT_CONFIG } from '@/lib/capsules-engine';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

export default function V3Experience({ posts: initialPosts }) {
  const [worldTheme, setWorldTheme] = useState('default');
  const [visibleStage, setVisibleStage] = useState('default');
  const [pillsHidden, setPillsHidden] = useState(false);
  const [dopeScrolled, setDopeScrolled] = useState(false);
  const [fallbackMode, setFallbackMode] = useState(false);
  const [posts, setPosts] = useState(initialPosts);

  const webglRef = useRef(null);
  const matrixCanvasRef = useRef(null);
  const pageOneRef = useRef(null);
  const pageDopeRef = useRef(null);
  const matrixIframeRef = useRef(null);
  const engineRef = useRef(null);

  useEffect(() => {
    let active = true;
    let engine = null;

    ensureThreeLoaded(basePath)
      .then(() => {
        if (!active || !webglRef.current || !matrixCanvasRef.current) return;
        engine = mountCapsulesEngine({
          webglContainer: webglRef.current,
          matrixCanvas: matrixCanvasRef.current,
          pageOneEl: pageOneRef.current,
          pageDopeEl: pageDopeRef.current,
          onThemeChange: (nextTheme) => {
            if (active) setWorldTheme(nextTheme);
          },
          onStageChange: (nextStage) => {
            if (active) {
              setVisibleStage(nextStage);
              if (nextStage !== 'blue') setDopeScrolled(false);
            }
          },
          onPillsHiddenChange: (hidden) => {
            if (active) setPillsHidden(hidden);
          },
          onWebGLFallback: () => {
            if (active) setFallbackMode(true);
          },
        });
        engineRef.current = engine;

        // Поддержка прямых ссылок (?style=matrix | ?style=dope | #project-id)
        const params = new URLSearchParams(window.location.search);
        const forced = params.get('style');
        if (forced === 'matrix' || forced === 'one') {
          engine.openImmediate('red');
        } else if (forced === 'dope' || forced === 'feed' || forced === 'antigravity') {
          engine.openImmediate('blue');
        } else if (window.location.hash && window.location.hash.length > 1 && window.location.hash !== '#top') {
          engine.openImmediate('blue');
        }
      })
      .catch(() => {
        if (active) setFallbackMode(true);
      });

    return () => {
      active = false;
      engineRef.current = null;
      if (engine) engine.destroy();
    };
  }, []);

  useEffect(() => {
    const dopeEl = pageDopeRef.current;
    if (!dopeEl) return;
    const onScroll = () => {
      setDopeScrolled(dopeEl.scrollTop > 120);
    };
    dopeEl.addEventListener('scroll', onScroll, { passive: true });
    return () => dopeEl.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    let active = true;
    supabase
      .from('posts')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (active && data?.length) {
          const remote = data.map((post) => ({
            ...post,
            type: post.kind,
            mediaUrl: post.media_url,
            soundcloudUrl: post.soundcloud_url,
            svgMarkup: post.svg_markup,
            likes: post.likes ?? 0,
            comments: post.comments ?? 0,
            reposts: post.reposts ?? 0,
            saves: post.saves ?? 0,
            date: new Intl.DateTimeFormat('ru', { dateStyle: 'medium' }).format(new Date(post.created_at)),
          }));
          const remoteIds = new Set(remote.map((item) => item.id));
          setPosts([...remote, ...initialPosts.filter((item) => !remoteIds.has(item.id))]);
        }
      });
    return () => {
      active = false;
    };
  }, [initialPosts]);

  const showOne = visibleStage === 'red';
  const showDope = visibleStage === 'blue';
  const mountOneIframe = worldTheme === 'red' || showOne;
  const hideCaption = SEGMENT_CONFIG.hideCaptionWhenOpen && worldTheme !== 'default';
  const hidePills = !SEGMENT_CONFIG.keepCornerPillsVisible && pillsHidden;

  function handleBackToPills() {
    setPillsHidden(false);
    if (engineRef.current) engineRef.current.backToPills();
    else {
      setWorldTheme('default');
      setVisibleStage('default');
    }
  }

  function handleSwitchToRed() {
    setPillsHidden(false);
    if (engineRef.current) engineRef.current.switchToRed();
    else {
      setWorldTheme('red');
      setVisibleStage('red');
    }
  }

  function handleSwitchToBlue() {
    setPillsHidden(false);
    if (engineRef.current) engineRef.current.switchToBlue();
    else {
      setWorldTheme('blue');
      setVisibleStage('blue');
    }
  }

  return (
    <div className={`capsules-world${worldTheme !== 'default' ? ` theme-${worldTheme}` : ''}`}>
      {/* 1. Фоновые слои тем */}
      <div id="theme-red-layer">
        <canvas id="matrix-canvas" ref={matrixCanvasRef} />
        <div className="matrix-scanlines" />
      </div>
      <div id="theme-blue-layer" />

      {/* 2. Страница One (появляется из фрагментов после красной пилюли) */}
      <section
        id="page-one"
        ref={pageOneRef}
        className={`page-stage${showOne ? ' is-visible' : ''}`}
        aria-hidden={!showOne}
      >
        <div className="one-topbar stage-item">
          <button type="button" className="one-nav-btn one-pills-btn" onClick={handleBackToPills} data-frag="chip">
            <i className="pills-mini-icon" aria-hidden="true" />
            <span>К пилюлям</span>
          </button>
          <button type="button" className="one-nav-btn" onClick={handleSwitchToBlue} data-frag="chip">
            ✦ Dope
          </button>
        </div>

        {/* Невидимый макет для точного съёма геометрии CRT-экрана фрагментами красной капсулы */}
        <div className="one-frag-blueprint" aria-hidden="true">
          <div className="one-crt-card" data-frag="panel">
            <div className="one-kicker" data-frag="lines">
              <span>ONEDOPEA // ONE</span>
              <span>КАНАЛ 01 / 07</span>
            </div>
            <div className="one-title" data-frag="lines">BOTCONTROL</div>
            <div className="one-lead" data-frag="lines">
              Автономная среда сборки и круглосуточного запуска Telegram-ботов со смартфона или ПК без аренды VPS: шифрование ключей Android Keystore, визуальные сценарии и локальные нейросети LiteRT-LM.
            </div>
            <div className="one-channels">
              <span className="one-ch-btn" data-frag="chip">01 BotControl</span>
              <span className="one-ch-btn" data-frag="chip">02 ТИТАН</span>
              <span className="one-ch-btn" data-frag="chip">03 Vision Audio</span>
              <span className="one-ch-btn" data-frag="chip">04 Подработка.МСК</span>
              <span className="one-ch-btn" data-frag="chip">05 Лесное·Афиша</span>
              <span className="one-ch-btn" data-frag="chip">06 Перекур+</span>
              <span className="one-ch-btn" data-frag="chip">07 EX</span>
            </div>
            <div className="one-actions">
              <span className="one-link" data-frag="chip">Открыть проект ↗</span>
              <span className="one-link ghost" data-frag="chip">Telegram ↗</span>
            </div>
          </div>
        </div>

        {mountOneIframe && (
          <iframe
            ref={matrixIframeRef}
            className="one-matrix-iframe stage-item"
            title="ONEDOPEA — One (7 каналов)"
            src={`${basePath}/matrix.html`}
            onLoad={() => engineRef.current?.bindIframeWindow(matrixIframeRef.current?.contentWindow)}
          />
        )}
      </section>

      {/* 3. Страница Dope (собирается из фрагментов после синей пилюли) */}
      <section
        id="page-dope"
        ref={pageDopeRef}
        className={`page-stage${showDope ? ' is-visible' : ''}`}
        aria-hidden={!showDope}
      >
        <Feed
          posts={posts}
          onMatrix={handleSwitchToRed}
          onChooseStyle={handleBackToPills}
        />
      </section>

      {/* Плавающая верхняя кнопка «К пилюлям» при прокрутке ленты Dope */}
      <button
        type="button"
        className={`dope-floating-pills-btn${showDope && dopeScrolled ? ' is-shown' : ''}`}
        onClick={handleBackToPills}
        tabIndex={showDope && dopeScrolled ? 0 : -1}
      >
        <i className="pills-mini-icon" aria-hidden="true" />
        <span>К пилюлям</span>
      </button>

      {/* 4. Слой 3D-капсул и надпись «Выбирай!» */}
      <div
        id="webgl-container"
        ref={webglRef}
        className={hidePills ? 'pills-hidden' : ''}
      />

      <div id="v3-fallback" className={`${fallbackMode ? 'show' : ''}${showOne || showDope ? ' page-open' : ''}`}>
        <div className="v3-fb-grid">
          <button type="button" className="v3-fb-pill" onClick={handleSwitchToRed} aria-label="Красная капсула">
            <span className="v3-fb-cap red" />
          </button>
          <button type="button" className="v3-fb-pill" onClick={handleSwitchToBlue} aria-label="Синяя капсула">
            <span className="v3-fb-cap blue" />
          </button>
        </div>
      </div>

      <div id="choose-caption" className={hideCaption ? 'is-hidden' : ''}>
        Выбирай!
      </div>
    </div>
  );
}
