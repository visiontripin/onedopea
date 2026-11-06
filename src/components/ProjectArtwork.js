'use client';

import { useEffect, useRef, useState } from 'react';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

export default function ProjectArtwork({ post }) {
  const rootRef = useRef(null);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const artworks = post.artworks || [];

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.12 });
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || artworks.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % artworks.length), 4800);
    return () => window.clearInterval(timer);
  }, [visible, artworks.length]);

  if (!artworks.length) return <div className="project-media"><span className="project-media-orb">O.</span></div>;
  const active = artworks[index];

  return (
    <div className={`project-artwork ${post.theme ? `project-artwork-${post.theme}` : ''} ${visible ? 'is-visible' : ''}`} ref={rootRef} aria-label={`${post.projectName}: ${active.alt}`}>
      <div className="project-art-stage">
        {artworks.map((art, itemIndex) => (
          <div className={`project-art-slide ${itemIndex === index ? 'active' : ''}`} key={art.src} aria-hidden={itemIndex !== index}>
            <img className={`project-art-img ${art.kind || 'icon'}`} src={`${basePath}${art.src}`} alt={itemIndex === index ? art.alt : ''} loading="lazy" />
          </div>
        ))}
      </div>
      <div className="project-art-meta"><span>{post.projectName}</span><span>{String(index + 1).padStart(2, '0')} / {String(artworks.length).padStart(2, '0')}</span></div>
      {artworks.length > 1 && <div className="project-art-controls" aria-label="Слайды проекта">
        <button type="button" aria-label="Предыдущий экран" onClick={() => setIndex((index - 1 + artworks.length) % artworks.length)}>‹</button>
        <div>{artworks.map((art, itemIndex) => <button type="button" key={art.src} className={itemIndex === index ? 'active' : ''} aria-label={`Показать: ${art.alt}`} onClick={() => setIndex(itemIndex)} />)}</div>
        <button type="button" aria-label="Следующий экран" onClick={() => setIndex((index + 1) % artworks.length)}>›</button>
      </div>}
    </div>
  );
}
