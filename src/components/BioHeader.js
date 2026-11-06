'use client';

export default function BioHeader({ postsCount, onMatrix, onChooseStyle }) {
  return (
    <header className="bio-header" id="top">
      <div className="bio-topline"><a className="brand" href="#top"><span className="brand-orb">O.</span><span>ONEDOPEA</span></a><div className="bio-actions"><button className="quiet-button" onClick={onChooseStyle}>Сменить стиль</button><button className="matrix-link" onClick={onMatrix}><span>↶</span> Матрица</button></div></div>
      <div className="bio-main"><div className="profile-orb"><span>O.</span><i/><b/></div><div className="bio-copy"><div className="bio-title-line"><h1>onedopea</h1><span className="verified" title="ONEDOPEA">✦</span></div><div className="profile-stats"><span><b>{postsCount}</b> публикаций</span><span><b>3</b> проекта</span><span><b>∞</b> идей</span></div><p className="bio-description"><strong>Цифровые продукты и эксперименты</strong><br/>BotControl · Telegram-продукты · музыка · motion<br/><a href="https://t.me/onedopea" target="_blank" rel="noreferrer">t.me/onedopea ↗</a></p></div></div>
      <div className="bio-divider"><span>ЛЕНТА ПРОЕКТОВ</span><i/></div>
    </header>
  );
}
