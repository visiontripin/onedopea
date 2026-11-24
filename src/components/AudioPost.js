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
      script.onload = () => (window.SC?.Widget ? resolve(window.SC.Widget) : reject(new Error('SoundCloud API unavailable')));
      script.onerror = () => reject(new Error('SoundCloud API failed to load'));
      document.head.appendChild(script);
    });
  }
  return window.__onedopeaSoundCloudApi;
}

function upgradeArtworkUrl(url) {
  if (!url) return '';
  return url.replace(/-large\.(jpg|png)$/i, '-t500x500.$1');
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
        analyser.smoothingTimeConstant = 0.82;
        frequencyData = new Uint8Array(analyser.frequencyBinCount);
        source.connect(analyser);
        analyser.connect(audioContext.destination);
      }
    } catch {
      analyser = null;
    }

    const context = canvas.getContext('2d');
    const draw = () => {
      const width = canvas.clientWidth || 600;
      const height = canvas.clientHeight || 62;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const pixelWidth = Math.round(width * dpr);
      const pixelHeight = Math.round(height * dpr);
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);
      if (analyser) analyser.getByteFrequencyData(frequencyData);
      const count = Math.max(1, Math.floor(width / 4.2));
      const gap = 2;
      const barWidth = Math.max(1.4, (width - count * gap) / count);
      for (let i = 0; i < count; i++) {
        const sample = analyser
          ? frequencyData[Math.floor((i / count) * frequencyData.length)] / 255
          : 0.25 + Math.abs(Math.sin(i * 0.19) * Math.cos(i * 0.043)) * 0.52;
        const barHeight = Math.max(4, (0.14 + sample * 0.82) * height);
        const x = i * (barWidth + gap);
        const y = (height - barHeight) / 2;
        context.fillStyle = i / count <= progressRef.current ? '#788fe2' : '#d9dfef';
        context.beginPath();
        context.roundRect(x, y, barWidth, barHeight, barWidth);
        context.fill();
      }
      if ((analyser && audio && !audio.paused) || (onSeek && !waveformUrl)) frame = requestAnimationFrame(draw);
    };
    const redraw = () => {
      cancelAnimationFrame(frame);
      draw();
    };
    const resume = () => {
      audioContext?.resume();
      redraw();
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      draw();
    };
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
    if (onSeek) {
      onSeek(ratio);
      return;
    }
    const audio = audioRef.current;
    if (audio?.duration) audio.currentTime = ratio * audio.duration;
  }

  if (waveformUrl && !imageFailed) {
    return (
      <div
        className="waveform-sc"
        role="slider"
        aria-label="SoundCloud waveform; click to seek"
        aria-valuenow={Math.round(progress * 100)}
        aria-valuemin="0"
        aria-valuemax="100"
        tabIndex={0}
        onClick={seek}
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
            onSeek?.(Math.max(0, Math.min(1, progress + (event.key === 'ArrowRight' ? 0.03 : -0.03))));
          }
        }}
      >
        <img src={waveformUrl} alt="" onError={() => setImageFailed(true)} />
        <span className="waveform-sc-played" style={{ width: `${progress * 100}%` }} />
        <i style={{ left: `${progress * 100}%` }} />
      </div>
    );
  }
  return (
    <canvas
      className={src || onSeek ? 'waveform interactive' : 'waveform'}
      ref={canvasRef}
      onClick={seek}
      aria-label={src || onSeek ? 'Аудиоспектр, нажмите для перемотки' : 'Декоративная звуковая волна'}
    />
  );
}

export default function AudioPost({ post }) {
  const tracks = post.tracks?.length
    ? post.tracks
    : [
        {
          id: post.id || 'track-0',
          title: post.trackTitle || 'Звуковой дневник',
          audioBy: post.audioBy || 'ONEDOPEA',
          soundcloudUrl: post.soundcloudUrl,
          shareUrl: post.shareUrl || post.soundcloudUrl,
          mediaUrl: post.mediaUrl,
        },
      ];

  const [activeIndex, setActiveIndex] = useState(0);
  const activeTrack = tracks[activeIndex] || tracks[0];

  const audioRef = useRef(null);
  const iframeRef = useRef(null);
  const widgetRef = useRef(null);
  const widgetControllerRef = useRef(null);
  const pendingAutoPlayRef = useRef(false);

  const [playing, setPlaying] = useState(false);
  const [widgetReady, setWidgetReady] = useState(false);
  const [widgetError, setWidgetError] = useState(false);
  const [progress, setProgress] = useState(0);
  const [localProgress, setLocalProgress] = useState(0);
  const [waveformUrl, setWaveformUrl] = useState('');
  const [dynamicCoverUrl, setDynamicCoverUrl] = useState('');
  const [coverFailed, setCoverFailed] = useState(false);

  const usesSoundCloud = Boolean(activeTrack.soundcloudUrl);
  const resolvedCover = !coverFailed ? post.coverUrl || dynamicCoverUrl : '';

  useEffect(() => {
    setCoverFailed(false);
  }, [post.coverUrl]);

  useEffect(() => {
    if (!usesSoundCloud || !iframeRef.current) return;
    let active = true;
    let widget;
    setWidgetReady(false);
    setWidgetError(false);

    loadSoundCloudApi()
      .then((Widget) => {
        if (!active || !iframeRef.current) return;
        widget = Widget(iframeRef.current);
        widgetRef.current = widget;
        widgetControllerRef.current = { pause: () => widget.pause() };

        const loadTrackMetadata = () =>
          widget.getCurrentSound((sound) => {
            if (!active || !sound) return;
            const waveform = sound.waveform_url || sound.waveformUrl;
            if (waveform) setWaveformUrl(waveform);
            if (!post.coverUrl && sound.artwork_url) {
              setDynamicCoverUrl(upgradeArtworkUrl(sound.artwork_url));
            }
          });

        widget.bind(Widget.Events.READY, () => {
          if (!active) return;
          setWidgetReady(true);
          loadTrackMetadata();
          if (pendingAutoPlayRef.current) {
            pendingAutoPlayRef.current = false;
            widget.play();
          }
        });
        widget.bind(Widget.Events.PLAY, () => {
          loadTrackMetadata();
          claimAudio(widgetControllerRef.current);
          if (active) setPlaying(true);
        });
        widget.bind(Widget.Events.PAUSE, () => {
          releaseAudio(widgetControllerRef.current);
          if (active) setPlaying(false);
        });
        widget.bind(Widget.Events.FINISH, () => {
          releaseAudio(widgetControllerRef.current);
          if (!active) return;
          setPlaying(false);
          setProgress(0);
          if (activeIndex + 1 < tracks.length) {
            pendingAutoPlayRef.current = true;
            setWaveformUrl('');
            setActiveIndex(activeIndex + 1);
          }
        });
        widget.bind(Widget.Events.PLAY_PROGRESS, (event) => {
          if (active && event.duration) {
            setProgress(Math.max(0, Math.min(1, event.currentPosition / event.duration)));
          }
        });
      })
      .catch(() => {
        if (active) setWidgetError(true);
      });

    return () => {
      active = false;
      if (widget) {
        try {
          widget.pause();
        } catch {}
        releaseAudio(widgetControllerRef.current);
      }
      widgetRef.current = null;
      widgetControllerRef.current = null;
    };
  }, [usesSoundCloud, activeTrack.soundcloudUrl, activeIndex, tracks.length, post.coverUrl]);

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
      audio
        .play()
        .then(() => setPlaying(true))
        .catch(() => {
          releaseAudio(audio);
          setPlaying(false);
        });
    } else {
      audio.pause();
      releaseAudio(audio);
      setPlaying(false);
    }
  }

  function selectTrack(index) {
    if (index === activeIndex) {
      togglePlayback();
      return;
    }
    pendingAutoPlayRef.current = true;
    setPlaying(false);
    setProgress(0);
    setLocalProgress(0);
    setWaveformUrl('');
    setActiveIndex(index);
  }

  function seekSoundCloud(ratio) {
    const widget = widgetRef.current;
    if (widget) widget.getDuration((duration) => widget.seekTo(duration * ratio));
  }

  const iframeSrc = usesSoundCloud
    ? `https://w.soundcloud.com/player/?url=${encodeURIComponent(activeTrack.soundcloudUrl)}&auto_play=false&hide_related=true&visual=false&show_comments=false&show_user=false&show_reposts=false&show_teaser=false&sharing=false&download=false&buying=false&liking=false&show_playcount=false`
    : undefined;

  return (
    <div className="audio-post">
      {activeTrack.mediaUrl && (
        <audio
          key={activeTrack.mediaUrl}
          ref={audioRef}
          src={activeTrack.mediaUrl}
          crossOrigin="anonymous"
          preload="metadata"
          loop={tracks.length === 1}
          onTimeUpdate={(event) => {
            const audio = event.currentTarget;
            if (audio.duration) setLocalProgress(audio.currentTime / audio.duration);
          }}
          onEnded={() => {
            setPlaying(false);
            releaseAudio(audioRef.current);
          }}
          onPause={() => {
            setPlaying(false);
            releaseAudio(audioRef.current);
          }}
        />
      )}

      {usesSoundCloud && (
        <iframe
          key={activeTrack.soundcloudUrl}
          ref={iframeRef}
          className="soundcloud-widget-frame"
          title={`SoundCloud player: ${activeTrack.title}`}
          allow="autoplay"
          loading="eager"
          src={iframeSrc}
        />
      )}

      <div className={resolvedCover ? 'audio-cover has-artwork' : 'audio-cover'} data-frag="panel">
        {resolvedCover ? (
          <>
            <div
              className="audio-cover-backdrop"
              style={{ backgroundImage: `url(${resolvedCover})` }}
              aria-hidden="true"
            />
            <img
              className="audio-cover-art"
              src={resolvedCover}
              alt={post.coverAlt || `${activeTrack.title} — обложка релиза`}
              data-frag="panel"
              onError={() => setCoverFailed(true)}
            />
          </>
        ) : (
          <>
            <div className="cover-orb" data-frag="dot" />
            <span className="cover-mark">O.</span>
          </>
        )}
        <span className="cover-label">
          {tracks.length > 1 ? `ONE DOPE • ${tracks.length} РЕЛИЗА` : 'ONEDOPEA • AUDIO'}
        </span>
      </div>

      <div className="audio-controls">
        <button
          type="button"
          className="play-button"
          data-frag="dot"
          onClick={togglePlayback}
          disabled={usesSoundCloud && !widgetReady && !widgetError}
          aria-label={playing ? 'Пауза' : 'Воспроизвести'}
        >
          {playing ? 'Ⅱ' : '▶'}
        </button>
        <div className="audio-details" data-frag="lines">
          <strong>{activeTrack.title}</strong>
          <span>
            {activeTrack.audioBy || post.audioBy || 'ONE DOPE'} · {usesSoundCloud ? 'SoundCloud' : 'MP3'}
            {tracks.length > 1 ? ` · Трек ${activeIndex + 1} из ${tracks.length}` : ''}
          </span>
        </div>
        <span className="audio-duration">
          {widgetError
            ? 'ОШИБКА ПЛЕЕРА'
            : playing
              ? 'PLAYING'
              : usesSoundCloud && !widgetReady
                ? 'ЗАГРУЗКА…'
                : 'AUDIO'}
        </span>
      </div>

      <Waveform
        audioRef={audioRef}
        src={activeTrack.mediaUrl}
        waveformUrl={waveformUrl}
        progress={usesSoundCloud ? progress : localProgress}
        onSeek={usesSoundCloud ? seekSoundCloud : undefined}
      />

      {tracks.length > 1 ? (
        <div className="audio-tracklist" role="list" aria-label="Список релизов">
          {tracks.map((track, idx) => {
            const isCurrent = idx === activeIndex;
            const isTrackPlaying = isCurrent && playing;
            return (
              <div
                key={track.id || track.soundcloudUrl || idx}
                role="listitem"
                data-frag="chip"
                className={isCurrent ? 'audio-track-row active' : 'audio-track-row'}
              >
                <button
                  type="button"
                  className="audio-track-select"
                  onClick={() => selectTrack(idx)}
                  aria-label={`${isTrackPlaying ? 'Пауза' : 'Включить'} ${track.title}`}
                >
                  <span className="audio-track-num">
                    {isTrackPlaying ? '❚❚' : isCurrent ? '▶' : String(idx + 1).padStart(2, '0')}
                  </span>
                  <span className="audio-track-meta">
                    <strong>{track.title}</strong>
                    <small>{track.subtitle || track.audioBy || 'ONE DOPE'}</small>
                  </span>
                </button>
                {(track.shareUrl || track.soundcloudUrl) && (
                  <a
                    className="audio-track-ext"
                    href={track.shareUrl || track.soundcloudUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Открыть ${track.title} на SoundCloud`}
                  >
                    SoundCloud ↗
                  </a>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        usesSoundCloud && (
          <div className="sc-link-row">
            <span>{widgetError ? 'Можно открыть трек на SoundCloud' : 'Встроенное воспроизведение'}</span>
            <a href={activeTrack.shareUrl || activeTrack.soundcloudUrl} target="_blank" rel="noreferrer">
              Открыть трек ↗
            </a>
          </div>
        )
      )}
    </div>
  );
}
