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

function scrollDopeTop(event) {
  const stage = document.getElementById('page-dope');
  if (stage) {
    event.preventDefault();
    stage.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

export default function BioHeader({
  postsCount,
  projectsCount = 7,
  onMatrix,
  onChooseStyle,
}) {
  return (
    <header className="bio-header stage-item" id="top">
      <div className="bio-topline">
        <a className="brand" href="#top" onClick={scrollDopeTop} data-frag="chip">
          <span className="brand-orb">O.</span>
          <span>ONEDOPEA</span>
        </a>
        <div className="bio-actions">
          <button type="button" className="quiet-button" onClick={onChooseStyle} data-frag="chip">
            Капсулы
          </button>
          <a className="admin-link" href={`${basePath}/admin/`} data-frag="chip">
            Админ-панель
          </a>
          <button type="button" className="matrix-link" onClick={onMatrix} data-frag="chip">
            <span>↶</span> One
          </button>
        </div>
      </div>

      <div className="bio-main">
        <div className="profile-orb" data-frag="dot"><span>O.</span><i /><b /></div>
        <div className="bio-copy">
          <div className="bio-title-line">
            <h1 data-frag="lines">onedopea</h1>
            <span className="verified" title="ONEDOPEA" data-frag="dot">✦</span>
          </div>
          <div className="profile-stats" data-frag="lines">
            <span><b>{postsCount}</b> {pluralRu(postsCount, 'публикация', 'публикации', 'публикаций')}</span>
            <span><b>{projectsCount}</b> {pluralRu(projectsCount, 'проект', 'проекта', 'проектов')}</span>
            <span><b>∞</b> идей</span>
          </div>
          <p className="bio-description" data-frag="lines">
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

      <div className="bio-divider" data-frag="lines"><span>ЛЕНТА ПРОЕКТОВ</span><i /></div>
    </header>
  );
}
