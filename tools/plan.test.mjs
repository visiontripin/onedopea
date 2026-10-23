/**
 * Тесты ONEDOPEA Product Board.
 * Запуск:  node tools/plan.test.mjs   (нужен jsdom: npm i jsdom)
 * Проверяет РЕАЛЬНЫЙ код из plan.html: модель скоринга + DOM-рендер + клики + localStorage.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HTML = path.resolve(__dirname, '..', 'plan.html');
const require = createRequire(import.meta.url);

/* jsdom: из node_modules репозитория, либо из пути в NODE_PATH / JSDOM_PATH */
let JSDOM, VirtualConsole;
try {
  ({ JSDOM, VirtualConsole } = await import('jsdom'));
} catch {
  const base = process.env.JSDOM_PATH ||
    (process.env.NODE_PATH || '').split(path.delimiter).find(p => p && fs.existsSync(path.join(p, 'jsdom')));
  if (!base) {
    console.error('Нужен jsdom:  npm i -D jsdom   (или JSDOM_PATH=/путь/к/node_modules node tools/plan.test.mjs)');
    process.exit(2);
  }
  ({ JSDOM, VirtualConsole } = await import(path.join(base, 'jsdom', 'lib', 'api.js')));
}

let passed = 0, failed = 0;
const test = (name, fn) => {
  try { fn(); console.log('  ok   ' + name); passed++; }
  catch (e) { console.log('  FAIL ' + name + '\n       ' + e.message); failed++; }
};

/* ---------- загрузка модели: тот же самый инлайн-скрипт, что исполняет браузер ---------- */
function loadModelFromHtml(file) {
  const src = fs.readFileSync(file, 'utf8');
  const blocks = [...src.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  const main = blocks.find(b => b.includes('PRODUCT BOARD'));
  assert.ok(main, 'не найден инлайн-скрипт доски в ' + path.basename(file));
  const mod = { exports: {} };
  new Function('module', 'exports', 'window', 'document', 'localStorage', main)
    .call(mod, mod, mod.exports, undefined, undefined, undefined);
  return mod.exports;
}
const model = loadModelFromHtml(HTML);
const { ROLES, STAGES, CATS, QUARTERS, SEED, LS_KEY,
  riceOf, roleScoreOf, avgRoleScore, priorityOf, verdictOf, decisionOf,
  toMarkdown, toCSV, demoState, emptyState, normalize, ranked, votes } = model;

console.log('\n== модель скоринга ==');

test('RICE считается по формуле R*I*C/E', () => {
  const it = { r: 1000, i: 2, c: 50, e: 4 };
  assert.equal(riceOf(it), (1000 * 2 * 0.5) / 4);   // 250
  assert.equal(riceOf(it), 250);
});

test('Effort=0 не роняет расчёт (делитель не ноль)', () => {
  assert.ok(Number.isFinite(riceOf({ r: 100, i: 1, c: 100, e: 0 })));
  assert.ok(riceOf({ r: 100, i: 1, c: 100, e: 0 }) > 0);
});

test('все 12 ролей имеют критерии, веса в сумме = 1', () => {
  assert.equal(ROLES.length, 12);
  for (const r of ROLES) {
    assert.ok(r.criteria.length >= 3, r.name + ': минимум 3 критерия');
    const sum = r.criteria.reduce((s, c) => s + c.w, 0);
    assert.ok(Math.abs(sum - 1) < 1e-9, r.name + ': сумма весов ' + sum);
  }
});

test('все id критериев уникальны внутри роли', () => {
  for (const r of ROLES) {
    const keys = r.criteria.map(c => c.k);
    assert.equal(new Set(keys).size, keys.length, r.name);
  }
});

test('оценка роли = взвешенное среднее, дефолт 5', () => {
  const st = demoState();
  const it = st.items[0];
  const r = ROLES[0];
  st.scores[it.id][r.id] = Object.fromEntries(r.criteria.map(c => [c.k, 10]));
  assert.ok(Math.abs(roleScoreOf(it, r.id, st) - 10) < 1e-9, 'все 10 → 10');
  st.scores[it.id][r.id] = Object.fromEntries(r.criteria.map(c => [c.k, 0]));
  assert.equal(roleScoreOf(it, r.id, st), 0);
  delete st.scores[it.id][r.id];
  assert.ok(Math.abs(roleScoreOf(it, r.id, st) - 5) < 1e-9, 'дефолт 5');
});

test('приоритет в диапазоне 0..100 и монотонен по RICE', () => {
  const st = demoState();
  const lo = { id: 'a', r: 10, i: 0.5, c: 20, e: 4, stage: 'inbox' };
  const hi = { id: 'b', r: 5000, i: 3, c: 100, e: 0.2, stage: 'inbox' };
  st.items.push(lo, hi);
  const pLo = priorityOf(lo, st), pHi = priorityOf(hi, st);
  assert.ok(pLo >= 0 && pLo <= 100, 'lo=' + pLo);
  assert.ok(pHi >= 0 && pHi <= 100, 'hi=' + pHi);
  assert.ok(pHi > pLo, pHi + ' > ' + pLo);
});

test('вердикты: 8+ БЕРЁМ, 6+ оговорка, 4+ данные, <4 не сейчас', () => {
  assert.equal(verdictOf(9).l, 'БЕРЁМ');
  assert.equal(verdictOf(7).l, 'ДА, С ОГОВОРКОЙ');
  assert.equal(verdictOf(5).l, 'НУЖНЫ ДАННЫЕ');
  assert.equal(verdictOf(2).l, 'НЕ СЕЙЧАС');
});

test('идея в этапе «Релиз» всегда помечена В РЕЛИЗЕ', () => {
  const st = demoState();
  const it = st.items.find(i => i.stage === 'live');
  assert.ok(it, 'в демо-наборе есть идея в live');
  assert.equal(decisionOf(it, st).l, 'В РЕЛИЗЕ');
});

console.log('\n== данные и состояние ==');

test('демо-набор: 33+ идей, у всех есть метрика и гипотеза', () => {
  const st = demoState();
  assert.ok(st.items.length >= 33, 'идей: ' + st.items.length);
  assert.equal(SEED.length, st.items.length);
  for (const it of st.items) {
    assert.ok(it.t.length > 8, 'короткое название: ' + it.t);
    assert.ok(it.met, 'нет метрики у: ' + it.t);
    assert.ok(it.hy, 'нет гипотезы у: ' + it.t);
    assert.ok(CATS.some(c => c.id === it.cat), 'неизвестная категория: ' + it.cat);
    assert.ok(STAGES.some(s => s.id === it.stage), 'неизвестный этап: ' + it.stage);
  }
});

test('в демо-наборе у каждой идеи проставлены оценки всех 12 ролей', () => {
  const st = demoState();
  for (const it of st.items) {
    for (const r of ROLES) {
      const b = st.scores[it.id][r.id];
      assert.ok(b, it.t + ' / ' + r.name);
      for (const c of r.criteria) {
        assert.ok(Number.isFinite(b[c.k]) && b[c.k] >= 0 && b[c.k] <= 10, it.t + ' ' + r.id + '.' + c.k);
      }
    }
  }
});

test('normalize отбрасывает мусор и чинит неизвестные id', () => {
  const st = normalize({ items: [null, { t: '' }, { t: 'Ок', cat: 'NOPE', stage: 'NOPE', r: 'x', e: -1 },
    { t: 'Норм', cat: 'seo', stage: 'score', r: 10, i: 1, c: 50, e: 1 }], scores: 'oops', votes: null });
  assert.equal(st.items.length, 2);
  assert.equal(st.items[0].cat, 'ux');
  assert.equal(st.items[0].stage, 'inbox');
  assert.equal(st.items[0].r, 0);
  assert.deepEqual(st.scores, {});
  assert.deepEqual(st.votes, {});
  assert.equal(normalize(null).items.length, 0);
  assert.equal(normalize('строка').items.length, 0);
});

test('broken JSON в localStorage → демо-набор, а не белый экран', () => {
  const st = normalize(JSON.parse('{}'));
  assert.equal(st.items.length, 0);
  assert.ok(Array.isArray(st.topics) && st.topics.length >= 5);
});

console.log('\n== экспорт ==');

test('Markdown содержит топ, кварталы, роли и решения по дизайну', () => {
  const st = demoState();
  st.items[0].q = QUARTERS[0];
  st.votes = { d1: { a: 3, b: 1 } };
  const md = toMarkdown(st);
  assert.ok(md.startsWith('# ONEDOPEA — роадмап и решения'));
  assert.ok(md.includes('## Топ по приоритету'));
  assert.ok(md.includes('### ' + QUARTERS[0]));
  assert.ok(md.includes('## Роли-гейткиперы'));
  assert.ok(md.includes('## Решения по дизайну'));
  assert.ok(md.includes('чел.-нед'));
  assert.equal((md.match(/^## /gm) || []).length, 4);
});

test('CSV: заголовок + строка на каждую идею, кавычки экранированы', () => {
  const st = demoState();
  st.items[0].t = 'Идея с "кавычками" и, запятой';
  const csv = toCSV(st);
  const lines = csv.split('\n');
  assert.equal(lines.length, st.items.length + 1);
  assert.ok(lines[0].startsWith('idea,category,stage,quarter'));
  /* строки идут в порядке приоритета, поэтому ищем свою по содержимому */
  const row = lines.find(l => l.includes('кавычками'));
  assert.ok(row, 'строка с кавычками есть в CSV');
  assert.ok(row.startsWith('"Идея с ""кавычками"" и, запятой"'), 'экранирование: ' + row.slice(0, 60));
});

test('Markdown-таблица не ломается на символе |', () => {
  const st = demoState();
  st.items[0].t = 'A | B';
  const row = toMarkdown(st).split('\n').find(l => l.includes('A \\| B'));
  assert.ok(row, 'пайп экранирован');
});

/* ---------- DOM: реальный рендер страницы ---------- */
const closeDlgViaCancel = () => doc.getElementById('dlg-cancel').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
console.log('\n== DOM (jsdom: реальные обработчики страницы) ==');

function bootDOM(seedStorage) {
  const html = fs.readFileSync(HTML, 'utf8');
  const vc = new VirtualConsole();
  const errors = [];
  vc.on('jsdomError', e => errors.push(String(e.message || e)));
  vc.on('error', (...a) => errors.push(a.join(' ')));
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/', virtualConsole: vc });
  const { window } = dom;
  window.HTMLCanvasElement.prototype.getContext = () => ({ createImageData: () => ({ data: [] }), putImageData() {}, fillRect() {} });
  if (seedStorage) window.localStorage.setItem(LS_KEY, seedStorage);
  return { dom, window, doc: window.document, errors };
}

const { window, doc, errors } = bootDOM();

test('страница инициализировалась без ошибок скрипта', () => {
  assert.deepEqual(errors, []);
  assert.ok(doc.getElementById('kpis').textContent.includes('ИДЕЙ'));
});

test('все 6 вкладок на месте, активна первая', () => {
  const tabs = [...doc.querySelectorAll('nav.tabs button')];
  assert.equal(tabs.length, 6);
  assert.equal(tabs[0].getAttribute('aria-selected'), 'true');
  assert.ok(doc.getElementById('tab-roles').classList.contains('active'));
});

test('переключение вкладок работает', () => {
  const tabs = [...doc.querySelectorAll('nav.tabs button')];
  tabs[3].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  assert.equal(tabs[3].getAttribute('aria-selected'), 'true');
  assert.equal(tabs[0].getAttribute('aria-selected'), 'false');
  assert.ok(doc.getElementById('tab-design').classList.contains('active'));
  assert.ok(!doc.getElementById('tab-roles').classList.contains('active'));
});

test('отрисованы 12 ролей и 5 этапов воронки', () => {
  assert.equal(doc.querySelectorAll('#roles .role').length, 12);
  assert.equal(doc.querySelectorAll('#funnel .stage').length, 5);
  assert.ok(doc.getElementById('roles-count').textContent.includes('12 ролей'));
});

test('таблица идей отрисована целиком, числа совпадают с моделью', () => {
  const rows = [...doc.querySelectorAll('#ideas-body tr.idearow')];
  const st = JSON.parse(window.localStorage.getItem(LS_KEY));
  assert.equal(rows.length, st.items.length);
  assert.equal(st.items.length, SEED.length);
  /* приоритет в DOM === приоритет из модели */
  const first = rows[0].dataset.id;
  const domPrio = Number(rows[0].querySelector('td:nth-child(9) .num').textContent);
  const modelPrio = priorityOf(st.items.find(i => i.id === first), st);
  assert.equal(domPrio, modelPrio);
});

test('по умолчанию отсортировано по убыванию приоритета', () => {
  const prios = [...doc.querySelectorAll('#ideas-body tr.idearow')].map(r => Number(r.querySelector('td:nth-child(9) .num').textContent));
  for (let i = 1; i < prios.length; i++) assert.ok(prios[i - 1] >= prios[i], 'порядок нарушен на ' + i);
});

test('состояние сохранено в localStorage при загрузке', () => {
  const raw = window.localStorage.getItem(LS_KEY);
  assert.ok(raw && raw.length > 1000);
  const st = JSON.parse(raw);
  assert.ok(st.items.length >= 33);
  assert.ok(st.topics.length >= 5);
});

test('кнопка «роли» раскрывает скоринг-карту со всеми ролями', () => {
  const row = doc.querySelector('#ideas-body tr.idearow');
  const id = row.dataset.id;
  const box = row.querySelector('[data-sc]');
  assert.equal(box.hidden, true);
  row.querySelector('[data-toggle]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  assert.equal(box.hidden, false);
  assert.equal(box.querySelectorAll('.sc-row').length, ROLES.reduce((s, r) => s + r.criteria.length, 0));
  assert.equal(box.querySelectorAll('.verdict').length, ROLES.length);
});

test('движок оценки живо пересчитывает вердикт, среднее и приоритет', () => {
  const row = doc.querySelector('#ideas-body tr.idearow');
  const id = row.dataset.id;
  const box = row.querySelector('[data-sc]');
  const before = Number(row.querySelector('td:nth-child(9) .num').textContent);
  const sliders = [...box.querySelectorAll('input[type=range]')];
  sliders.forEach(s => { s.value = '10'; s.dispatchEvent(new window.Event('input', { bubbles: true })); });
  const after = Number(row.querySelector('td:nth-child(9) .num').textContent);
  assert.ok(after > before, before + ' -> ' + after);
  assert.equal(row.querySelector('td:nth-child(8)').textContent.trim(), '10.0');
  assert.ok(box.querySelector('.verdict').textContent.includes('БЕРЁМ'));
  const st = JSON.parse(window.localStorage.getItem(LS_KEY));
  assert.equal(priorityOf(st.items.find(i => i.id === id), st), after);
});

test('смена этапа из таблицы двигает идею по воронке', () => {
  const row = doc.querySelector('#ideas-body tr.idearow');
  const id = row.dataset.id;
  const sel = row.querySelector('[data-stage]');
  sel.value = 'sprint';
  sel.dispatchEvent(new window.Event('change', { bubbles: true }));
  const st = JSON.parse(window.localStorage.getItem(LS_KEY));
  assert.equal(st.items.find(i => i.id === id).stage, 'sprint');
});

test('канбан: 5 колонок, карточки, стрелка → двигает этап', () => {
  assert.equal(doc.querySelectorAll('[data-col]').length, 5);
  const cards = doc.querySelectorAll('[data-card]');
  assert.ok(cards.length >= 33, 'карточек: ' + cards.length);
  const card = cards[0];
  const id = card.dataset.card;
  const st0 = JSON.parse(window.localStorage.getItem(LS_KEY));
  const from = st0.items.find(i => i.id === id).stage;
  card.querySelector('[data-mv$="|1"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  const st1 = JSON.parse(window.localStorage.getItem(LS_KEY));
  const si = STAGES.findIndex(s => s.id === from);
  assert.equal(st1.items.find(i => i.id === id).stage, STAGES[si + 1].id);
});

test('дизайн: голос +1 увеличивает счётчик и сохраняется', () => {
  const btn = doc.querySelector('[data-vote]');
  const [tid, vid] = btn.dataset.vote.split('|');
  const click = () => doc.querySelector('[data-vote="' + tid + '|' + vid + '"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  click(); click();   /* после каждого голоса список перерисовывается — берём свежую ноду */
  const st = JSON.parse(window.localStorage.getItem(LS_KEY));
  assert.equal(st.votes[tid][vid], 2);
  assert.equal(votes(st, tid, vid), 2);
  doc.querySelector('[data-unvote="' + tid + '|' + vid + '"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  assert.equal(JSON.parse(window.localStorage.getItem(LS_KEY)).votes[tid][vid], 1);
});

test('роадмап: назначение квартала и автоплан топ-10', () => {
  const opt = doc.querySelector('#rmpick option');
  doc.getElementById('rmpick').value = opt.value;
  doc.getElementById('rmq').value = QUARTERS[1];
  doc.getElementById('rmapply').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  let st = JSON.parse(window.localStorage.getItem(LS_KEY));
  assert.equal(st.items.find(i => i.id === opt.value).q, QUARTERS[1]);
  doc.getElementById('rmauto').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  st = JSON.parse(window.localStorage.getItem(LS_KEY));
  const planned = st.items.filter(i => i.q);
  assert.equal(planned.length, 10, 'в плане: ' + planned.length);
  assert.equal(doc.querySelectorAll('#quarters .qcol').length, QUARTERS.length);
});

test('экспорт Markdown/CSV через реальные кнопки скачивания', () => {
  let captured = [];
  window.URL.createObjectURL = b => { captured.push(b); return 'blob:x'; };
  window.URL.revokeObjectURL = () => {};
  let clicked = 0;
  window.HTMLAnchorElement.prototype.click = function () { clicked++; };
  doc.getElementById('dl-md').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  doc.getElementById('dl-csv').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  assert.equal(clicked, 2);
  assert.equal(captured.length, 2);
});

test('фильтр по категории сужает таблицу', () => {
  const st = JSON.parse(window.localStorage.getItem(LS_KEY));
  const sel = doc.getElementById('fcat');
  sel.value = 'seo';
  sel.dispatchEvent(new window.Event('input', { bubbles: true }));
  const rows = [...doc.querySelectorAll('#ideas-body tr.idearow')];
  const expect = st.items.filter(i => i.cat === 'seo').length;
  assert.ok(expect > 0);
  assert.equal(rows.length, expect);
  sel.value = '';
  sel.dispatchEvent(new window.Event('input', { bubbles: true }));
});

test('поиск находит идею по тексту гипотезы', () => {
  const q = doc.getElementById('q');
  q.value = 'скринридер';
  q.dispatchEvent(new window.Event('input', { bubbles: true }));
  const rows = [...doc.querySelectorAll('#ideas-body tr.idearow')];
  assert.ok(rows.length >= 1, 'найдено: ' + rows.length);
  q.value = 'zzz-нет-такого';
  q.dispatchEvent(new window.Event('input', { bubbles: true }));
  assert.ok(doc.getElementById('ideas-body').textContent.includes('Ничего не найдено'));
  q.value = '';
  q.dispatchEvent(new window.Event('input', { bubbles: true }));
});

test('модалка открывается и без поддержки <dialog> (фолбэк на open)', () => {
  doc.getElementById('add-idea').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  assert.ok(doc.getElementById('dlg').open, 'диалог открыт');
  assert.ok(doc.getElementById('e-t'), 'форма отрисована');
  closeDlgViaCancel();
});

test('новая идея добавляется через модалку и попадает в таблицу', () => {
  doc.getElementById('add-idea').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  doc.getElementById('e-t').value = 'Тестовая идея из jsdom';
  doc.getElementById('e-met').value = 'тест';
  doc.getElementById('e-hy').value = 'если тест → то тесты зелёные';
  doc.getElementById('e-r').value = '100';
  doc.getElementById('e-e').value = '1';
  const before = JSON.parse(window.localStorage.getItem(LS_KEY)).items.length;
  doc.getElementById('dlg-save').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  const st = JSON.parse(window.localStorage.getItem(LS_KEY));
  assert.equal(st.items.length, before + 1);
  assert.ok(st.items.some(i => i.t === 'Тестовая идея из jsdom'));
});

test('пустое название не сохраняется', () => {
  doc.getElementById('add-idea').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  doc.getElementById('e-t').value = '   ';
  const before = JSON.parse(window.localStorage.getItem(LS_KEY)).items.length;
  doc.getElementById('dlg-save').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  assert.equal(JSON.parse(window.localStorage.getItem(LS_KEY)).items.length, before);
});

test('битый JSON в localStorage не ломает загрузку страницы', () => {
  const bad = bootDOM('{ это не json');
  assert.deepEqual(bad.errors, []);
  assert.ok(bad.doc.querySelectorAll('#ideas-body tr.idearow').length >= 33, 'поднялся демо-набор');
});

test('импорт JSON заменяет состояние', () => {
  const payload = JSON.stringify({ items: [{ id: 'q1', t: 'Импортированная', cat: 'seo', stage: 'score', r: 10, i: 1, c: 50, e: 1, met: 'm', hy: 'h' }], scores: {}, votes: {}, topics: [] });
  const f = { name: 'x.json' };
  const input = doc.getElementById('imp-file');
  Object.defineProperty(input, 'files', { value: [f], configurable: true });
  Object.defineProperty(window.FileReader.prototype, 'readAsText', {
    configurable: true, writable: true,
    value: function () { Object.defineProperty(this, 'result', { value: payload, configurable: true }); this.onload(); }
  });
  input.dispatchEvent(new window.Event('change', { bubbles: true }));
  const st = JSON.parse(window.localStorage.getItem(LS_KEY));
  assert.equal(st.items.length, 1);
  assert.equal(st.items[0].t, 'Импортированная');
  assert.equal(doc.querySelectorAll('#ideas-body tr.idearow').length, 1, 'таблица перерисовалась');
});

console.log('\n' + (failed ? '✗ ' + failed + ' провалено, ' : '✓ ') + passed + ' проверок прошло' + (failed ? '' : ', провалов нет'));
process.exit(failed ? 1 : 0);
