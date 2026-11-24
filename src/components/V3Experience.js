'use client';

import { useEffect, useState } from 'react';
import Feed from './Feed';
import { createClient } from '@/lib/supabase/client';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

export default function V3Experience({ posts: initialPosts }) {
  const [mode, setMode] = useState('capsules');
  const [posts, setPosts] = useState(initialPosts);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const forced = params.get('style');
    if (forced === 'matrix' || forced === 'one') {
      setMode('matrix');
      return;
    }
    if (forced === 'dope' || forced === 'feed' || forced === 'antigravity') {
      setMode('dope');
      return;
    }
    if (window.location.hash && window.location.hash.length > 1 && window.location.hash !== '#top') {
      setMode('dope');
    }
  }, []);

  useEffect(() => {
    function onMessage(event) {
      const payload = event?.data;
      if (!payload || payload.type !== 'onedopea:v3-choice') return;
      if (payload.mode === 'matrix') setMode('matrix');
      else if (payload.mode === 'dope') setMode('dope');
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
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

  if (mode === 'dope') {
    return (
      <Feed
        posts={posts}
        onMatrix={() => setMode('matrix')}
        onChooseStyle={() => setMode('capsules')}
      />
    );
  }

  if (mode === 'matrix') {
    return (
      <div className="matrix-shell">
        <div className="matrix-back-group">
          <button type="button" className="matrix-back" onClick={() => setMode('capsules')}>
            ↶ Капсулы
          </button>
          <button type="button" className="matrix-back" onClick={() => setMode('dope')}>
            ✦ Dope
          </button>
        </div>
        <iframe title="ONEDOPEA — One (7 каналов)" src={`${basePath}/matrix.html`} />
      </div>
    );
  }

  return (
    <div className="v3-capsule-shell">
      <iframe title="ONEDOPEA — Выбирай!" src={`${basePath}/capsules.html`} />
    </div>
  );
}
