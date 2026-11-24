'use client';

import { useState } from 'react';
import Feed from './Feed';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

export default function V2Experience({ posts }) {
  const [mode, setMode] = useState(null);

  if (mode === 'antigravity') {
    return (
      <Feed
        posts={posts}
        legacyV2
        onMatrix={() => setMode('matrix')}
        onChooseStyle={() => setMode(null)}
      />
    );
  }

  if (mode === 'matrix') {
    return (
      <div className="matrix-shell">
        <div className="matrix-back-group">
          <button className="matrix-back" onClick={() => setMode(null)}>↶ Выбрать стиль (v2)</button>
          <a className="matrix-back" href={`${basePath}/`}>Версии (v1–v3)</a>
        </div>
        <iframe title="ONEDOPEA v2 — матричная версия" src={`${basePath}/v2/matrix.html`} />
      </div>
    );
  }

  return (
    <main className="style-gate">
      <div className="gate-ambient" aria-hidden="true"><i /><i /><i /></div>
      <a className="gate-brand" href={`${basePath}/`} aria-label="К выбору версии">
        <span>O.</span>
        ONEDOPEA · V2
      </a>
      <div className="gate-top-right">
        <a className="admin-link" href={`${basePath}/`}>↶ Все версии</a>
        <a className="admin-link" href={`${basePath}/v3/`}>Перейти в v3 →</a>
      </div>
      <h1 id="top">Выбери своё<br /><em>пространство.</em></h1>
      <p className="gate-sublead">Сохранённая версия сайта v2 · два визуальных режима</p>
      <div className="gate-options">
        <button className="gate-card matrix-choice" onClick={() => setMode('matrix')}>
          <span className="gate-icon">⌘</span>
          <span className="gate-mode">ВЕРСИЯ 1 (V2)</span>
          <strong>One</strong>
          <span className="gate-description">Неоновый дождь, аналоговый шум и оригинальная атмосфера.</span>
          <span className="gate-launch">Запуск <i>↗</i></span>
        </button>
        <button className="gate-card anti-choice" onClick={() => setMode('antigravity')}>
          <span className="gate-orbit" />
          <span className="gate-icon">✦</span>
          <span className="gate-mode">ВЕРСИЯ 2 (V2)</span>
          <strong>Dope</strong>
          <span className="gate-description">Светлая лента проектов, мягкие градиенты и свободное движение.</span>
          <span className="gate-launch">Запуск <i>↗</i></span>
        </button>
      </div>
      <p className="gate-foot">
        Два настроения · один мир ·{' '}
        <a href={`${basePath}/index-v2.html`} style={{ color: '#6e83c2', textDecoration: 'none', fontWeight: 700 }}>
          автономная сборка index-v2.html ↗
        </a>
      </p>
    </main>
  );
}
