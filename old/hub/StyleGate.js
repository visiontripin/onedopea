'use client';

import { useEffect, useState } from 'react';
import Feed from './Feed';
import { createClient } from '@/lib/supabase/client';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

export default function StyleGate({ posts: initialPosts }) {
  const [mode, setMode] = useState(null);
  const [posts, setPosts] = useState(initialPosts);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const forced = params.get('style');
    if (forced === 'matrix') {
      setMode('matrix');
      return;
    }
    if (forced === 'antigravity' || forced === 'feed' || forced === 'dope') {
      setMode('antigravity');
      return;
    }
    if (window.location.hash && window.location.hash.length > 1 && window.location.hash !== '#top') {
      setMode('antigravity');
    }
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

  if (mode === 'antigravity') {
    return <Feed posts={posts} onMatrix={() => setMode('matrix')} onChooseStyle={() => setMode(null)} />;
  }

  if (mode === 'matrix') {
    return (
      <div className="matrix-shell">
        <button className="matrix-back" onClick={() => setMode(null)}>↶ Выбрать стиль</button>
        <iframe title="ONEDOPEA — матричная версия" src={`${basePath}/matrix.html`} />
      </div>
    );
  }

  return (
    <main className="style-gate">
      <div className="gate-ambient" aria-hidden="true"><i /><i /><i /></div>
      <a className="gate-brand" href="#top" aria-label="Домой"><span>O.</span></a>
      <h1 id="top">Выбери своё<br /><em>пространство.</em></h1>
      <p className="gate-sublead">Шесть проектов и публикации в двух визуальных режимах</p>
      <div className="gate-options">
        <button className="gate-card matrix-choice" onClick={() => setMode('matrix')}>
          <span className="gate-icon">⌘</span>
          <span className="gate-mode">ВЕРСИЯ 1</span>
          <strong>One</strong>
          <span className="gate-description">Неоновый дождь, аналоговый шум и интерактивное переключение шести каналов.</span>
          <span className="gate-launch">Запуск <i>↗</i></span>
        </button>
        <button className="gate-card anti-choice" onClick={() => setMode('antigravity')}>
          <span className="gate-orbit" />
          <span className="gate-icon">✦</span>
          <span className="gate-mode">ВЕРСИЯ 2</span>
          <strong>Dope</strong>
          <span className="gate-description">Светлая лента проектов, векторные интерфейсы, музыка и свободное движение.</span>
          <span className="gate-launch">Запуск <i>↗</i></span>
        </button>
      </div>
      <p className="gate-foot">Два настроения · один мир</p>
    </main>
  );
}
