'use client';

import { useState } from 'react';

function Icon({ name }) {
  const paths = {
    heart: <path d="M20.8 4.7a5.4 5.4 0 0 0-7.6 0L12 5.9l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6l1.2 1.2L12 21l7.6-7.5 1.2-1.2a5.4 5.4 0 0 0 0-7.6Z" />,
    comment: <path d="M20 11.5a7.5 7.5 0 0 1-8 7.5 8.6 8.6 0 0 1-3.5-.7L4 20l1.4-3.8A7.2 7.2 0 0 1 4 11.5 7.5 7.5 0 0 1 12 4a7.5 7.5 0 0 1 8 7.5Z" />,
    repost: <path d="m17 2 4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4m14-1v2a3 3 0 0 1-3 3H3" />,
    save: <path d="M6 4.8A1.8 1.8 0 0 1 7.8 3h8.4A1.8 1.8 0 0 1 18 4.8V21l-6-4-6 4V4.8Z" />,
    share: <path d="M14 4h6v6m-.5-5.5L10 14M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5" />,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export default function PostWrapper({ post, children }) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [reposted, setReposted] = useState(false);
  const [commentOpen, setCommentOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [commentsAdded, setCommentsAdded] = useState([]);
  const [sent, setSent] = useState(false);

  async function share() {
    const url = `${location.origin}${location.pathname}#${post.id}`;
    try { await navigator.clipboard.writeText(url); setSent(true); setTimeout(() => setSent(false), 1500); }
    catch { window.prompt('Скопируйте ссылку на пост', url); }
  }

  return (
    <article className="post-card" id={post.id}>
      <header className="post-head">
        <a className="mini-avatar" href="#top" aria-label="Профиль ONEDOPEA">O</a>
        <div className="post-author"><strong>{post.author}</strong><span>{post.date}</span></div>
        <button className="more-button" aria-label="Другие действия">•••</button>
      </header>
      <div className="post-media">{children}</div>
      <div className="social-row" aria-label="Действия с публикацией">
        <button className={liked ? 'social-action active' : 'social-action'} onClick={() => setLiked(!liked)} aria-label={liked ? 'Убрать лайк' : 'Поставить лайк'}><Icon name="heart" /><span>{post.likes + (liked ? 1 : 0)}</span></button>
        <button className="social-action" onClick={() => setCommentOpen(!commentOpen)} aria-label="Комментарии"><Icon name="comment" /><span>{post.comments + commentsAdded.length}</span></button>
        <button className={reposted ? 'social-action active' : 'social-action'} onClick={() => setReposted(!reposted)} aria-label="Репост"><Icon name="repost" /><span>{post.reposts + (reposted ? 1 : 0)}</span></button>
        <button className="social-action share-action" onClick={share} aria-label={sent ? 'Ссылка скопирована' : 'Поделиться'}><Icon name="share" />{sent && <span>Скопировано</span>}</button>
        <button className={saved ? 'social-action save-action active' : 'social-action save-action'} onClick={() => setSaved(!saved)} aria-label={saved ? 'Убрать из сохранённого' : 'Сохранить'}><Icon name="save" /></button>
      </div>
      <div className="post-copy">
        <div className="post-caption"><strong>{post.author}</strong> {post.caption}</div>
        {post.tags?.length > 0 && <div className="post-tags">{post.tags.map((tag) => <a key={tag} href={`#tag-${tag}`}>#{tag}</a>)}</div>}
        {(post.links || (post.href ? [{ label: post.action, url: post.href }] : [])).length > 0 && <div className="post-outlinks">{(post.links || [{ label: post.action, url: post.href }]).map((link) => <a className="post-outlink" href={link.url} key={link.url} target="_blank" rel="noreferrer">{link.label} <span>↗</span></a>)}</div>}
        {commentsAdded.map((text, index) => <p className="local-comment" key={`${post.id}-comment-${index}`}><strong>Вы</strong> {text}</p>)}
        {commentOpen && <form className="comment-form" onSubmit={(event) => { event.preventDefault(); if (comment.trim()) { setCommentsAdded((items) => [...items, comment.trim()]); setComment(''); setCommentOpen(false); } }}><input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Добавить комментарий…" aria-label="Комментарий" /><button type="submit" disabled={!comment.trim()}>Опубликовать</button></form>}
      </div>
    </article>
  );
}
