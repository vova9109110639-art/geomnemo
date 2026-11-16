/* МнемоГеометрия — «Опыты»: интерактивные чертежи. Каждый: mount({stage, ctl, out}) → функция очистки (необязательно). */
(function () {
  'use strict';
  const LAB = (window.LAB = { sims: [] });
  const U = () => FM.util;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const dec = (step) => (String(step).split('.')[1] || '').length;
  const num = (x, d) => (+(+x).toFixed(d == null ? 2 : d)).toString().replace('.', ',').replace('-', '−');
  const rad = (d) => (d * Math.PI) / 180, deg = (r) => (r * 180) / Math.PI;
  const SIN = '#ff9ad5', COS = '#7db8ff', TAN = '#ffd166', OK = '#6ee7a5', WHITE = '#fff';

  const slider = (id, label, min, max, step, val, unit) =>
    '<label class="sl"><span>' + label + ' <b id="' + id + '-v">' + num(val, dec(step)) + '</b> ' + unit + '</span><input type="range" id="' + id + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + val + '"></label>';
  function bind(ctl, ids, on) {
    const get = () => Object.fromEntries(ids.map((id) => [id, +ctl.querySelector('#' + id).value]));
    ids.forEach((id) => {
      const inp = ctl.querySelector('#' + id), out = ctl.querySelector('#' + id + '-v'), d = dec(inp.step);
      inp.addEventListener('input', () => { out.textContent = num(inp.value, d); on(get(), id); if (window.FX) FX.sfx('move'); });
    });
    return get;
  }
  function loop(fn) {
    let alive = true, raf = 0, last = performance.now();
    const step = (ts) => { if (!alive) return; const dt = Math.min(0.05, (ts - last) / 1000); last = ts; fn(dt, ts / 1000); raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => { alive = false; cancelAnimationFrame(raf); };
  }
  const svg = (w, h, inner) => '<svg viewBox="0 0 ' + w + ' ' + h + '" class="svg" role="img" aria-label="опыт">' + inner + '</svg>';
  const DEFS = '<defs><marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="3.4" markerHeight="3.4" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="context-stroke"/></marker></defs>';
  const set = (el, o) => { for (const k in o) el.setAttribute(k, o[k]); };
  const T = (x, y, s, fill, size, anchor, extra) => '<text x="' + x + '" y="' + y + '" fill="' + (fill || WHITE) + '" font-size="' + (size || 14) + '" text-anchor="' + (anchor || 'start') + '" ' + (extra || '') + '>' + s + '</text>';
  const L = (x1, y1, x2, y2, col, w, extra) => '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + col + '" stroke-width="' + (w || 2) + '" ' + (extra || '') + '/>';
  const pts = (arr) => arr.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  const poly = (arr, fill, stroke, w) => '<polygon points="' + pts(arr) + '" fill="' + fill + '" stroke="' + (stroke || 'none') + '" stroke-width="' + (w || 1.5) + '" stroke-linejoin="round"/>';
  const rect = (x, y, w, h, fill, stroke) => '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + Math.max(0, w).toFixed(1) + '" height="' + Math.max(0, h).toFixed(1) + '" fill="' + fill + '" stroke="' + (stroke || 'rgba(255,255,255,.7)') + '" stroke-width="1.5"/>';
  const add = (s) => LAB.sims.push(s);
  /* перетаскивание точки: возвращает координаты курсора в системе svg */
  function dragger(svgEl, onMove) {
    let on = false;
    const pos = (e) => { const p = svgEl.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(svgEl.getScreenCTM().inverse()); };
    svgEl.addEventListener('pointerdown', (e) => { on = true; svgEl.setPointerCapture(e.pointerId); const p = pos(e); onMove(p.x, p.y); });
    svgEl.addEventListener('pointermove', (e) => { if (!on) return; const p = pos(e); onMove(p.x, p.y); });
    svgEl.addEventListener('pointerup', () => { on = false; });
    svgEl.addEventListener('pointercancel', () => { on = false; });
  }
  /* координатная сетка: x0..x1, y0..y1, шаг по x и y, отображение P */
  function grid(P, x0, x1, y0, y1, sx, sy) {
    let g = '';
    for (let x = Math.ceil(x0 / sx) * sx; x <= x1 + 1e-9; x += sx) g += L(P.X(x), P.Y(y0), P.X(x), P.Y(y1), 'rgba(255,255,255,' + (Math.abs(x) < 1e-9 ? '.7' : '.12') + ')', Math.abs(x) < 1e-9 ? 2 : 1);
    for (let y = Math.ceil(y0 / sy) * sy; y <= y1 + 1e-9; y += sy) g += L(P.X(x0), P.Y(y), P.X(x1), P.Y(y), 'rgba(255,255,255,' + (Math.abs(y) < 1e-9 ? '.7' : '.12') + ')', Math.abs(y) < 1e-9 ? 2 : 1);
    return g;
  }

  /* ============ 1. Сумма углов треугольника ============ */
  add({
    id: 'tri-angles', icon: '🔺', name: 'Сумма углов треугольника', fid: 'tri-sum', f: 'α + β + γ = 180',
    tip: 'Потяни любую вершину. Углы меняются, а их сумма всегда 180°: справа три цветных сектора всегда складываются в ровную половину круга.',
    mount(c) {
      const W = 640, H = 340, P = [[90, 280], [400, 280], [220, 80]], COLS = [SIN, COS, TAN];
      c.stage.innerHTML = svg(W, H, DEFS + '<polygon id="tri" fill="rgba(125,184,255,.18)" stroke="#fff" stroke-width="3" stroke-linejoin="round"/><g id="vx"></g><g id="half"></g>');
      const q = (s) => c.stage.querySelector(s), svgEl = c.stage.querySelector('svg');
      const ang = (i) => { const A = P[i], B = P[(i + 1) % 3], C = P[(i + 2) % 3], v1 = [B[0] - A[0], B[1] - A[1]], v2 = [C[0] - A[0], C[1] - A[1]]; return deg(Math.acos(clamp((v1[0] * v2[0] + v1[1] * v2[1]) / (Math.hypot(v1[0], v1[1]) * Math.hypot(v2[0], v2[1]) || 1), -1, 1))); };
      const sector = (cx, cy, r, a0, a1, col) => { const x0 = cx + r * Math.cos(rad(a0)), y0 = cy - r * Math.sin(rad(a0)), x1 = cx + r * Math.cos(rad(a1)), y1 = cy - r * Math.sin(rad(a1)); return '<path d="M' + cx + ',' + cy + ' L' + x0.toFixed(1) + ',' + y0.toFixed(1) + ' A' + r + ',' + r + ' 0 0 0 ' + x1.toFixed(1) + ',' + y1.toFixed(1) + ' Z" fill="' + col + '" opacity=".85" stroke="#fff" stroke-width="1.5"/>'; };
      const draw = () => {
        set(q('#tri'), { points: pts(P) });
        const A = [0, 1, 2].map(ang), r0 = Math.round(A[0]), r1 = Math.round(A[1]), r2 = 180 - r0 - r1, Rd = [r0, r1, r2];
        q('#vx').innerHTML = P.map((p, i) => '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="11" fill="' + COLS[i] + '" stroke="#fff" stroke-width="2"/>' + T(p[0] + (i === 1 ? 16 : -16), p[1] + (i === 2 ? -18 : 28), ['α', 'β', 'γ'][i] + ' = ' + Rd[i] + '°', COLS[i], 16, i === 1 ? 'start' : 'end')).join('');
        let a0 = 0, h = ''; [0, 1, 2].forEach((i) => { h += sector(540, 210, 80, a0, a0 + A[i], COLS[i]); a0 += A[i]; });
        q('#half').innerHTML = h + L(450, 210, 630, 210, '#fff', 2) + T(540, 240, 'вместе — прямая линия', WHITE, 13, 'middle');
        c.out.innerHTML = U().math('α + β + γ = ' + r0 + ' + ' + r1 + ' + ' + r2 + ' = 180') + ' <span class="u">°</span>';
      };
      dragger(svgEl, (x, y) => {
        x = clamp(x, 20, 430); y = clamp(y, 20, 320);
        let k = 0, best = 1e9; P.forEach((p, i) => { const d = Math.hypot(p[0] - x, p[1] - y); if (d < best) { best = d; k = i; } });
        P[k] = [x, y]; draw();
      });
      draw();
    }
  });

  /* ============ 2. Теорема Пифагора ============ */
  add({
    id: 'pythag', icon: '📐', name: 'Пифагоровы квадраты', fid: 'pythag', f: 'c^2 = a^2 + b^2',
    tip: 'Меняй катеты. Площадь большого квадрата на гипотенузе всегда равна сумме площадей двух квадратов на катетах. Попробуй 3 и 4 — гипотенуза ровно 5.',
    mount(c) {
      const W = 640, H = 420, CX = 210, CY = 280;
      c.stage.innerHTML = svg(W, H, DEFS + '<g id="g"></g>');
      c.ctl.innerHTML = slider('a', 'Катет a', 1, 8, 1, 3, '') + slider('b', 'Катет b', 1, 8, 1, 4, '');
      const g = c.stage.querySelector('#g');
      const draw = (v) => {
        const a = v.a, b = v.b, S = Math.min(32, 128 / Math.max(a, b)), A = [CX + a * S, CY], B = [CX, CY - b * S], C = [CX, CY], d = [B[0] - A[0], B[1] - A[1]];
        let n = [d[1], -d[0]];
        if (n[0] * ((A[0] + B[0]) / 2 - C[0]) + n[1] * ((A[1] + B[1]) / 2 - C[1]) < 0) n = [-n[0], -n[1]];
        const sqA = [C, A, [A[0], A[1] + a * S], [C[0], C[1] + a * S]], sqB = [C, B, [B[0] - b * S, B[1]], [C[0] - b * S, C[1]]], sqC = [A, B, [B[0] + n[0], B[1] + n[1]], [A[0] + n[0], A[1] + n[1]]];
        const cen = (q) => [(q[0][0] + q[2][0]) / 2, (q[0][1] + q[2][1]) / 2], cc = Math.hypot(a, b);
        g.innerHTML = poly(sqA, 'rgba(125,184,255,.35)', COS, 2) + poly(sqB, 'rgba(255,154,213,.35)', SIN, 2) + poly(sqC, 'rgba(110,231,165,.3)', OK, 2) + poly([C, A, B], 'rgba(255,255,255,.18)', '#fff', 3) +
          T(cen(sqA)[0], cen(sqA)[1] + 5, 'a² = ' + a * a, COS, 15, 'middle') + T(cen(sqB)[0], cen(sqB)[1] + 5, 'b² = ' + b * b, SIN, 15, 'middle') + T(cen(sqC)[0], cen(sqC)[1] + 5, 'c² = ' + num(cc * cc, 2), OK, 16, 'middle') +
          '<rect x="' + CX + '" y="' + (CY - 12) + '" width="12" height="12" fill="none" stroke="#fff"/>';
        c.out.innerHTML = U().math('c^2 = a^2 + b^2 = ' + a * a + ' + ' + b * b + ' = ' + (a * a + b * b)) + '<div class="mini">c = √' + (a * a + b * b) + ' ≈ ' + num(cc, 2) + (Number.isInteger(cc) ? ' — целое! Это пифагорова тройка.' : '') + '</div>';
      };
      const get = bind(c.ctl, ['a', 'b'], draw);
      draw(get());
    }
  });

  /* ============ 3. Площадь круга: разрезаем пиццу ============ */
  add({
    id: 'pizza', icon: '🍕', name: 'Площадь круга из «пиццы»', fid: 'circ-area', f: 'S = π·R^2',
    tip: 'Разрежь круг на куски и сложи их «ёлочкой». Чем больше кусков, тем точнее получается прямоугольник: длина — половина окружности πR, высота — R. Значит, S = πR · R.',
    mount(c) {
      const W = 640, H = 320, CX = 140, CY = 150, X0 = 270, YB = 270;
      c.stage.innerHTML = svg(W, H, DEFS + '<g id="g"></g>');
      c.ctl.innerHTML = slider('R', 'Радиус R', 1, 5, 0.5, 4, '') + slider('n', 'Число кусков', 6, 30, 2, 12, '');
      const g = c.stage.querySelector('#g');
      const draw = (v) => {
        const r = v.R * 20, n = v.n, w = (2 * Math.PI * r) / n, yt = YB - r;
        let s = '';
        for (let i = 0; i < n; i++) {
          const a0 = (2 * Math.PI * i) / n, a1 = (2 * Math.PI * (i + 1)) / n, col = i % 2 ? 'rgba(255,209,102,.85)' : 'rgba(255,154,213,.85)';
          s += '<path d="M' + CX + ',' + CY + ' L' + (CX + r * Math.cos(a0)).toFixed(1) + ',' + (CY - r * Math.sin(a0)).toFixed(1) + ' A' + r + ',' + r + ' 0 0 0 ' + (CX + r * Math.cos(a1)).toFixed(1) + ',' + (CY - r * Math.sin(a1)).toFixed(1) + ' Z" fill="' + col + '" stroke="#fff" stroke-width="1"/>';
          const o = X0 + (i * w) / 2;
          s += i % 2 === 0 ? poly([[o, YB], [o + w, YB], [o + w / 2, yt]], col, '#fff', 1) : poly([[o, yt], [o + w, yt], [o + w / 2, YB]], col, '#fff', 1);
        }
        const wEnd = X0 + ((n + 1) * w) / 2;
        s += L(X0, YB + 14, X0 + Math.PI * r, YB + 14, '#fff', 2, 'marker-start="url(#ah)" marker-end="url(#ah)"') + T(X0 + (Math.PI * r) / 2, YB + 34, 'πR ≈ ' + num(Math.PI * v.R, 2), WHITE, 14, 'middle') +
          L(wEnd + 10, YB, wEnd + 10, yt, '#fff', 2, 'marker-start="url(#ah)" marker-end="url(#ah)"') + T(wEnd + 16, (YB + yt) / 2, 'R', WHITE, 15);
        g.innerHTML = s;
        c.out.innerHTML = U().math('S = π·R^2 = π·' + num(v.R, 1) + '^2 ≈ ' + num(Math.PI * v.R * v.R, 2)) + '<div class="mini">Длина окружности C = 2πR ≈ ' + num(2 * Math.PI * v.R, 2) + ' — половина её, πR, стала длиной «прямоугольника».</div>';
      };
      const get = bind(c.ctl, ['R', 'n'], draw);
      draw(get());
    }
  });

  /* ============ 4. Подобие: длины k, площади k² ============ */
  add({
    id: 'similar', icon: '🔍', name: 'Подобные треугольники', fid: 'sim-area', f: 'S_1 = k^2·S',
    tip: 'Увеличь треугольник в k раз. Все стороны и периметр растут в k раз, а площадь — в k² раз. При k = 2 внутрь большого треугольника помещаются ровно 4 маленьких.',
    mount(c) {
      const W = 640, H = 330, U0 = 20, base = [[0, 0], [5, 0], [1.5, 4]];
      c.stage.innerHTML = svg(W, H, DEFS + '<g id="g"></g>');
      c.ctl.innerHTML = slider('k', 'Коэффициент k', 0.5, 3, 0.1, 2, '');
      const g = c.stage.querySelector('#g'), at = (p, k, x0, y0) => [x0 + p[0] * k * U0, y0 - p[1] * k * U0];
      const draw = (v) => {
        const k = v.k, small = base.map((p) => at(p, 1, 40, 300)), big = base.map((p) => at(p, k, 250, 300));
        let s = poly(small, 'rgba(125,184,255,.4)', COS, 2) + poly(big, 'rgba(110,231,165,.25)', OK, 2.5) + T(90, 320, 'S = 10', COS, 14, 'middle') + T(250 + 2.5 * k * U0, 322, 'S₁ = ' + num(10 * k * k, 2), OK, 15, 'middle');
        if (Math.abs(k - 2) < 0.01) { const m = [[2.5, 0], [3.25, 2], [0.75, 2]].map((p) => at(p, 2, 250, 300)); s += poly(m, 'none', '#fff', 1.5); }
        g.innerHTML = s;
        c.out.innerHTML = U().math('S_1 = k^2·S = ' + num(k, 1) + '^2·10 = ' + num(10 * k * k, 2)) + '<div class="mini">стороны и периметр: ×' + num(k, 1) + '; площадь: ×' + num(k * k, 2) + '; углы не меняются</div>';
      };
      const get = bind(c.ctl, ['k'], draw);
      draw(get());
    }
  });

  /* ============ 5. Многоугольник ============ */
  add({
    id: 'polygon', icon: '🛑', name: 'Углы многоугольника', fid: 'poly-sum', f: 'σ = 180·(n − 2)',
    tip: 'Из одной вершины проведены все диагонали: многоугольник распался на (n − 2) треугольника. Каждый даёт 180° — отсюда сумма углов.',
    mount(c) {
      const W = 640, H = 340, CX = 220, CY = 175, RR = 140;
      c.stage.innerHTML = svg(W, H, DEFS + '<g id="g"></g>');
      c.ctl.innerHTML = slider('n', 'Число сторон n', 3, 12, 1, 6, '');
      const g = c.stage.querySelector('#g'), HUES = ['rgba(255,154,213,.5)', 'rgba(125,184,255,.5)', 'rgba(255,209,102,.5)', 'rgba(110,231,165,.5)'];
      const draw = (v) => {
        const n = v.n, P = Array.from({ length: n }, (_, i) => [CX + RR * Math.cos(rad(90 + (360 * i) / n)), CY - RR * Math.sin(rad(90 + (360 * i) / n))]);
        let s = '';
        for (let i = 1; i < n - 1; i++) s += poly([P[0], P[i], P[i + 1]], HUES[i % 4], '#fff', 1.5);
        s += poly(P, 'none', '#fff', 3) + '<circle cx="' + P[0][0].toFixed(1) + '" cy="' + P[0][1].toFixed(1) + '" r="7" fill="#fff"/>';
        s += T(430, 90, 'n = ' + n, WHITE, 20) + T(430, 130, 'треугольников: ' + (n - 2), WHITE, 17) + T(430, 170, 'сумма: ' + 180 * (n - 2) + '°', TAN, 17) + T(430, 210, 'каждый угол: ' + num((180 * (n - 2)) / n, 1) + '°', OK, 17);
        g.innerHTML = s;
        c.out.innerHTML = U().math('σ = 180·(n − 2) = 180·' + (n - 2) + ' = ' + 180 * (n - 2)) + ' <span class="u">°</span><div class="mini">у правильного многоугольника каждый угол = ' + num((180 * (n - 2)) / n, 1) + '°, внешний = ' + num(360 / n, 1) + '°</div>';
      };
      const get = bind(c.ctl, ['n'], draw);
      draw(get());
    }
  });

  /* ============ 6. Вписанный угол ============ */
  add({
    id: 'inscribed', icon: '⭕', name: 'Вписанный и центральный угол', fid: 'inscribed', f: 'α = {β|2}',
    tip: 'Потяни точку C по окружности. Пока она на большой дуге, угол ACB не меняется и равен половине центрального угла AOB. Перейди на малую дугу — получится 180° − β/2.',
    mount(c) {
      const W = 640, H = 340, CX = 230, CY = 170, RR = 140;
      c.stage.innerHTML = svg(W, H, DEFS + '<circle cx="' + CX + '" cy="' + CY + '" r="' + RR + '" fill="none" stroke="rgba(255,255,255,.7)" stroke-width="2"/><g id="g"></g>');
      c.ctl.innerHTML = slider('b', 'Центральный угол β', 20, 300, 5, 100, '°');
      const g = c.stage.querySelector('#g'), svgEl = c.stage.querySelector('svg');
      let th = rad(90), beta = 100;
      const pt = (t) => [CX + RR * Math.cos(t), CY - RR * Math.sin(t)];
      const draw = () => {
        const tA = rad(270 - beta / 2), tB = rad(270 + beta / 2), A = pt(tA), B = pt(tB), C = pt(th), O = [CX, CY];
        const v1 = [A[0] - C[0], A[1] - C[1]], v2 = [B[0] - C[0], B[1] - C[1]];
        const ang = deg(Math.acos(clamp((v1[0] * v2[0] + v1[1] * v2[1]) / (Math.hypot(v1[0], v1[1]) * Math.hypot(v2[0], v2[1]) || 1), -1, 1)));
        const big = beta > 180 ? 1 : 0;
        g.innerHTML = '<path d="M' + A[0].toFixed(1) + ',' + A[1].toFixed(1) + ' A' + RR + ',' + RR + ' 0 ' + big + ' 0 ' + B[0].toFixed(1) + ',' + B[1].toFixed(1) + '" fill="none" stroke="' + TAN + '" stroke-width="6"/>' +
          L(O[0], O[1], A[0], A[1], COS, 2.5) + L(O[0], O[1], B[0], B[1], COS, 2.5) + L(C[0], C[1], A[0], A[1], SIN, 3) + L(C[0], C[1], B[0], B[1], SIN, 3) +
          '<circle cx="' + O[0] + '" cy="' + O[1] + '" r="5" fill="' + COS + '"/>' + [[A, 'A'], [B, 'B']].map((p) => '<circle cx="' + p[0][0].toFixed(1) + '" cy="' + p[0][1].toFixed(1) + '" r="6" fill="#fff"/>' + T(p[0][0] + (p[0][0] < CX ? -12 : 12), p[0][1] + 18, p[1], WHITE, 15, 'middle')).join('') +
          '<circle cx="' + C[0].toFixed(1) + '" cy="' + C[1].toFixed(1) + '" r="11" fill="' + SIN + '" stroke="#fff" stroke-width="2"/>' + T(C[0], C[1] - 16, 'C', SIN, 16, 'middle') + T(O[0] + 8, O[1] - 8, 'O', COS, 14) +
          T(420, 110, '∠AOB = ' + beta + '°', COS, 18) + T(420, 150, '∠ACB = ' + num(ang, 1) + '°', SIN, 18) + T(420, 190, 'β / 2 = ' + num(beta / 2, 1) + '°', TAN, 16);
        const onArc = Math.abs(ang - beta / 2) > 1;
        c.out.innerHTML = U().math('α = {β|2} = {' + beta + '|2} = ' + num(beta / 2, 1)) + ' <span class="u">°</span><div class="mini">' + (onArc ? 'Точка C на той же дуге AB: вписанный угол = 180° − β/2 = ' + num(180 - beta / 2, 1) + '°.' : 'Точка C на другой дуге: вписанный угол равен половине центрального.') + '</div>';
      };
      dragger(svgEl, (x, y) => { th = Math.atan2(CY - y, x - CX); draw(); });
      bind(c.ctl, ['b'], (v) => { beta = v.b; draw(); });
      draw();
    }
  });

  /* ============ 7. Цилиндр, конус и шар ============ */
  add({
    id: 'solids', icon: '🥫', name: 'Цилиндр, конус и шар', fid: 'cone-V', f: 'V = {π·R^2·h|3}',
    tip: 'Конус с тем же основанием и высотой, что у цилиндра, вмещает ровно треть. Поставь высоту h = 2R: тогда конус : шар : цилиндр = 1 : 2 : 3 (открытие Архимеда).',
    mount(c) {
      const W = 640, H = 330, YB = 290, S = 18;
      c.stage.innerHTML = svg(W, H, DEFS + '<g id="g"></g>');
      c.ctl.innerHTML = slider('R', 'Радиус R', 1, 5, 0.5, 3, '') + slider('h', 'Высота h', 1, 10, 0.5, 6, '');
      const g = c.stage.querySelector('#g');
      const ell = (cx, cy, rx, ry, fill, stroke, dash) => '<ellipse cx="' + cx + '" cy="' + cy.toFixed(1) + '" rx="' + rx.toFixed(1) + '" ry="' + ry.toFixed(1) + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="2"' + (dash ? ' stroke-dasharray="5 5"' : '') + '/>';
      const draw = (v) => {
        const r = v.R * S, hh = v.h * S, ry = r * 0.28, Vc = Math.PI * v.R * v.R * v.h, Vk = Vc / 3, Vs = (4 / 3) * Math.PI * v.R ** 3;
        let s = '';
        s += rect(140 - r, YB - hh, 2 * r, hh, 'rgba(125,184,255,.3)', COS) + ell(140, YB, r, ry, 'rgba(125,184,255,.3)', COS) + ell(140, YB - hh, r, ry, 'rgba(125,184,255,.5)', COS) + T(140, 24, 'цилиндр', COS, 15, 'middle');
        s += poly([[340 - r, YB], [340 + r, YB], [340, YB - hh]], 'rgba(255,209,102,.35)', TAN, 2) + ell(340, YB, r, ry, 'rgba(255,209,102,.3)', TAN) + T(340, 24, 'конус', TAN, 15, 'middle');
        s += '<circle cx="530" cy="' + (YB - r).toFixed(1) + '" r="' + r.toFixed(1) + '" fill="rgba(110,231,165,.3)" stroke="' + OK + '" stroke-width="2"/>' + ell(530, YB - r, r, ry, 'none', OK, 1) + T(530, 24, 'шар', OK, 15, 'middle');
        const mx = Math.max(Vc, Vs), bw = (val) => (val / mx) * 150;
        s += rect(60, 40, bw(Vc), 12, COS, 'none') + rect(260, 40, bw(Vk), 12, TAN, 'none') + rect(450, 40, bw(Vs), 12, OK, 'none');
        g.innerHTML = s;
        c.out.innerHTML = '<div>' + U().math('V_(цил) = π·R^2·h ≈ ' + num(Vc, 1)) + '</div><div>' + U().math('V_(кон) = {π·R^2·h|3} ≈ ' + num(Vk, 1)) + '</div><div>' + U().math('V_(шар) = {4·π·R^3|3} ≈ ' + num(Vs, 1)) + '</div><div class="mini">' + (Math.abs(v.h - 2 * v.R) < 1e-9 ? 'h = 2R: конус : шар : цилиндр = 1 : 2 : 3 ✓' : 'конус — ровно треть цилиндра; поставь h = 2R, чтобы сравнить с шаром') + '</div>';
      };
      const get = bind(c.ctl, ['R', 'h'], draw);
      draw(get());
    }
  });
})();
