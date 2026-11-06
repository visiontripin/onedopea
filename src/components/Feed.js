'use client';

import { useEffect, useRef, useState } from 'react';
import { demoPosts } from '@/data/posts';
import BioHeader from './BioHeader';
import PostWrapper from './PostWrapper';
import AudioPost from './AudioPost';
import VideoPost from './VideoPost';
import SvgPost from './SvgPost';

function PostMedia({ post }) {
  if (post.type === 'audio') return <AudioPost post={post} />;
  if (post.type === 'video') return <VideoPost post={post} />;
  if (post.type === 'svg') return <SvgPost markup={post.svgMarkup || post.svg_markup} />;
  return <div className="project-media"><span className="project-media-orb">{post.author === 'ONEDOPEA' ? 'O.' : '✦'}</span><span className="project-media-caption">{post.tags?.[0]}</span></div>;
}

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

export default function Feed({ onMatrix, onChooseStyle, posts = demoPosts }) {
  const [count, setCount] = useState(3);
  const sentinel = useRef(null);
  useEffect(() => {
    if (!sentinel.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setCount((current) => Math.min(posts.length, current + 3));
    }, { rootMargin: '300px' });
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [posts.length]);

  return (
    <main className="feed-page">
      <BioHeader postsCount={posts.length} onMatrix={onMatrix} onChooseStyle={onChooseStyle} />
      <section className="feed-column" aria-label="Лента публикаций">
        {posts.slice(0, count).map((post) => <PostWrapper post={post} key={post.id}><PostMedia post={post}/></PostWrapper>)}
        <div className="feed-end" ref={sentinel}>{count < posts.length ? <span className="loading-orb"/> : <span>Вы дошли до текущего края вселенной · скоро будут новые посты</span>}</div>
      </section>
      <footer className="feed-footer"><span>ONEDOPEA · АНТИГРАВИТАЦИЯ</span><a href="https://soundcloud.com/onedopea" target="_blank" rel="noreferrer">SoundCloud ↗</a><a href={`${basePath}/admin/`}>Админ-панель</a></footer>
    </main>
  );
}
