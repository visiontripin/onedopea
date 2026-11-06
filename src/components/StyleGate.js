'use client';

import { useEffect, useState } from 'react';
import Feed from './Feed';
import { createClient } from '@/lib/supabase/client';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

export default function StyleGate({ posts: initialPosts }) {
  const [mode, setMode] = useState(null);
  const [posts, setPosts] = useState(initialPosts);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    let active = true;
    supabase.from('posts').select('*').eq('is_published', true).order('created_at', { ascending: false }).then(({ data }) => {
      if (active && data?.length) setPosts(data.map((post) => ({
        ...post, type: post.kind, mediaUrl: post.media_url, soundcloudUrl: post.soundcloud_url,
        svgMarkup: post.svg_markup, likes: 0, comments: 0, reposts: 0, saves: 0,
        date: new Intl.DateTimeFormat('ru', { dateStyle: 'medium' }).format(new Date(post.created_at)),
      })));
    });
    return () => { active = false; };
  }, []);

  if (mode === 'antigravity') return <Feed posts={posts} onMatrix={() => setMode('matrix')} onChooseStyle={() => setMode(null)} />;
  if (mode === 'matrix') return <div className="matrix-shell"><button className="matrix-back" onClick={() => setMode(null)}>↶ Выбрать стиль</button><iframe title="ONEDOPEA — матричная версия" src={`${basePath}/matrix.html`} /></div>;
  return (
    <main className="style-gate">
      <div className="gate-ambient" aria-hidden="true"><i/><i/><i/></div>
      <a className="gate-brand" href="#top" aria-label="Домой"><span>O.</span></a>
      <h1 id="top">Выбери своё<br/><em>пространство.</em></h1>
      <p className="gate-lead">Хули ты тут делаешь?!</p><p className="gate-sublead">Два визуальных режима одного портфолио</p>
      <div className="gate-options">
        <button className="gate-card matrix-choice" onClick={() => setMode('matrix')}>
          <span className="gate-icon">⌘</span><span className="gate-mode">ВЕРСИЯ 1</span><strong>Матрица</strong><span className="gate-description">Неоновый дождь, аналоговый шум и оригинальная атмосфера.</span><span className="gate-launch">Запуск <i>↗</i></span>
        </button>
        <button className="gate-card anti-choice" onClick={() => setMode('antigravity')}>
          <span className="gate-orbit"/><span className="gate-icon">✦</span><span className="gate-mode">ВЕРСИЯ 2</span><strong>Антигравитация</strong><span className="gate-description">Светлая лента проектов, мягкие градиенты и свободное движение.</span><span className="gate-launch">Запуск <i>↗</i></span>
        </button>
      </div>
      <p className="gate-foot">Два настроения · один мир</p>
    </main>
  );
}
