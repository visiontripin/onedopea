'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

export default function AdminDashboard({ email }) {
  const supabase = createClient();
  const [kind, setKind] = useState('audio'); const [caption, setCaption] = useState('');
  const [tags, setTags] = useState(''); const [soundcloudUrl, setSoundcloudUrl] = useState('');
  const [svgMarkup, setSvgMarkup] = useState(''); const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); const [posts, setPosts] = useState([]);
  async function loadPosts() { if (!supabase) return; const { data } = await supabase.from('posts').select('id,kind,caption,is_published,created_at').order('created_at',{ascending:false}); setPosts(data || []); }
  useEffect(() => { loadPosts(); }, []);
  async function signOut() { await supabase?.auth.signOut(); window.location.reload(); }
  async function submit(event) {
    event.preventDefault(); if (!supabase) return;
    setBusy(true); setMessage('');
    try {
      let mediaUrl = null;
      if (file) {
        const key = `${crypto.randomUUID()}-${file.name.replace(/[^\p{L}\p{N}._-]/gu, '_')}`;
        const { error: uploadError } = await supabase.storage.from('portfolio-media').upload(key, file, { upsert: false, contentType: file.type });
        if (uploadError) throw uploadError;
        mediaUrl = supabase.storage.from('portfolio-media').getPublicUrl(key).data.publicUrl;
      }
      const post = { kind, caption, tags: tags.split(/[ ,]+/).map(tag=>tag.replace(/^#/, '')).filter(Boolean), media_url: mediaUrl, soundcloud_url: soundcloudUrl || null, svg_markup: kind==='svg' ? svgMarkup : null, is_published: false };
      const { error: insertError } = await supabase.from('posts').insert(post);
      if (insertError) throw insertError;
      setCaption('');setTags('');setSoundcloudUrl('');setSvgMarkup('');setFile(null);
      event.target.reset();setMessage('Черновик сохранён. Опубликуйте его после проверки.'); await loadPosts();
    } catch (error) { setMessage(error.message || 'Не удалось сохранить пост. Проверьте таблицу и Storage.'); }
    finally { setBusy(false); }
  }
  async function togglePublish(post) { const { error } = await supabase.from('posts').update({is_published:!post.is_published}).eq('id',post.id); if(error) setMessage(error.message); else await loadPosts(); }
  async function deletePost(post) { if(!confirm('Удалить публикацию?')) return; const {error}=await supabase.from('posts').delete().eq('id',post.id); if(error) setMessage(error.message); else await loadPosts(); }
  return <main className="admin-shell"><header className="admin-top"><a className="brand" href={`${basePath}/`}><span className="brand-orb">O.</span>ONEDOPEA</a><div><span>{email}</span><button className="quiet-button" onClick={signOut}>Выйти</button></div></header><section className="admin-panel admin-editor"><p className="eyebrow">УПРАВЛЕНИЕ ЛЕНТОЙ</p><h1>Новая публикация</h1><p className="admin-hint">Файлы сохраняются в медиабакете; каждая публикация создаётся как черновик.</p><form onSubmit={submit}>
    <label>Формат поста<select value={kind} onChange={e=>setKind(e.target.value)}><option value="audio">Audio</option><option value="video">Video</option><option value="svg">SVG</option></select></label>
    <label>Текст и описание<textarea value={caption} onChange={e=>setCaption(e.target.value)} rows="4" required placeholder="Текст публикации…"/></label>
    <label>Хэштеги<input value={tags} onChange={e=>setTags(e.target.value)} placeholder="portfolio, audio, botcontrol"/></label>
    {(kind==='audio'||kind==='video')&&<label>Загрузить {kind==='audio'?'MP3':'MP4 / WebM'}<input type="file" accept={kind==='audio'?'audio/mpeg,audio/mp3,audio/ogg,audio/wav':'video/mp4,video/webm'} onChange={e=>setFile(e.target.files?.[0]||null)} /></label>}
    {kind==='audio'&&<label>Ссылка SoundCloud<input type="url" value={soundcloudUrl} onChange={e=>setSoundcloudUrl(e.target.value)} placeholder="https://soundcloud.com/artist/track"/></label>}
    {kind==='svg'&&<label>Код SVG<textarea value={svgMarkup} onChange={e=>setSvgMarkup(e.target.value)} rows="8" required placeholder="<svg viewBox=...>…</svg>"/></label>}
    {message&&<p className={message.startsWith('Не')?'form-error':'form-success'}>{message}</p>}
    <button className="admin-submit" disabled={busy}>{busy?'Сохраняем…':'Сохранить черновик'}</button>
  </form><section className="admin-posts"><h2>Публикации</h2>{posts.length===0?<p className="admin-hint">Пока постов нет.</p>:posts.map(post=><article className="admin-post-row" key={post.id}><div><b>{post.kind.toUpperCase()}</b><span>{post.caption}</span><small>{post.is_published?'Опубликован':'Черновик'}</small></div><button type="button" onClick={()=>togglePublish(post)}>{post.is_published?'Снять':'Опубликовать'}</button><button type="button" onClick={()=>deletePost(post)}>Удалить</button></article>)}</section></section></main>;
}
