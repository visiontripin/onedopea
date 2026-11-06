'use client';

import { useEffect, useRef, useState } from 'react';
import { claimAudio, releaseAudio } from '@/lib/audio-manager';

function Waveform({ audioRef, src }) {
  const canvasRef = useRef(null);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const draw = () => {
      const width = canvas.clientWidth || 600;
      const height = canvas.clientHeight || 110;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr; canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, width, height);
      const count = Math.floor(width / 4.2); const gap = 2; const bar = Math.max(1.4, (width - count * gap) / count);
      for (let i = 0; i < count; i++) {
        const wave = .18 + Math.abs(Math.sin(i * .19) * Math.cos(i * .043)) * .72;
        const h = Math.max(4, wave * height * .82); const x = i * (bar + gap); const y = (height - h) / 2;
        ctx.fillStyle = i / count <= progress ? '#788fe2' : '#d9dfef';
        ctx.beginPath(); ctx.roundRect(x, y, bar, h, bar); ctx.fill();
      }
    };
    draw(); const observer = new ResizeObserver(draw); observer.observe(canvas);
    return () => observer.disconnect();
  }, [progress]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const update = () => setProgress(audio.duration ? audio.currentTime / audio.duration : 0);
    audio.addEventListener('timeupdate', update);
    return () => audio.removeEventListener('timeupdate', update);
  }, [audioRef]);

  function seek(event) {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    const rect = canvasRef.current.getBoundingClientRect();
    audio.currentTime = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)) * audio.duration;
  }
  return <canvas className={src ? 'waveform interactive' : 'waveform'} ref={canvasRef} onClick={seek} aria-label={src ? 'Форма аудио волны, нажмите для перемотки' : 'Декоративная звуковая волна'} />;
}

export default function AudioPost({ post }) {
  const audioRef = useRef(null);
  const cardRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [soundcloudReady, setSoundcloudReady] = useState(false);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const observer = new IntersectionObserver(([entry]) => {
      const audio = audioRef.current;
      if (entry.isIntersecting) return;
      if (audio && !audio.paused) {
        const start = audio.volume; const t0 = performance.now();
        const fade = (now) => { const p = Math.min(1, (now - t0) / 350); audio.volume = start * (1 - p); if (p < 1) requestAnimationFrame(fade); else { audio.pause(); audio.volume = start; setPlaying(false); } };
        requestAnimationFrame(fade);
      }
    }, { threshold: .12 });
    observer.observe(card);
    return () => observer.disconnect();
  }, []);

  async function toggleAudio() {
    const audio = audioRef.current;
    if (!audio) { setSoundcloudReady(true); return; }
    if (audio.paused) {
      claimAudio(audio);
      try { await audio.play(); setPlaying(true); } catch { setPlaying(false); }
    } else { audio.pause(); releaseAudio(audio); setPlaying(false); }
  }

  return (
    <div className="audio-post" ref={cardRef}>
      {post.mediaUrl ? <audio ref={audioRef} src={post.mediaUrl} preload="metadata" onEnded={() => setPlaying(false)} /> : null}
      <div className="audio-cover"><div className="cover-orb" /><span className="cover-mark">O.</span><span className="cover-label">ONEDOPEA • AUDIO</span></div>
      <div className="audio-controls">
        <button className="play-button" onClick={toggleAudio} aria-label={playing ? 'Пауза' : 'Воспроизвести'}>{playing ? 'Ⅱ' : '▶'}</button>
        <div className="audio-details"><strong>{post.trackTitle || 'Звуковой дневник'}</strong><span>{post.audioBy || 'ONEDOPEA'} · SoundCloud</span></div>
        <span className="audio-duration">{playing ? 'PLAYING' : 'AUDIO POST'}</span>
      </div>
      <Waveform audioRef={audioRef} src={post.mediaUrl} />
      {post.soundcloudUrl && <div className="soundcloud-embed"><iframe title="Плеер SoundCloud ONEDOPEA" allow="autoplay" loading="lazy" src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(post.soundcloudUrl)}&color=%23758ee2&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&visual=true`} /><div className="sc-link-row"><span>{soundcloudReady ? `Откройте ${post.trackTitle || 'трек'} в SoundCloud` : 'Слушать на SoundCloud'}</span><a href={post.soundcloudUrl} target="_blank" rel="noreferrer">Открыть трек ↗</a></div></div>}
    </div>
  );
}
