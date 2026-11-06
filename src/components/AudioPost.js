'use client';

import { useEffect, useRef, useState } from 'react';
import { claimAudio, releaseAudio } from '@/lib/audio-manager';

function loadSoundCloudApi() {
  if (window.SC?.Widget) return Promise.resolve(window.SC.Widget);
  if (!window.__onedopeaSoundCloudApi) {
    window.__onedopeaSoundCloudApi = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://w.soundcloud.com/player/api.js';
      script.async = true;
      script.onload = () => window.SC?.Widget ? resolve(window.SC.Widget) : reject(new Error('SoundCloud API unavailable'));
      script.onerror = () => reject(new Error('SoundCloud API failed to load'));
      document.head.appendChild(script);
    });
  }
  return window.__onedopeaSoundCloudApi;
}

function Waveform({ audioRef, src, progress: externalProgress, onSeek }) {
  const canvasRef = useRef(null);
  const [localProgress, setLocalProgress] = useState(0);
  const progress = externalProgress ?? localProgress;

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
    const update = () => setLocalProgress(audio.duration ? audio.currentTime / audio.duration : 0);
    audio.addEventListener('timeupdate', update);
    return () => audio.removeEventListener('timeupdate', update);
  }, [audioRef]);

  function seek(event) {
    const rect = canvasRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    if (onSeek) { onSeek(ratio); return; }
    const audio = audioRef.current;
    if (audio?.duration) audio.currentTime = ratio * audio.duration;
  }
  return <canvas className={src || onSeek ? 'waveform interactive' : 'waveform'} ref={canvasRef} onClick={seek} aria-label={onSeek || src ? 'Форма волны, нажмите для перемотки' : 'Декоративная звуковая волна'} />;
}

export default function AudioPost({ post }) {
  const audioRef = useRef(null);
  const cardRef = useRef(null);
  const iframeRef = useRef(null);
  const widgetRef = useRef(null);
  const widgetControllerRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [widgetReady, setWidgetReady] = useState(false);
  const [widgetError, setWidgetError] = useState(false);
  const [progress, setProgress] = useState(0);
  const usesSoundCloud = Boolean(post.soundcloudUrl);

  useEffect(() => {
    if (!usesSoundCloud || !iframeRef.current) return;
    let active = true;
    let widget;
    loadSoundCloudApi().then((Widget) => {
      if (!active || !iframeRef.current) return;
      widget = Widget(iframeRef.current);
      widgetRef.current = widget;
      widgetControllerRef.current = { pause: () => widget.pause() };
      widget.bind(Widget.Events.READY, () => { if (active) setWidgetReady(true); });
      widget.bind(Widget.Events.PLAY, () => {
        claimAudio(widgetControllerRef.current);
        if (active) setPlaying(true);
      });
      widget.bind(Widget.Events.PAUSE, () => {
        releaseAudio(widgetControllerRef.current);
        if (active) setPlaying(false);
      });
      widget.bind(Widget.Events.FINISH, () => {
        releaseAudio(widgetControllerRef.current);
        if (active) { setPlaying(false); setProgress(0); }
      });
      widget.bind(Widget.Events.PLAY_PROGRESS, (event) => {
        if (active && event.duration) setProgress(Math.max(0, Math.min(1, event.currentPosition / event.duration)));
      });
    }).catch(() => { if (active) setWidgetError(true); });
    return () => {
      active = false;
      if (widget) {
        widget.pause();
        releaseAudio(widgetControllerRef.current);
      }
      widgetRef.current = null;
      widgetControllerRef.current = null;
    };
  }, [usesSoundCloud, post.soundcloudUrl]);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.intersectionRatio >= .12) return;
      const audio = audioRef.current;
      if (audio && !audio.paused) {
        const start = audio.volume; const t0 = performance.now();
        const fade = (now) => { const p = Math.min(1, (now - t0) / 350); audio.volume = start * (1 - p); if (p < 1) requestAnimationFrame(fade); else { audio.pause(); audio.volume = start; releaseAudio(audio); setPlaying(false); } };
        requestAnimationFrame(fade);
      }
      const widget = widgetRef.current;
      if (widget && playing) widget.pause();
    }, { threshold: .12 });
    observer.observe(card);
    return () => observer.disconnect();
  }, [playing]);

  function togglePlayback() {
    if (usesSoundCloud) {
      const widget = widgetRef.current;
      if (!widgetReady || !widget) return;
      if (playing) widget.pause();
      else widget.play();
      return;
    }
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      claimAudio(audio);
      audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else { audio.pause(); releaseAudio(audio); setPlaying(false); }
  }

  function seekSoundCloud(ratio) {
    const widget = widgetRef.current;
    if (widget) widget.getDuration((duration) => widget.seekTo(duration * ratio));
  }

  const iframeSrc = usesSoundCloud
    ? `https://w.soundcloud.com/player/?url=${encodeURIComponent(post.soundcloudUrl)}&auto_play=false&hide_related=true&visual=false&show_comments=false&show_user=false&show_reposts=false&show_teaser=false&sharing=false&download=false&buying=false&liking=false&show_playcount=false`
    : undefined;

  return (
    <div className="audio-post" ref={cardRef} data-visible={playing || widgetReady ? 'true' : undefined}>
      {post.mediaUrl && <audio ref={audioRef} src={post.mediaUrl} preload="metadata" loop onEnded={() => { setPlaying(false); releaseAudio(audioRef.current); }} onPause={() => setPlaying(false)} />}
      {usesSoundCloud && <iframe ref={iframeRef} className="soundcloud-widget-frame" title={`SoundCloud player: ${post.trackTitle || 'track'}`} allow="autoplay" loading="eager" src={iframeSrc} />}
      <div className="audio-cover"><div className="cover-orb" /><span className="cover-mark">O.</span><span className="cover-label">ONEDOPEA • AUDIO</span></div>
      <div className="audio-controls">
        <button className="play-button" onClick={togglePlayback} disabled={usesSoundCloud && !widgetReady && !widgetError} aria-label={playing ? 'Пауза' : 'Воспроизвести'}>{playing ? 'Ⅱ' : '▶'}</button>
        <div className="audio-details"><strong>{post.trackTitle || 'Звуковой дневник'}</strong><span>{post.audioBy || 'ONEDOPEA'} · {usesSoundCloud ? 'SoundCloud' : 'MP3'}</span></div>
        <span className="audio-duration">{widgetError ? 'ОШИБКА ПЛЕЕРА' : playing ? 'PLAYING' : usesSoundCloud && !widgetReady ? 'ЗАГРУЗКА…' : 'AUDIO POST'}</span>
      </div>
      <Waveform audioRef={audioRef} src={post.mediaUrl} progress={usesSoundCloud ? progress : undefined} onSeek={usesSoundCloud ? seekSoundCloud : undefined} />
      {usesSoundCloud && <div className="sc-link-row"><span>{widgetError ? 'Можно открыть трек на SoundCloud' : 'Встроенное воспроизведение'}</span><a href={post.soundcloudUrl} target="_blank" rel="noreferrer">Открыть трек ↗</a></div>}
    </div>
  );
}
