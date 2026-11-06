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

function Waveform({ audioRef, src, waveformUrl, progress = 0, onSeek }) {
  const canvasRef = useRef(null);
  const progressRef = useRef(progress);
  const [imageFailed, setImageFailed] = useState(false);
  progressRef.current = progress;

  useEffect(() => setImageFailed(false), [waveformUrl]);

  useEffect(() => {
    if (waveformUrl && !imageFailed) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const audio = audioRef.current;
    let audioContext;
    let analyser;
    let frequencyData;
    let frame = 0;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (src && audio && AudioContextClass) {
        audioContext = new AudioContextClass();
        const source = audioContext.createMediaElementSource(audio);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = .82;
        frequencyData = new Uint8Array(analyser.frequencyBinCount);
        source.connect(analyser);
        analyser.connect(audioContext.destination);
      }
    } catch { analyser = null; }

    const context = canvas.getContext('2d');
    const draw = () => {
      const width = canvas.clientWidth || 600;
      const height = canvas.clientHeight || 62;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const pixelWidth = Math.round(width * dpr);
      const pixelHeight = Math.round(height * dpr);
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth; canvas.height = pixelHeight;
      }
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);
      if (analyser) analyser.getByteFrequencyData(frequencyData);
      const count = Math.max(1, Math.floor(width / 4.2));
      const gap = 2;
      const barWidth = Math.max(1.4, (width - count * gap) / count);
      for (let i = 0; i < count; i++) {
        const sample = analyser ? frequencyData[Math.floor(i / count * frequencyData.length)] / 255 : .25 + Math.abs(Math.sin(i * .19) * Math.cos(i * .043)) * .52;
        const barHeight = Math.max(4, (.14 + sample * .82) * height);
        const x = i * (barWidth + gap);
        const y = (height - barHeight) / 2;
        context.fillStyle = i / count <= progressRef.current ? '#788fe2' : '#d9dfef';
        context.beginPath(); context.roundRect(x, y, barWidth, barHeight, barWidth); context.fill();
      }
      if ((analyser && audio && !audio.paused) || (onSeek && !waveformUrl)) frame = requestAnimationFrame(draw);
    };
    const redraw = () => { cancelAnimationFrame(frame); draw(); };
    const resume = () => { audioContext?.resume(); redraw(); };
    const stop = () => { cancelAnimationFrame(frame); draw(); };
    const observer = new ResizeObserver(redraw);
    observer.observe(canvas);
    audio?.addEventListener('play', resume);
    audio?.addEventListener('pause', stop);
    draw();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      audio?.removeEventListener('play', resume);
      audio?.removeEventListener('pause', stop);
      audioContext?.close();
    };
  }, [audioRef, src, waveformUrl, imageFailed]);

  function seek(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    if (onSeek) { onSeek(ratio); return; }
    const audio = audioRef.current;
    if (audio?.duration) audio.currentTime = ratio * audio.duration;
  }

  if (waveformUrl && !imageFailed) return (
    <div className="waveform-sc" role="slider" aria-label="SoundCloud waveform; click to seek" aria-valuenow={Math.round(progress * 100)} aria-valuemin="0" aria-valuemax="100" tabIndex={0} onClick={seek} onKeyDown={(event) => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') onSeek?.(Math.max(0, Math.min(1, progress + (event.key === 'ArrowRight' ? .03 : -.03)))); }}>
      <img src={waveformUrl} alt="" onError={() => setImageFailed(true)} />
      <span className="waveform-sc-played" style={{ width: `${progress * 100}%` }} />
      <i style={{ left: `${progress * 100}%` }} />
    </div>
  );
  return <canvas className={src || onSeek ? 'waveform interactive' : 'waveform'} ref={canvasRef} onClick={seek} aria-label={src || onSeek ? 'Аудиоспектр, нажмите для перемотки' : 'Декоративная звуковая волна'} />;
}

export default function AudioPost({ post }) {
  const audioRef = useRef(null);
  const iframeRef = useRef(null);
  const widgetRef = useRef(null);
  const widgetControllerRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [widgetReady, setWidgetReady] = useState(false);
  const [widgetError, setWidgetError] = useState(false);
  const [progress, setProgress] = useState(0);
  const [localProgress, setLocalProgress] = useState(0);
  const [waveformUrl, setWaveformUrl] = useState('');
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
      const loadTrackWaveform = () => widget.getCurrentSound((sound) => {
        const waveform = sound?.waveform_url || sound?.waveformUrl;
        if (active && waveform) setWaveformUrl(waveform);
      });
      widget.bind(Widget.Events.READY, () => {
        if (!active) return;
        setWidgetReady(true);
        loadTrackWaveform();
      });
      widget.bind(Widget.Events.PLAY, () => {
        loadTrackWaveform();
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
      audio.play().then(() => setPlaying(true)).catch(() => { releaseAudio(audio); setPlaying(false); });
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
    <div className="audio-post">
      {post.mediaUrl && <audio ref={audioRef} src={post.mediaUrl} crossOrigin="anonymous" preload="metadata" loop onTimeUpdate={(event) => { const audio = event.currentTarget; if (audio.duration) setLocalProgress(audio.currentTime / audio.duration); }} onEnded={() => { setPlaying(false); releaseAudio(audioRef.current); }} onPause={() => { setPlaying(false); releaseAudio(audioRef.current); }} />}
      {usesSoundCloud && <iframe ref={iframeRef} className="soundcloud-widget-frame" title={`SoundCloud player: ${post.trackTitle || 'track'}`} allow="autoplay" loading="eager" src={iframeSrc} />}
      <div className="audio-cover"><div className="cover-orb" /><span className="cover-mark">O.</span><span className="cover-label">ONEDOPEA • AUDIO</span></div>
      <div className="audio-controls">
        <button className="play-button" onClick={togglePlayback} disabled={usesSoundCloud && !widgetReady && !widgetError} aria-label={playing ? 'Пауза' : 'Воспроизвести'}>{playing ? 'Ⅱ' : '▶'}</button>
        <div className="audio-details"><strong>{post.trackTitle || 'Звуковой дневник'}</strong><span>{post.audioBy || 'ONEDOPEA'} · {usesSoundCloud ? 'SoundCloud' : 'MP3'}</span></div>
        <span className="audio-duration">{widgetError ? 'ОШИБКА ПЛЕЕРА' : playing ? 'PLAYING' : usesSoundCloud && !widgetReady ? 'ЗАГРУЗКА…' : 'AUDIO POST'}</span>
      </div>
      <Waveform audioRef={audioRef} src={post.mediaUrl} waveformUrl={waveformUrl} progress={usesSoundCloud ? progress : localProgress} onSeek={usesSoundCloud ? seekSoundCloud : undefined} />
      {usesSoundCloud && <div className="sc-link-row"><span>{widgetError ? 'Можно открыть трек на SoundCloud' : 'Встроенное воспроизведение'}</span><a href={post.soundcloudUrl} target="_blank" rel="noreferrer">Открыть трек ↗</a></div>}
    </div>
  );
}
