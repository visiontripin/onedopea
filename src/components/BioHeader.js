'use client';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

function pluralRu(n, one, few, many) {
  const abs = Math.abs(n) % 100;
  const n1 = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (n1 > 1 && n1 < 5) return few;
  if (n1 === 1) return one;
  return many;
}

export default function BioHeader({
  postsCount,
  projectsCount = 7,
  legacyV2 = false,
  onMatrix,
  onChooseStyle,
}) {
  if (legacyV2) {
    return (
      <header className="bio-header" id="top">
        <div className="bio-topline">
          <a className="brand" href="#top">
            <span className="brand-orb">O.</span>
            <span>ONEDOPEA · V2</span>
          </a>
          <div className="bio-actions">
            <a className="admin-link" href={`${basePath}/`}>↶ Версии</a>
            <button className="quiet-button" onClick={onChooseStyle}>Сменить стиль</button>
            <a className="admin-link" href={`${basePath}/admin/`}>Админ-панель</a>
            <button className="matrix-link" onClick={onMatrix}><span>↶</span> One</button>
          </div>
        </div>
        <div className="bio-main">
          <div className="profile-orb"><span>O.</span><i /><b /></div>
          <div className="bio-copy">
            <div className="bio-title-line">
              <h1>onedopea</h1>
              <span className="verified" title="ONEDOPEA">✦</span>
            </div>
            <div className="profile-stats">
              <span><b>{postsCount}</b> публикаций</span>
              <span><b>3</b> проекта</span>
              <span><b>∞</b> идей</span>
            </div>
            <p className="bio-description">
              <strong>Цифровые продукты и эксперименты</strong><br />
              BotControl · Telegram-продукты · музыка · motion<br />
              <a href="https://t.me/onedopea" target="_blank" rel="noreferrer">t.me/onedopea ↗</a>
            </p>
          </div>
        </div>
        <div className="bio-divider"><span>ЛЕНТА ПРОЕКТОВ</span><i /></div>
      </header>
    );
  }

  return (
    <header className="bio-header" id="top">
      <div className="bio-topline">
        <a className="brand" href="#top">
          <span className="brand-orb">O.</span>
          <span>ONEDOPEA · V3</span>
        </a>
        <div className="bio-actions">
          <a className="admin-link" href={`${basePath}/`}>↶ Версии</a>
          <button className="quiet-button" onClick={onChooseStyle}>Капсулы v3</button>
          <a className="admin-link" href={`${basePath}/admin/`}>Админ-панель</a>
          <button className="matrix-link" onClick={onMatrix}><span>↶</span> One</button>
        </div>
      </div>

      <div className="bio-main">
        <div className="profile-orb"><span>O.</span><i /><b /></div>
        <div className="bio-copy">
          <div className="bio-title-line">
            <h1>onedopea</h1>
            <span className="verified" title="ONEDOPEA">✦</span>
          </div>
          <div className="profile-stats">
            <span><b>{postsCount}</b> {pluralRu(postsCount, 'публикация', 'публикации', 'публикаций')}</span>
            <span><b>{projectsCount}</b> {pluralRu(projectsCount, 'проект', 'проекта', 'проектов')}</span>
            <span><b>∞</b> идей</span>
          </div>
          <p className="bio-description">
            <strong>Цифровые продукты, сервисы и эксперименты</strong><br />
            <a href="#botcontrol-project">BotControl</a> ·{' '}
            <a href="#titan">ТИТАН</a> ·{' '}
            <a href="#vision">Vision Audio</a> ·{' '}
            <a href="#podrabotka">Подработка.МСК</a> ·{' '}
            <a href="#afisha-pl">Лесное·Афиша</a> ·{' '}
            <a href="#perekur">Перекур+</a> ·{' '}
            <a href="#ex">EX</a><br />
            <a href="https://github.com/visiontripin" target="_blank" rel="noreferrer">github.com/visiontripin ↗</a>
            {' · '}
            <a href="https://t.me/onedopea" target="_blank" rel="noreferrer">t.me/onedopea ↗</a>
          </p>
        </div>
      </div>

      <div className="bio-divider"><span>ЛЕНТА ПРОЕКТОВ</span><i /></div>
    </header>
  );
}
