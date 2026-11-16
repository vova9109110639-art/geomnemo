/* «Путь» — обучение по схеме «замер → план → обучение → практика → карта знаний».
   Идея: сначала найти, где кончается понимание; потом идти от понятного к цели по шагам;
   перед объяснением — предсказание, после — проверка и «починка» ошибки; практика без названия формулы
   с лестницей подсказок; всё усвоенное копится как утверждения в «карте знаний», мысли — в журнале.
   Работает поверх данных FM и движка app.js (FM._test, FM.util, FM.api). */
(function () {
  'use strict';
  const D = window.FM;
  const PATH = (window.PATH = {});
  let A, T, U;
  const init = () => { A = D.api; T = D._test; U = D.util; };
  const pick = D.pick;
  const shuffle = (a) => { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
  const esc = (s) => U.esc(s), txt = (s) => U.txt(s), math = (s, c) => U.math(s, c), fmt = (x) => U.fmt(x);
  const close = (a, b) => Math.abs(a - b) <= Math.max(Math.abs(b) * 0.02, 1e-9);

  /* ---------- вычисление формул на числах (для вопросов «что будет, если…») ---------- */
  const ANG = new Set(['α', 'β', 'γ', 'θ', 'ψ', 'φ', 'α_0', 'φ_0']);
  const F = { sin: Math.sin, cos: Math.cos, tg: Math.tan, ctg: (x) => 1 / Math.tan(x), ln: Math.log, lg: Math.log10, log: Math.log10, arcsin: Math.asin, arccos: Math.acos, arctg: Math.atan, sqrt: Math.sqrt, sin2: (x) => Math.sin(x) ** 2, cos2: (x) => Math.cos(x) ** 2, tg2: (x) => Math.tan(x) ** 2 };
  const VAR = /(sin|cos|tg)\^2|(arcsin|arccos|arctg|sin|cos|ctg|tg|ln|lg|log)|(Δ?\p{L}(?:_\([^)]*\)|_[\p{L}\d])?)/gu;
  const jsCache = {};
  function toJS(form) {
    if (jsCache[form] !== undefined) return jsCache[form];
    let s = T.toLin(form).split('=').slice(1).join('=');
    s = s.replace(VAR, (m, f2, fn, v) => (f2 ? 'F.' + f2 + '2' : fn ? 'F.' + fn : '(V[' + JSON.stringify(v) + '])'));
    s = s.replace(/(\d),(\d)/g, '$1.$2').replace(/√(\d+(?:\.\d+)?)/g, 'F.sqrt($1)');
    s = s.replace(/%/g, '').replace(/·/g, '*').replace(/−/g, '-').replace(/±/g, '+').replace(/√/g, 'F.sqrt').replace(/°/g, '*(Math.PI/180)').replace(/\^/g, '**');
    let fn = null; try { fn = Function('V', 'F', 'return ' + s); } catch (e) { fn = null; }
    return (jsCache[form] = fn);
  }
  const evalForm = (form, V) => { const fn = toJS(form); if (!fn) return NaN; try { return fn(V, F); } catch (e) { return NaN; } };
  const varsIn = (form) => { const out = new Set(); T.toLin(form).split('=').slice(1).join('=').replace(VAR, (m, f2, fn, v) => { if (v) out.add(v); return m; }); return [...out]; };
  const vinfo = (f, k) => f.vars.find((v) => v[0] === k) || [k, k, ''];

  /* ---------- зависимости: «если X увеличить в 2 раза, Y …» ---------- */
  const RAT = [[2, 'увеличится в 2 раза'], [0.5, 'уменьшится в 2 раза'], [4, 'увеличится в 4 раза'], [0.25, 'уменьшится в 4 раза'], [8, 'увеличится в 8 раз'], [0.125, 'уменьшится в 8 раз'], [Math.SQRT2, 'увеличится в √2 раз'], [Math.SQRT1_2, 'уменьшится в √2 раз'], [1, 'не изменится']];
  const WHY = { 2: 'стоит в числителе в первой степени — прямая пропорциональность', 0.5: 'стоит в знаменателе — обратная пропорциональность', 4: 'стоит в квадрате: 2² = 4', 0.25: 'стоит в знаменателе в квадрате: 2² = 4', 8: 'стоит в кубе: 2³ = 8', 0.125: 'стоит в знаменателе в кубе: 2³ = 8', [Math.SQRT2]: 'стоит под корнем: √2 ≈ 1,41', [Math.SQRT1_2]: 'стоит под корнем в знаменателе', 1: 'на результат не влияет' };
  const depCache = {};
  function deps(f) {
    if (depCache[f.id]) return depCache[f.id];
    const out = [];
    if (f.gen && f.forms && f.ask && f.ask.length) {
      let vals = null; try { vals = f.gen(); } catch (e) { vals = null; }
      if (vals) {
        const V = Object.assign({ 'π': Math.PI }, vals);
        (f.deg || []).forEach((k) => { if (typeof V[k] === 'number') V[k] = (V[k] * Math.PI) / 180; });
        f.ask.forEach((t) => {
          const form = f.forms[t]; if (!form || typeof vals[t] !== 'number' || vals[t] === 0) return;
          const base = evalForm(form, V);
          if (!isFinite(base) || !close(base, vals[t])) return; /* формула не сходится с генератором (например, углы) — не используем */
          varsIn(form).forEach((x) => {
            const vi = vinfo(f, x);
            if (x === t || vi[3] || ANG.has(x) || !(vals[x] > 0)) return;
            const V2 = Object.assign({}, V); V2[x] = vals[x] * 2;
            const now = evalForm(form, V2), r = now / base;
            if (!isFinite(r) || r <= 0) return;
            const hit = RAT.find((p) => Math.abs(p[0] - r) < 1e-6);
            out.push({ t, x, form, r, label: hit ? hit[1] : r > 1 ? 'увеличится' : 'уменьшится', exact: !!hit, before: base, after: now, xv: vals[x], unitT: vinfo(f, t)[2], unitX: vi[2] });
          });
        });
      }
    }
    return (depCache[f.id] = out);
  }
  const depText = (f, d) => 'Если ' + vinfo(f, d.x)[1] + ' (' + d.x + ') увеличить в 2 раза, а остальное не менять, то ' + vinfo(f, d.t)[1] + ' (' + d.t + ') ' + d.label + '.';
  function depQ(f, avoid) {
    const ds = deps(f).filter((d) => !avoid || !avoid.includes(d.t + '|' + d.x));
    if (!ds.length) return null;
    const d = pick(ds);
    const pool = d.exact ? RAT.map((p) => p[1]) : ['увеличится', 'уменьшится', 'не изменится'];
    const wrong = shuffle(pool.filter((l) => l !== d.label)).slice(0, 3);
    const opts = shuffle([d.label].concat(wrong));
    const why = d.exact && WHY[d.r] ? 'В формуле ' + d.x + ' ' + WHY[d.r] + '. ' : '';
    return {
      kind: 'dep', key: d.t + '|' + d.x, fid: f.id,
      title: 'Что будет, если…?',
      body: '<div class="pq-f">' + math(d.form, 'big') + '</div><p>Величину <b>' + math(d.x) + '</b> (' + esc(vinfo(f, d.x)[1]) + ') увеличили в 2 раза, всё остальное не меняли. Что станет с <b>' + math(d.t) + '</b> (' + esc(vinfo(f, d.t)[1]) + ')?</p>',
      opts: opts.map((o) => '<span class="plain">' + esc(o) + '</span>'), correct: opts.indexOf(d.label),
      explain: why + 'Проверим на числах: было ' + d.x + ' = ' + fmt(d.xv) + ' — получилось ' + d.t + ' = ' + fmt(d.before) + (d.unitT ? ' ' + d.unitT : '') + '; стало ' + d.x + ' = ' + fmt(d.xv * 2) + ' — получилось ' + d.t + ' = ' + fmt(d.after) + (d.unitT ? ' ' + d.unitT : '') + '. Отношение ' + fmt(d.after / d.before) + '.'
    };
  }

  /* ---------- вопросы разных видов ---------- */
  const can = (f, m) => T.capable[m] && T.capable[m](f);
  function choiceFrom(q, kind, f, explain) {
    return { kind, fid: f.id, title: q.title, body: (q.symbol && kind === 'sym' ? '<div class="pq-f">' + math(q.showFormula || q.symbol, 'big') + '</div><p>Буква: <b>' + math(q.symbol) + '</b></p>' : ''), opts: q.opts.map((o) => o.h), correct: q.correct, explain: explain || q.explain || q.note || '' };
  }
  function calcQ(f, noName) {
    const q = T.makeCalc(f);
    const g = (q.given || []).map((x) => '<span class="gv">' + math(x[0]) + ' = ' + fmt(x[1]) + (x[2] ? ' ' + esc(x[2]) : '') + '</span>').join('');
    return {
      kind: 'calc', fid: f.id, title: noName ? 'Задача' : 'Посчитай',
      body: (q.text ? '<p>' + txt(q.text) + '</p>' : '') + (g ? '<div class="given"><b>Дано:</b>' + g + '</div>' : '') + '<div class="find"><b>Найти:</b> ' + (q.find[0] === '~' ? '' : math(q.find[0]) + ' — ') + esc(q.find[1]) + (q.unit ? ' (в ' + esc(q.unit) + ')' : '') + '</div>',
      ans: q.ans, unit: q.unit, sol: q.sol, warn: q.warn,
      hints: [
        (q.given && q.given.length ? 'Дано: ' + q.given.map((x) => vinfo(f, x[0])[1]).join(', ') + '. ' : '') + 'Найти: ' + q.find[1] + '. Какая формула связывает эти величины?',
        'Это карточка «' + f.name + '».',
        f.f ? 'Формула: ' + math(f.f) : '',
        'Решение: ' + q.sol.map((s) => (s[0] === '~' ? esc(s.slice(1)) : math(s))).join(' → ')
      ].filter(Boolean),
      explain: '<div class="sol">' + q.sol.map((s) => '<div>' + (s[0] === '~' ? esc(s.slice(1)) : math(s)) + '</div>').join('') + '<div class="sol-a">Ответ: <b>' + fmt(q.ans) + ' ' + esc(q.unit || '') + '</b></div></div>' + (q.warn ? '<p class="note">⚠️ ' + txt(q.warn) + '</p>' : '')
    };
  }
  /* вопрос для замера: сначала понимание зависимости, потом правило, формула, буква */
  function probeQ(f) {
    return depQ(f) || (can(f, 'rule') && choiceFrom(T.makeRule(f), 'rule', f)) || (can(f, 'pick') && choiceFrom(T.makePick(f), 'pick', f, f.f ? 'Верная формула: ' + math(f.f) : '')) || (can(f, 'sym') && choiceFrom(T.makeSym(f), 'sym', f)) || (can(f, 'calc') && calcQ(f));
  }
  function checkQs(f, used) {
    const qs = [];
    const d = depQ(f, used); if (d) qs.push(d);
    if (can(f, 'calc')) qs.push(calcQ(f));
    else if (can(f, 'rule')) qs.push(choiceFrom(T.makeRule(f), 'rule', f));
    if (qs.length < 2 && can(f, 'pick')) qs.push(choiceFrom(T.makePick(f), 'pick', f, f.f ? 'Верная формула: ' + math(f.f) : ''));
    if (qs.length < 2 && can(f, 'sym')) qs.push(choiceFrom(T.makeSym(f), 'sym', f));
    return qs.slice(0, 2);
  }
  function sameKind(q, f) {
    if (q.kind === 'dep') return depQ(f) || calcQ(f);
    if (q.kind === 'calc') return calcQ(f, q.title === 'Задача');
    if (q.kind === 'rule') return choiceFrom(T.makeRule(f), 'rule', f);
    if (q.kind === 'pick') return choiceFrom(T.makePick(f), 'pick', f, q.explain);
    return choiceFrom(T.makeSym(f), 'sym', f);
  }

  /* ---------- состояние ---------- */
  const st = () => A.store.get('path', {});
  const save = (s) => A.store.set('path', s);
  const tstate = (tid) => st()[tid] || { stage: 'new' };
  const setT = (tid, o) => { const s = st(); s[tid] = Object.assign(s[tid] || { stage: 'new' }, o); save(s); return s[tid]; };
  function journal(fid, stage, text) {
    if (!text || !text.trim()) return;
    const j = A.store.get('journal', []); j.unshift({ t: Date.now(), fid, stage, text: text.trim().slice(0, 1000) }); A.store.set('journal', j.slice(0, 300));
  }
  const cardsOf = (tid) => D.formulas.filter((f) => f.topic === tid);
  const topic = (tid) => D.topics.find((t) => t.id === tid);
  const STAGES = [['measure', '🔎 Замер'], ['plan', '🗺️ План'], ['teach', '🧑‍🏫 Обучение'], ['practice', '🏋️ Практика'], ['done', '✅ Готово']];
  const stageIdx = (s) => STAGES.findIndex((x) => x[0] === s);
  const stageLabel = (ts) => (ts.stage === 'new' ? 'не начат' : ts.stage === 'teach' ? 'обучение ' + Math.min((ts.ti || 0) + 1, (ts.plan || []).length) + '/' + (ts.plan || []).length : (STAGES.find((x) => x[0] === ts.stage) || [0, ''])[1]);

  let run = null; /* текущий «экран»: вопросы, индексы — живёт до ухода со страницы */
  let app = null;

  /* ---------- общий вид вопроса ---------- */
  function qHTML(q, opt) {
    opt = opt || {};
    const head = '<div class="pq-head"><span class="pill">' + esc(q.title) + '</span>' + (opt.progress || '') + '</div>';
    let ans = '';
    if (q.kind === 'calc') ans = '<div class="pq-ans"><input id="pans" inputmode="decimal" autocomplete="off" placeholder="Ответ числом">' + (q.unit ? '<span class="u">' + esc(q.unit) + '</span>' : '') + '</div>';
    else ans = '<div class="pq-opts">' + q.opts.map((o, i) => '<button class="popt" data-pa="opt" data-i="' + i + '"><b>' + (i + 1) + '</b>' + o + '</button>').join('') + '</div>';
    const conf = opt.conf ? '<div class="pq-conf"><span>Насколько уверен?</span><button class="btn sm" data-pa="conf" data-c="2">💪 Знаю</button><button class="btn ghost sm" data-pa="conf" data-c="1">🤔 Думаю, что так</button><button class="btn ghost sm" data-pa="conf" data-c="0">🎲 Угадываю</button><button class="btn ghost sm" data-pa="dunno">🙈 Не знаю</button></div>' : '<div class="pq-conf"><button class="btn" data-pa="submit">Ответить</button>' + (opt.dunno ? '<button class="btn ghost sm" data-pa="dunno">🙈 Не знаю</button>' : '') + '</div>';
    const hints = opt.hints && q.hints ? '<div class="pq-hints" id="phints"></div><button class="btn ghost sm" data-pa="hint">💡 Подсказка (' + q.hints.length + ')</button>' : '';
    const think = '<details class="pq-think"' + (opt.thinkOpen ? ' open' : '') + '><summary>💭 Мысли вслух <small>(как ты рассуждаешь, в чём сомневаешься — это сохранится в журнале)</small></summary><textarea id="pthink" rows="2" placeholder="Например: «думаю, что объём в знаменателе, потому что…»"></textarea></details>';
    return '<section class="pq">' + head + '<div class="pq-body">' + q.body + '</div>' + ans + hints + think + conf + '<div id="pfb" class="pq-fb" aria-live="polite"></div></section>';
  }
  /* ответ: возвращает true/false/null(нет ответа) */
  function readAnswer(q) {
    if (q.kind === 'calc') { const inp = app.querySelector('#pans'); const v = T.parseNum(inp ? inp.value : ''); if (isNaN(v)) { if (inp) { inp.classList.add('shake'); setTimeout(() => inp.classList.remove('shake'), 400); } A.toast('Введи число'); return null; } return close(v, q.ans); }
    const sel = app.querySelector('.popt.sel'); if (!sel) { A.toast('Выбери вариант'); return null; }
    return +sel.dataset.i === q.correct;
  }
  function showFB(q, ok, extra) {
    app.querySelectorAll('.popt').forEach((b) => { b.disabled = true; if (+b.dataset.i === q.correct) b.classList.add('ok'); else if (b.classList.contains('sel')) b.classList.add('bad'); });
    const inp = app.querySelector('#pans'); if (inp) inp.disabled = true;
    app.querySelectorAll('.pq-conf button, [data-pa="hint"]').forEach((b) => b.remove());
    const fb = app.querySelector('#pfb');
    fb.innerHTML = '<div class="pfb ' + (ok ? 'good' : 'badfb') + '"><b>' + (ok ? '✓ Верно' : '✗ Пока нет') + '</b>' + (q.explain ? '<div class="pfb-x">' + q.explain + '</div>' : '') + (extra || '') + '</div>';
    if (window.FX) { try { FX.sfx(ok ? 'ok' : 'bad'); } catch (e) { /* звук не обязателен */ } }
    const think = app.querySelector('#pthink'); if (think) { journal(q.fid, run && run.stage, think.value); think.disabled = true; }
  }
  const stepper = (cur) => '<ol class="pstep">' + STAGES.map((s, i) => '<li class="' + (i < stageIdx(cur) ? 'done' : i === stageIdx(cur) ? 'on' : '') + '">' + s[1] + '</li>').join('') + '</ol>';
  const head = (t, cur) => '<a class="back" href="#/path">← Все пути</a><div class="ph" style="--tc:' + t.color + '"><span class="th-ico">' + t.icon + '</span><div><span class="pill">🧭 Путь обучения</span><h1>' + esc(t.name) + '</h1></div></div>' + stepper(cur);

  /* ---------- экраны ---------- */
  function viewHome() {
    const s = st(), groups = {};
    D.topics.filter((t) => A.gradeOk(t)).forEach((t) => { const g = t.grade ? t.grade + ' класс' : ((D.secs || []).find((x) => x.id === t.sec) || {}).name || ''; (groups[g] = groups[g] || []).push(t); });
    const jn = A.store.get('journal', []).length;
    app.innerHTML = '<div class="page-head"><h1>🧭 Путь обучения</h1><p>Выбери тему-цель. Сначала короткий <b>замер</b>: где ты уже уверен, а где плаваешь. Потом <b>план</b> — что разбирать и в каком порядке. Потом <b>обучение</b> по одному шагу: предскажи → объяснение → проверь себя (ошибку сразу «чиним»). В конце — <b>практика</b> без названия формулы, с подсказками по ступенькам.</p>' +
      '<div class="cta"><a class="btn ghost" href="#/path/map">🗺️ Карта знаний</a><a class="btn ghost" href="#/path/journal">💭 Журнал мыслей (' + jn + ')</a></div></div>' +
      Object.keys(groups).map((g) => '<h2>' + esc(g) + '</h2><div class="tgrid big">' + groups[g].map((t) => {
        const ts = s[t.id] || { stage: 'new' }, n = cardsOf(t.id).length, i = stageIdx(ts.stage);
        return '<a class="tcard lg pth' + (ts.stage === 'done' ? ' fin' : '') + '" href="#/path/' + t.id + '" style="--tc:' + t.color + '"><span class="ti">' + t.icon + '</span><div><b>' + esc(t.name) + '</b><small>' + n + ' карточ. · ' + esc(stageLabel(ts)) + '</small></div><div class="pbar"><i style="width:' + Math.round(Math.max(0, i) / 4 * 100) + '%"></i></div></a>';
      }).join('') + '</div>').join('');
  }

  function viewTopic(tid) {
    const t = topic(tid); if (!t) { location.hash = '#/path'; return; }
    const ts = tstate(tid);
    if (ts.stage === 'new') return viewStart(t);
    if (ts.stage === 'measure') return viewMeasure(t);
    if (ts.stage === 'plan') return viewPlan(t);
    if (ts.stage === 'teach') return viewTeach(t);
    if (ts.stage === 'practice') return viewPractice(t);
    return viewDone(t);
  }
  function viewStart(t) {
    const fs = cardsOf(t.id);
    app.innerHTML = head(t, 'measure') + '<section class="pcard"><h2>С чего начнём</h2><p>' + txt(t.story) + '</p><p>В теме <b>' + fs.length + '</b> карточ. Сначала ответь на ' + Math.min(fs.length, 8) + ' коротких вопросов — по одному на карточку. После каждого ответа отметь, насколько уверен: так «Путь» поймёт, что ты знаешь точно, а что наугад. Можно писать «мысли вслух» — это помогает и тебе, и учителю.</p>' +
      '<div class="cta"><button class="btn big" data-pa="start">🔎 Начать замер</button><button class="btn ghost" data-pa="skipmeasure">Я новичок — сразу учить всё</button></div></section>';
  }
  function viewMeasure(t) {
    if (!run || run.tid !== t.id || run.stage !== 'measure') {
      const fs = cardsOf(t.id).slice(0, 8);
      run = { tid: t.id, stage: 'measure', i: 0, items: fs.map((f) => ({ f, q: probeQ(f) })).filter((x) => x.q), res: {}, used: {} };
    }
    const it = run.items[run.i];
    if (!it) { finishMeasure(t); return; }
    app.innerHTML = head(t, 'measure') + qHTML(it.q, { conf: true, progress: '<span class="pq-n">вопрос ' + (run.i + 1) + ' из ' + run.items.length + '</span>' });
  }
  function finishMeasure(t) {
    const fs = cardsOf(t.id), probe = {};
    fs.forEach((f) => { probe[f.id] = run.res[f.id] || 'no'; });
    const used = run.used;
    setT(t.id, { stage: 'plan', probe, used, plan: fs.filter((f) => probe[f.id] !== 'know').map((f) => f.id) });
    run = null; viewTopic(t.id);
  }
  function relies(f, fs) {
    const mine = new Set(f.vars.map((v) => v[0])), out = [];
    fs.forEach((g) => { if (g.id !== f.id && fs.indexOf(g) < fs.indexOf(f)) { const tg = g.forms ? Object.keys(g.forms)[0] : g.vars[0] && g.vars[0][0]; if (tg && mine.has(tg)) out.push(g); } });
    return out;
  }
  function viewPlan(t) {
    const ts = tstate(t.id), fs = cardsOf(t.id), plan = ts.plan || [];
    const prevT = D.topics.filter((x) => (x.sec === t.sec || (x.grade && x.grade === t.grade)) && D.topics.indexOf(x) < D.topics.indexOf(t)).slice(-1)[0];
    const ST = { know: ['💪', 'знаешь'], shaky: ['🤔', 'шатко'], no: ['❓', 'не знаешь'] };
    app.innerHTML = head(t, 'plan') + '<section class="pcard"><h2>План: от того, что знаешь, — к цели</h2><p>Карточки, которые ты знаешь уверенно, пропустим (они вернутся в практике). Остальные разберём по порядку: каждая следующая опирается на предыдущие. Нажми на строку, чтобы включить или исключить карточку.</p>' +
      (prevT ? '<p class="muted">Тема опирается на «' + esc(prevT.name) + '» — если там пробелы, загляни в <a href="#/path/' + prevT.id + '">её путь</a>.</p>' : '') +
      '<ol class="pplan">' + fs.map((f) => { const p = (ts.probe || {})[f.id] || 'no', on = plan.includes(f.id), rl = relies(f, fs); return '<li class="' + (on ? 'on' : 'off') + '"><button data-pa="toggle" data-id="' + f.id + '"><span class="pp-s">' + ST[p][0] + '</span><span class="pp-n"><b>' + esc(f.name) + '</b><small>' + ST[p][1] + (rl.length ? ' · опирается на: ' + rl.map((g) => esc(g.name)).join(', ') : '') + '</small></span><span class="pp-f">' + (f.f ? math(f.f) : '') + '</span><span class="pp-on">' + (on ? 'разберём' : 'пропустим') + '</span></button></li>'; }).join('') + '</ol>' +
      '<div class="cta"><button class="btn big" data-pa="teach">' + (plan.length ? '🧑‍🏫 Начать обучение (' + plan.length + ')' : '🏋️ Всё знаю — к практике') + '</button><button class="btn ghost" data-pa="remeasure">🔎 Замер заново</button></div></section>';
  }

  /* обучение: предскажи → объяснение по ступеням → проверка (с починкой) */
  function ladder(f) {
    const t = topic(f.topic), m = f.m || {}, L = [];
    L.push(['🌍 Жизнь', '<p>' + txt(m.story || t.story) + '</p>']);
    if (f.vars && f.vars.length) L.push(['🔤 Слова и буквы', '<table class="vars"><tbody>' + f.vars.map((v) => '<tr><td class="vs">' + math(v[0]) + '</td><td>' + esc(v[1]) + (v[3] ? ' <small>(постоянная)</small>' : '') + '</td><td class="vu">' + (v[2] ? esc(v[2]) : '—') + '</td></tr>').join('') + '</tbody></table>']);
    const ds = deps(f).slice(0, 4);
    const forms = f.forms ? Object.values(f.forms).filter((s) => s !== f.f) : [];
    if (f.f || f.ruleText) L.push(['📐 Формула и смысл', (f.f ? '<div class="pq-f">' + math(f.f, 'big') + '</div>' : '') + (f.ruleText ? '<div class="rule">' + txt(f.ruleText) + '</div>' : '') + (ds.length ? '<ul class="pdeps">' + ds.map((d) => '<li>' + esc(depText(f, d)) + '</li>').join('') + '</ul>' : '') + (forms.length ? '<div class="forms"><span>Выразим:</span>' + forms.map((s) => '<span class="form">' + math(s) + '</span>').join('') + '</div>' : '')]);
    if (m.lines && m.lines.length) L.push(['🧠 Как запомнить', '<ul class="plines">' + m.lines.map((l) => '<li><span class="badge">' + D.types[l.t].icon + ' ' + D.types[l.t].label + '</span> ' + txt(l.x) + '</li>').join('') + '</ul>']);
    if (can(f, 'calc')) { const q = calcQ(f); L.push(['🔢 Разбор примера', q.body + q.explain]); }
    if (m.trap) L.push(['⚠️ Типичная ошибка', '<p>' + txt(m.trap) + '</p>']);
    return L;
  }
  function viewTeach(t) {
    const ts = tstate(t.id), plan = ts.plan || [];
    const ti = ts.ti || 0;
    if (ti >= plan.length) { setT(t.id, { stage: 'practice' }); run = null; viewTopic(t.id); return; }
    const f = D.formulas.find((x) => x.id === plan[ti]);
    if (!run || run.tid !== t.id || run.stage !== 'teach' || run.fid !== f.id) {
      const pq = depQ(f, (ts.used || {})[f.id] ? [ts.used[f.id]] : null) || (can(f, 'pick') ? choiceFrom(T.makePick(f), 'pick', f, f.f ? 'Верная формула: ' + math(f.f) : '') : null) || (can(f, 'rule') ? choiceFrom(T.makeRule(f), 'rule', f) : null);
      if (pq) pq.title = 'Предскажи, прежде чем читать';
      run = { tid: t.id, stage: 'teach', fid: f.id, sub: pq ? 'predict' : 'explain', pq, L: ladder(f), shown: 1, checks: null, ci: 0, tries: 0, repairs: 0 };
    }
    const prog = '<div class="pt-prog">Карточка ' + (ti + 1) + ' из ' + plan.length + ': <b>' + esc(f.name) + '</b></div>';
    let html = head(t, 'teach') + prog;
    if (run.sub === 'predict') html += qHTML(run.pq, { thinkOpen: true, dunno: true, progress: '<span class="pq-n">шаг 1: предсказание</span>' }) + '<p class="muted">Не бойся ошибиться: предсказание нужно, чтобы объяснение «легло» на твою мысль.</p>';
    else if (run.sub === 'explain') {
      html += '<section class="pcard pladder"><h2>Объяснение по шагам</h2>' + run.L.slice(0, run.shown).map((b, i) => '<div class="pl-step" style="--i:' + i + '"><h3>' + b[0] + '</h3>' + b[1] + '</div>').join('') +
        '<div class="cta">' + (run.shown < run.L.length ? '<button class="btn" data-pa="more">Дальше: ' + run.L[run.shown][0] + ' →</button>' : '<button class="btn" data-pa="tocheck">✅ Проверить себя</button>') + '<a class="btn ghost sm" href="#/card/' + f.id + '">Открыть карточку</a></div></section>';
    } else if (run.sub === 'check') {
      const q = run.checks[run.ci];
      html += qHTML(q, { dunno: true, progress: '<span class="pq-n">проверка ' + (run.ci + 1) + ' из ' + run.checks.length + (run.tries ? ' · попытка ' + (run.tries + 1) : '') + '</span>' });
    }
    app.innerHTML = html;
  }
  function viewPractice(t) {
    if (!run || run.tid !== t.id || run.stage !== 'practice') {
      const fs = cardsOf(t.id).filter((f) => can(f, 'calc') || can(f, 'rule') || can(f, 'pick'));
      const ts = tstate(t.id), weak = (f) => ((ts.plan || []).includes(f.id) ? 2 : 1);
      const bag = []; fs.forEach((f) => { for (let k = 0; k < weak(f); k++) bag.push(f); });
      const items = shuffle(bag).slice(0, Math.min(8, Math.max(4, bag.length))).map((f) => ({ f }));
      run = { tid: t.id, stage: 'practice', items, i: 0, ok: 0, clean: 0, extra: 0, hints: 0 };
    }
    const it = run.items[run.i];
    if (!it) {
      setT(t.id, { stage: 'done', last: { ok: run.ok, clean: run.clean, n: run.items.length, at: Date.now() } });
      run = null; viewTopic(t.id); return;
    }
    if (!it.q) {
      const f = it.f;
      it.q = can(f, 'calc') ? calcQ(f, true) : can(f, 'rule') ? choiceFrom(T.makeRule(f), 'rule', f) : choiceFrom(T.makePick(f), 'pick', f, f.f ? 'Верная формула: ' + math(f.f) : '');
      if (it.q.kind !== 'calc') it.q.hints = ['Это из карточки «' + f.name + '».', f.m && f.m.lines && f.m.lines[0] ? txt(f.m.lines[0].x) : ''].filter(Boolean);
      it.q.title = 'Задача ' + (run.i + 1);
      it.h = 0;
    }
    app.innerHTML = head(t, 'practice') + '<p class="muted">Название формулы не подсказываем: вспомни сам, какая карточка подходит. Застрял — бери подсказки по одной.</p>' + qHTML(it.q, { hints: true, dunno: true, progress: '<span class="pq-n">' + (run.i + 1) + ' из ' + run.items.length + ' · верно ' + run.ok + '</span>' });
  }
  function viewDone(t) {
    const ts = tstate(t.id), l = ts.last || {};
    app.innerHTML = head(t, 'done') + '<section class="pcard"><h2>✅ Тема пройдена</h2><p>Практика: верно <b>' + (l.ok || 0) + '</b> из ' + (l.n || 0) + ', без подсказок — <b>' + (l.clean || 0) + '</b>.</p><p>Утверждения из этой темы добавлены в <a href="#/path/map">карту знаний</a>. Через пару дней вернись к практике — повторение закрепляет.</p>' +
      '<div class="cta"><button class="btn" data-pa="again">🏋️ Ещё практика</button><button class="btn ghost" data-pa="remeasure">🔎 Пройти путь заново</button><a class="btn ghost" href="#/path">Другая тема</a></div></section>';
  }

  /* карта знаний и журнал */
  function viewMap() {
    const s = st(), prog = A.prog;
    const groups = {};
    D.topics.filter((t) => A.gradeOk(t)).forEach((t) => { const g = t.grade ? t.grade + ' класс' : ((D.secs || []).find((x) => x.id === t.sec) || {}).name || ''; (groups[g] = groups[g] || []).push(t); });
    const lvl = (f, ts) => { const p = prog[f.id], b = p ? p.b : 0; if (ts.stage === 'done' || b >= 4) return 'k3'; if ((ts.plan || []).includes(f.id) && ts.stage !== 'new' && (ts.ti || 0) > (ts.plan || []).indexOf(f.id)) return 'k2'; if (b >= 1 || (ts.probe && ts.probe[f.id] === 'know')) return 'k1'; return 'k0'; };
    let total = 0, know = 0;
    const body = Object.keys(groups).map((g) => '<h2>' + esc(g) + '</h2>' + groups[g].map((t) => {
      const ts = s[t.id] || { stage: 'new' }, fs = cardsOf(t.id);
      return '<details class="pmap" style="--tc:' + t.color + '"><summary><span class="ti">' + t.icon + '</span><b>' + esc(t.name) + '</b><span class="pm-dots">' + fs.map((f) => { const k = lvl(f, ts); total++; if (k === 'k3') know++; return '<i class="' + k + '" title="' + esc(f.name) + '"></i>'; }).join('') + '</span></summary>' +
        '<ul class="pm-list">' + fs.map((f) => { const ds = deps(f).slice(0, 3); return '<li class="' + lvl(f, ts) + '"><a href="#/card/' + f.id + '"><b>' + esc(f.name) + '</b></a>' + (f.f ? ' ' + math(f.f) : '') + (f.ruleText && !f.f ? '<div class="pm-s">' + txt(f.ruleText) + '</div>' : '') + (ds.length ? '<div class="pm-s">' + ds.map((d) => esc(depText(f, d))).join('<br>') + '</div>' : '') + '</li>'; }).join('') + '</ul></details>';
    }).join('')).join('');
    app.innerHTML = '<a class="back" href="#/path">← Все пути</a><div class="page-head"><h1>🗺️ Карта знаний</h1><p>Всё, что ты разобрал, — в виде утверждений: формула и «что будет, если…». Цвет точки: <i class="kd k3"></i> усвоено, <i class="kd k2"></i> разобрано, <i class="kd k1"></i> встречалось, <i class="kd k0"></i> впереди. Усвоено: <b>' + know + '</b> из ' + total + '.</p></div>' + body;
  }
  function viewJournal() {
    const j = A.store.get('journal', []);
    const name = (id) => { const f = D.formulas.find((x) => x.id === id); return f ? f.name : id; };
    app.innerHTML = '<a class="back" href="#/path">← Все пути</a><div class="page-head"><h1>💭 Журнал мыслей</h1><p>Твои рассуждения вслух — по шагам пути. Перечитывай: видно, как менялось понимание. Хранится только в этом браузере.</p></div>' +
      (j.length ? '<ol class="pjournal">' + j.map((e) => '<li><small>' + new Date(e.t).toLocaleString('ru-RU') + ' · ' + esc(name(e.fid)) + ' · ' + esc({ measure: 'замер', teach: 'обучение', practice: 'практика' }[e.stage] || '') + '</small><p>' + esc(e.text) + '</p></li>').join('') + '</ol><div class="cta"><button class="btn danger sm" data-pa="clearj">Очистить журнал</button></div>' : '<p class="muted">Пока пусто. Пиши «мысли вслух» под вопросами пути.</p>');
  }

  /* ---------- события ---------- */
  function onClick(e) {
    const b = e.target.closest('[data-pa]'); if (!b || !app.contains(b)) return;
    const pa = b.dataset.pa, tid = run ? run.tid : (location.hash.split('/')[2] || '').split('?')[0], t = topic(tid);
    if (pa === 'opt') { if (b.disabled) return; app.querySelectorAll('.popt').forEach((x) => x.classList.toggle('sel', x === b)); return; }
    if (pa === 'start') { setT(tid, { stage: 'measure' }); run = null; viewTopic(tid); return; }
    if (pa === 'skipmeasure') { const fs = cardsOf(tid); setT(tid, { stage: 'plan', probe: {}, plan: fs.map((f) => f.id), ti: 0 }); run = null; viewTopic(tid); return; }
    if (pa === 'remeasure') { setT(tid, { stage: 'measure', ti: 0, probe: {}, plan: [] }); run = null; viewTopic(tid); return; }
    if (pa === 'again') { setT(tid, { stage: 'practice' }); run = null; viewTopic(tid); return; }
    if (pa === 'toggle') { const ts = tstate(tid), plan = (ts.plan || []).slice(), id = b.dataset.id, i = plan.indexOf(id); if (i >= 0) plan.splice(i, 1); else plan.push(id); const order = cardsOf(tid).map((f) => f.id); plan.sort((x, y) => order.indexOf(x) - order.indexOf(y)); setT(tid, { plan }); viewPlan(t); return; }
    if (pa === 'teach') { setT(tid, { stage: (tstate(tid).plan || []).length ? 'teach' : 'practice', ti: 0 }); run = null; viewTopic(tid); return; }
    if (pa === 'clearj') { if (confirm('Очистить журнал мыслей?')) { A.store.set('journal', []); viewJournal(); } return; }
    if (!run) return;
    /* замер */
    if (run.stage === 'measure' && (pa === 'conf' || pa === 'dunno')) {
      const it = run.items[run.i];
      if (pa === 'dunno') { run.res[it.f.id] = 'no'; showFB(it.q, false); }
      else { const ok = readAnswer(it.q); if (ok === null) return; const c = +b.dataset.c; run.res[it.f.id] = ok ? (c === 2 ? 'know' : 'shaky') : 'no'; showFB(it.q, ok, ok && c < 2 ? '<p class="note">Ответ верный, но ты не уверен — разберём эту карточку.</p>' : ''); }
      if (it.q.key) run.used[it.f.id] = it.q.key;
      A.record(it.f.id, run.res[it.f.id] === 'know' ? 1 : run.res[it.f.id] === 'no' ? -1 : 0);
      app.querySelector('#pfb').insertAdjacentHTML('beforeend', '<div class="cta"><button class="btn" data-pa="next">' + (run.i + 1 < run.items.length ? 'Дальше →' : 'К плану →') + '</button></div>');
      return;
    }
    if (run.stage === 'measure' && pa === 'next') { run.i++; viewTopic(tid); return; }
    /* обучение */
    if (run.stage === 'teach') {
      const ts = tstate(tid), f = D.formulas.find((x) => x.id === run.fid);
      if (run.sub === 'predict' && (pa === 'submit' || pa === 'dunno')) {
        let ok = false; if (pa === 'submit') { ok = readAnswer(run.pq); if (ok === null) return; }
        showFB(run.pq, ok, '<p class="note">' + (ok ? 'Интуиция не подвела. Сейчас разберём, почему это так.' : 'Ничего страшного — сейчас разберём по шагам, и станет понятно, почему ответ другой.') + '</p>');
        app.querySelector('#pfb').insertAdjacentHTML('beforeend', '<div class="cta"><button class="btn" data-pa="toexplain">К объяснению →</button></div>');
        return;
      }
      if (pa === 'toexplain') { run.sub = 'explain'; viewTeach(t); return; }
      if (pa === 'more') { run.shown++; viewTeach(t); const last = app.querySelectorAll('.pl-step'); if (last.length) last[last.length - 1].scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
      if (pa === 'tocheck') { run.sub = 'check'; run.checks = checkQs(f, run.pq && run.pq.key ? [run.pq.key] : null); run.ci = 0; run.tries = 0; if (!run.checks.length) { nextCard(t, ts); return; } viewTeach(t); return; }
      if (run.sub === 'check' && (pa === 'submit' || pa === 'dunno')) {
        const q = run.checks[run.ci]; let ok = false;
        if (pa === 'submit') { ok = readAnswer(q); if (ok === null) return; }
        A.record(f.id, ok ? (run.tries ? 0 : 1) : -1);
        if (ok) { showFB(q, true); app.querySelector('#pfb').insertAdjacentHTML('beforeend', '<div class="cta"><button class="btn" data-pa="checknext">Дальше →</button></div>'); }
        else {
          run.repairs++;
          showFB(q, false, '<p class="note">🔧 Починка: посмотри разбор выше и попробуй такой же вопрос с другими числами.' + (run.tries >= 2 ? ' Если снова не выйдет — пойдём дальше, а эта карточка чаще будет попадаться в практике.' : '') + '</p>');
          app.querySelector('#pfb').insertAdjacentHTML('beforeend', '<div class="cta">' + (run.tries < 2 ? '<button class="btn" data-pa="retry">🔁 Попробовать ещё</button>' : '<button class="btn" data-pa="checknext">Дальше →</button>') + '<button class="btn ghost sm" data-pa="reexplain">📖 Объяснение ещё раз</button></div>');
        }
        return;
      }
      if (pa === 'retry') { run.tries++; run.checks[run.ci] = sameKind(run.checks[run.ci], f); viewTeach(t); return; }
      if (pa === 'reexplain') { run.sub = 'explain'; run.shown = run.L.length; viewTeach(t); return; }
      if (pa === 'checknext') { run.ci++; run.tries = 0; if (run.ci >= run.checks.length) { nextCard(t, ts); return; } viewTeach(t); return; }
    }
    /* практика */
    if (run.stage === 'practice') {
      const it = run.items[run.i];
      if (pa === 'hint') { const q = it.q; if (it.h < q.hints.length) { app.querySelector('#phints').insertAdjacentHTML('beforeend', '<div class="phint"><b>Подсказка ' + (it.h + 1) + '.</b> ' + q.hints[it.h] + '</div>'); it.h++; run.hints++; } if (it.h >= q.hints.length) b.remove(); else b.textContent = '💡 Ещё подсказка (' + (q.hints.length - it.h) + ')'; return; }
      if (pa === 'submit' || pa === 'dunno') {
        let ok = false; if (pa === 'submit') { ok = readAnswer(it.q); if (ok === null) return; }
        A.record(it.f.id, ok ? (it.h ? 0 : 1) : -1);
        if (ok) { run.ok++; if (!it.h) run.clean++; A.addXp(it.h ? 5 : 10); }
        else if (run.extra < 4) { run.items.splice(Math.min(run.i + 3, run.items.length), 0, { f: it.f }); run.extra++; }
        showFB(it.q, ok, ok ? '' : '<p class="note">Эта задача вернётся с другими числами чуть позже.</p>');
        app.querySelector('#pfb').insertAdjacentHTML('beforeend', '<div class="cta"><button class="btn" data-pa="pnext">' + (run.i + 1 < run.items.length ? 'Следующая →' : 'Итоги →') + '</button></div>');
        return;
      }
      if (pa === 'pnext') { run.i++; viewTopic(tid); return; }
    }
  }
  function nextCard(t, ts) {
    const done = A.store.get('pathDone', {}); done[run.fid] = run.repairs ? 'shaky' : 'ok'; A.store.set('pathDone', done);
    setT(t.id, { ti: (ts.ti || 0) + 1 }); run = null; viewTopic(t.id);
    window.scrollTo(0, 0);
  }

  PATH.view = function (root, parts) {
    init(); app = root;
    if (!PATH.bound) { document.addEventListener('click', onClick); PATH.bound = true; }
    const p = parts[1];
    if (!p) { run = null; viewHome(); return; }
    if (p === 'map') { run = null; viewMap(); return; }
    if (p === 'journal') { run = null; viewJournal(); return; }
    viewTopic(p);
  };
  PATH._cur = () => run;
  const w = (fn) => (...a) => { init(); return fn(...a); };
  PATH._deps = w(deps); PATH._depQ = w(depQ); PATH._probeQ = w(probeQ); PATH._checkQs = w(checkQs); PATH._evalForm = w(evalForm);
})();
