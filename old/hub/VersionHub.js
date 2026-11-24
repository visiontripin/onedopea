'use client';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

export default function VersionHub() {
  return (
    <main className="style-gate">
      <div className="gate-ambient" aria-hidden="true"><i /><i /><i /></div>

      <a className="gate-brand" href="#top" aria-label="ONEDOPEA">
        <span>O.</span>
        ONEDOPEA
      </a>

      <div className="gate-top-right">
        <a className="admin-link" href={`${basePath}/EX/index.html`}>Проект EX ↗</a>
        <a className="admin-link" href={`${basePath}/admin/`}>Админ-панель</a>
      </div>

      <p className="gate-kicker">ПОРТФОЛИО · ВСЕ ВЕРСИИ В ОДНОМ ПРОСТРАНСТВЕ</p>
      <h1 id="top">Выбери <em>версию</em><br />сайта.</h1>
      <p className="gate-sublead">Старые редакции бережно сохранены рядом с новой версией v3</p>

      <div className="hub-options">
        <div className="hub-card-wrap">
          <a className="gate-card matrix-choice hub-card" href={`${basePath}/v1/index.html`}>
            <div className="hub-badge-row">
              <span className="gate-icon">⌘</span>
              <span className="hub-pill-tag">АРХИВ · V1</span>
            </div>
            <span className="gate-mode">ВЕРСИЯ 1</span>
            <strong>Matrix v1</strong>
            <span className="gate-description">
              Первая автономная ЭЛТ-витрина ONEDOPEA с карточками ранних проектов, доской изменений и локальным прототипом кабинета.
            </span>
            <span className="gate-launch">Открыть v1 <i aria-hidden="true">↗</i></span>
          </a>
          <div className="hub-sublinks">
            <a href={`${basePath}/v1/plan.html`}>Что изменилось</a>
            <a href={`${basePath}/v1/account.html`}>Кабинет</a>
            <a href={`${basePath}/v1/ONEDOPEA-v3-phone.zip`}>ZIP для телефона</a>
          </div>
        </div>

        <div className="hub-card-wrap">
          <a className="gate-card anti-choice hub-card" href={`${basePath}/v2/`}>
            <span className="gate-orbit" aria-hidden="true" />
            <div className="hub-badge-row">
              <span className="gate-icon">◈</span>
              <span className="hub-pill-tag">СТАРЫЙ САЙТ · V2</span>
            </div>
            <span className="gate-mode">ВЕРСИЯ 2</span>
            <strong>One &amp; Dope v2</strong>
            <span className="gate-description">
              Предыдущая версия сайта с классическим переключателем двух режимов (One и Dope) и исходной подборкой из трёх проектов.
            </span>
            <span className="gate-launch">Открыть v2 <i aria-hidden="true">↗</i></span>
          </a>
          <div className="hub-sublinks">
            <a href={`${basePath}/v2/`}>Сайт v2</a>
            <a href={`${basePath}/index-v2.html`}>Автономный index-v2.html</a>
          </div>
        </div>

        <div className="hub-card-wrap">
          <a className="gate-card anti-choice hub-card hub-card-v3" href={`${basePath}/v3/`}>
            <span className="gate-orbit" aria-hidden="true" />
            <div className="hub-badge-row">
              <span className="gate-icon">✦</span>
              <span className="hub-pill-tag hot">НОВАЯ · V3</span>
            </div>
            <span className="gate-mode">ВЕРСИЯ 3 · 3D CAPSULES</span>
            <strong>ONEDOPEA v3</strong>
            <span className="gate-description">
              Интерактивный вход через 3D-капсулы (красная → One, синяя → Dope) и все 7 проектов: BotControl, ТИТАН, Vision Audio, Подработка.МСК, Лесное·Афиша, Перекур+ и EX.
            </span>
            <span className="gate-launch">Запустить v3 <i aria-hidden="true">→</i></span>
          </a>
          <div className="hub-sublinks">
            <a href={`${basePath}/v3/`}>3D-капсулы</a>
            <a href={`${basePath}/v3/?style=matrix`}>Сразу в One</a>
            <a href={`${basePath}/v3/?style=dope`}>Сразу в Dope</a>
            <a href={`${basePath}/EX/index.html`}>EX</a>
          </div>
        </div>
      </div>

      <p className="gate-foot">v1 · v2 · v3 · Документальный эксперимент EX · Переключение доступно из любой версии</p>
    </main>
  );
}
