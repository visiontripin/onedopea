'use client';

import { useEffect, useRef, useState } from 'react';

export default function VideoPost({ post }) {
  const videoRef = useRef(null);
  const frameRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    const frame = frameRef.current;
    if (!video || !frame || !post.mediaUrl) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.intersectionRatio >= .62) {
        video.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
      } else { video.pause(); setPlaying(false); }
    }, { threshold: [0, .62, 1] });
    observer.observe(frame);
    return () => { observer.disconnect(); video.pause(); };
  }, [post.mediaUrl]);

  return (
    <div className="video-post" ref={frameRef}>
      {post.mediaUrl ? <video ref={videoRef} src={post.mediaUrl} poster={post.poster || undefined} muted={muted} loop playsInline preload="metadata" /> : (
        <div className="video-placeholder" role="img" aria-label="Место для промо-видео BotControl">
          <div className="video-window"><div className="video-window-top"><i/><i/><i/><span>botcontrol.app</span></div><div className="video-flow"><b>BOTCONTROL</b><div className="video-node">Новый сценарий</div><div className="video-connector"/><div className="video-node lilac">Добавить кнопку</div><div className="video-connector"/><div className="video-node pale">Опубликовать бота</div></div></div>
          <span className="video-demo-note">ПРОМО • ВИДЕО-ДЕМО</span>
        </div>
      )}
      <div className="video-overlay"><span className="video-live"><i/> {post.mediaUrl ? (playing ? 'DEMO PLAYING' : 'DEMO READY') : 'VIDEO POST'}</span><button onClick={() => { if (!videoRef.current) return; const next = !muted; setMuted(next); videoRef.current.muted = next; }} disabled={!post.mediaUrl}>{muted ? 'Включить звук' : 'Выключить звук'}</button></div>
    </div>
  );
}
