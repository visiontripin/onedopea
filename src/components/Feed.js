'use client';

import { useEffect, useRef, useState } from 'react';
import { demoPosts } from '@/data/posts';
import BioHeader from './BioHeader';
import PostWrapper from './PostWrapper';
import AudioPost from './AudioPost';
import VideoPost from './VideoPost';
import SvgPost from './SvgPost';
import ProjectArtwork from './ProjectArtwork';

function PostMedia({ post }) {
  if (post.type === 'audio') return <AudioPost post={post} />;
  if (post.type === 'video') return <VideoPost post={post} />;
  if (post.type === 'svg') return <SvgPost markup={post.svgMarkup || post.svg_markup} />;
  return <ProjectArtwork post={post} />;
}

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

export default function Feed({ onMatrix, onChooseStyle, posts = demoPosts }) {
  const [count, setCount] = useState(4);
  const sentinel = useRef(null);
  const projectsCount = posts.filter((post) => post.featuredProject).length || 7;

  useEffect(() => {
    if (!sentinel.current || count >= posts.length) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setCount((current) => Math.min(posts.length, current + 3));
      },
      { rootMargin: '300px' },
    );
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [count, posts.length]);

  useEffect(() => {
    function revealHashTarget() {
      const rawHash = window.location.hash;
      if (!rawHash || rawHash.length <= 1 || rawHash === '#top') return;
      const targetId = decodeURIComponent(rawHash.slice(1));
      const idx = posts.findIndex((item) => item.id === targetId);
      if (idx === -1) return;
      setCount((current) => Math.max(current, idx + 2));
      window.setTimeout(() => {
        document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 45);
    }

    revealHashTarget();
    window.addEventListener('hashchange', revealHashTarget);
    return () => window.removeEventListener('hashchange', revealHashTarget);
  }, [posts]);

  return (
    <main className="feed-page">
      <BioHeader
        postsCount={posts.length}
        projectsCount={projectsCount}
        onMatrix={onMatrix}
        onChooseStyle={onChooseStyle}
      />
      <section className="feed-column" aria-label="Лента публикаций">
        {posts.slice(0, count).map((post) => (
          <PostWrapper post={post} key={post.id}>
            <PostMedia post={post} />
          </PostWrapper>
        ))}
        <div className="feed-end" ref={sentinel}>
          {count < posts.length ? (
            <span className="loading-orb" />
          ) : (
            <span>Вы дошли до текущего края вселенной · скоро будут новые посты</span>
          )}
        </div>
      </section>
      <footer className="feed-footer">
        <span>ONEDOPEA</span>
        <a href={`${basePath}/EX/index.html`}>EX ↗</a>
        <a href="https://github.com/visiontripin" target="_blank" rel="noreferrer">GitHub ↗</a>
        <a href="https://t.me/onedopea" target="_blank" rel="noreferrer">Telegram ↗</a>
        <a href="https://soundcloud.com/onedopea" target="_blank" rel="noreferrer">SoundCloud ↗</a>
        <a href={`${basePath}/admin/`}>Админ-панель</a>
      </footer>
    </main>
  );
}
