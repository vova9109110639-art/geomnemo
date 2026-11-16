/* МнемоГеометрия — раздел «Фигуры»: каталог фигур с чертежами и свойствами + интерактивные задания на построение на клетчатой сетке. */
(function () {
  'use strict';
  const D = window.FM;
  const FIG = (window.FIG = {});
  let A, U, app;
  const esc = (s) => U.esc(s), math = (s, c) => U.math(s, c), txt = (s) => U.txt(s);

  /* ---------- чертёжные помощники ---------- */
  const W = '#fff', DIM = 'rgba(255,255,255,.55)', AC = '#7db8ff', AC2 = '#ff9ad5', AC3 = '#ffd166', OKC = '#6ee7a5';
  const P = (pts) => pts.map((p) => p[0] + ',' + p[1]).join(' ');
  const svgw = (inner, vb) => '<svg viewBox="' + (vb || '0 0 200 150') + '" class="figsvg" role="img">' + inner + '</svg>';
  const pg = (pts, fill, st) => '<polygon points="' + P(pts) + '" fill="' + (fill || 'rgba(125,184,255,.22)') + '" stroke="' + (st || W) + '" stroke-width="2.5" stroke-linejoin="round"/>';
  const ln = (a, b, col, dash, w) => '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '" stroke="' + (col || W) + '" stroke-width="' + (w || 2.5) + '"' + (dash ? ' stroke-dasharray="5 4"' : '') + ' stroke-linecap="round"/>';
  const tx = (x, y, s, col, size, anchor) => '<text x="' + x + '" y="' + y + '" fill="' + (col || W) + '" font-size="' + (size || 13) + '" text-anchor="' + (anchor || 'middle') + '" font-style="italic">' + s + '</text>';
  const tick = (a, b, k) => { const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), nx = -dy / L * 6, ny = dx / L * 6; let s = ''; for (let i = 0; i < (k || 1); i++) { const o = (i - ((k || 1) - 1) / 2) * 5, ox = dx / L * o, oy = dy / L * o; s += ln([mx + ox - nx, my + oy - ny], [mx + ox + nx, my + oy + ny], AC3, 0, 2); } return s; };
  const rt = (v, a, b, s) => { s = s || 10; const u1 = [(a[0] - v[0]), (a[1] - v[1])], u2 = [(b[0] - v[0]), (b[1] - v[1])], l1 = Math.hypot(u1[0], u1[1]), l2 = Math.hypot(u2[0], u2[1]); const p1 = [v[0] + u1[0] / l1 * s, v[1] + u1[1] / l1 * s], p2 = [v[0] + u2[0] / l2 * s, v[1] + u2[1] / l2 * s], p3 = [p1[0] + u2[0] / l2 * s, p1[1] + u2[1] / l2 * s]; return '<polyline points="' + P([p1, p3, p2]) + '" fill="none" stroke="' + AC3 + '" stroke-width="2"/>'; };
  const ell = (cx, cy, rx, ry, col, fill) => '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="' + (fill || 'none') + '" stroke="' + (col || W) + '" stroke-width="2.5"/>';
  const half = (cx, cy, rx, ry, front, col) => '<path d="M' + (cx - rx) + ',' + cy + ' A' + rx + ',' + ry + ' 0 0 ' + (front ? 0 : 1) + ' ' + (cx + rx) + ',' + cy + '" fill="none" stroke="' + (col || W) + '" stroke-width="2.5"' + (front ? '' : ' stroke-dasharray="5 4"') + '/>';
  const reg = (n, cx, cy, r, a0) => Array.from({ length: n }, (_, i) => [+(cx + r * Math.cos((a0 + (360 * i) / n) * Math.PI / 180)).toFixed(1), +(cy + r * Math.sin((a0 + (360 * i) / n) * Math.PI / 180)).toFixed(1)]);
  function box3d(x, y, w, h, dx, dy) {
    const F = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], B = F.map((p) => [p[0] + dx, p[1] - dy]);
    return pg(F, 'rgba(125,184,255,.2)') + '<polygon points="' + P([F[0], B[0], B[1], F[1]]) + '" fill="rgba(125,184,255,.12)" stroke="none"/><polygon points="' + P([F[1], B[1], B[2], F[2]]) + '" fill="rgba(125,184,255,.08)" stroke="none"/>' +
      ln(F[0], B[0]) + ln(F[1], B[1]) + ln(F[2], B[2]) + ln(B[0], B[1]) + ln(B[1], B[2]) + ln(B[3], B[0], W, 1) + ln(B[3], B[2], W, 1) + ln(F[3], B[3], W, 1);
  }

  /* ---------- каталог ---------- */
  const G = [['tri', '🔺 Треугольники'], ['quad', '🔲 Четырёхугольники'], ['round', '⭕ Окружность и многоугольники'], ['poly3', '🧊 Многогранники'], ['rot', '🥫 Тела вращения']];
  const FIGS = [
    { id: 'tri-any', g: 'tri', name: 'Треугольник', svg: () => pg([[20, 130], [185, 130], [70, 25]]) + tx(105, 145, 'a') + tx(140, 75, 'b') + tx(35, 75, 'c'),
      def: 'Три точки, не лежащие на одной прямой, и три отрезка, их соединяющие.',
      props: ['Сумма углов 180°.', 'Каждая сторона меньше суммы двух других.', 'Против большей стороны лежит больший угол.', 'Внешний угол равен сумме двух несмежных с ним.'],
      forms: ['α + β + γ = 180', 'S = {a·h|2}', 'S = {a·b·sin(γ)|2}'], cards: ['tri-sum', 'ext-angle', 'tri-area', 'sin-area', 'heron'], task: 'area6' },
    { id: 'tri-iso', g: 'tri', name: 'Равнобедренный треугольник', svg: () => { const a = [30, 130], b = [170, 130], c = [100, 20]; return pg([a, b, c]) + tick(a, c) + tick(b, c) + ln(c, [100, 130], AC2, 1, 2) + rt([100, 130], b, c, 8) + tx(100, 146, 'основание'); },
      def: 'Треугольник, у которого две стороны (боковые) равны.',
      props: ['Углы при основании равны.', 'Высота к основанию — одновременно медиана и биссектриса.', 'Ось симметрии — высота к основанию.'],
      forms: ['S = {a·h|2}'], cards: ['isosceles', 'tri-area'], task: 'iso64' },
    { id: 'tri-eq', g: 'tri', name: 'Равносторонний треугольник', svg: () => { const a = [30, 135], b = [170, 135], c = [100, 14]; return pg([a, b, c]) + tick(a, b) + tick(b, c) + tick(a, c) + tx(100, 100, '60°', AC3, 13); },
      def: 'Треугольник, у которого все три стороны равны.',
      props: ['Все углы по 60°.', 'Высота h = a√3/2.', 'Центры вписанной и описанной окружностей совпадают.'],
      forms: ['S = {a^2·√3|4}'], cards: ['equil-area'] },
    { id: 'tri-right', g: 'tri', name: 'Прямоугольный треугольник', svg: () => { const a = [30, 130], b = [170, 130], c = [30, 30]; return pg([a, b, c]) + rt(a, b, c) + tx(100, 146, 'катет a') + tx(18, 85, 'b', W, 13, 'end') + tx(112, 72, 'гипотенуза c'); },
      def: 'Треугольник, у которого один угол прямой (90°). Стороны у прямого угла — катеты, напротив — гипотенуза.',
      props: ['c² = a² + b² (Пифагор).', 'Катет против 30° равен половине гипотенузы.', 'Медиана к гипотенузе равна её половине.', 'Сумма острых углов 90°.'],
      forms: ['c^2 = a^2 + b^2', 'S = {a·b|2}', 'h = {a·b|c}'], cards: ['pythag', 'leg30', 'median-hyp', 'height-right', 'right-area', 'sct'], task: 'right34' },
    { id: 'tri-obtuse', g: 'tri', name: 'Тупоугольный треугольник', svg: () => pg([[20, 130], [110, 130], [185, 40]]) + tx(112, 120, '>90°', AC3, 12, 'start') + ln([110, 130], [185, 130], DIM, 1, 1.5),
      def: 'Треугольник с одним тупым углом (больше 90°). Два других угла острые.',
      props: ['Тупой угол может быть только один.', 'Высоты из острых углов падают на продолжения сторон.', 'c² > a² + b², где c — сторона против тупого угла.'],
      forms: ['S = {a·b·sin(γ)|2}'], cards: ['sin-area', 'tri-sum'], task: 'obtuse' },

    { id: 'square', g: 'quad', name: 'Квадрат', svg: () => { const p = [[40, 20], [150, 20], [150, 130], [40, 130]]; return pg(p) + ln(p[0], p[2], AC2, 1, 2) + rt(p[3], p[0], p[2]) + tick(p[0], p[1]) + tick(p[1], p[2]) + tick(p[2], p[3]) + tick(p[3], p[0]); },
      def: 'Прямоугольник с равными сторонами (он же ромб с прямыми углами).',
      props: ['Все стороны равны, все углы 90°.', 'Диагонали равны, перпендикулярны и делятся пополам.', 'Диагональ d = a√2.'],
      forms: ['S = a^2', 'd = a·√2'], cards: ['square-d', 'rect'], task: 'sq9' },
    { id: 'rect', g: 'quad', name: 'Прямоугольник', svg: () => { const p = [[20, 35], [180, 35], [180, 115], [20, 115]]; return pg(p) + ln(p[0], p[2], AC2, 1, 2) + ln(p[1], p[3], AC2, 1, 2) + rt(p[3], p[0], p[2]) + tx(100, 130, 'a') + tx(190, 80, 'b', W, 13, 'start'); },
      def: 'Четырёхугольник, у которого все углы прямые.',
      props: ['Противоположные стороны равны и параллельны.', 'Диагонали равны и делятся пополам.', 'P = 2(a + b).'],
      forms: ['S = a·b'], cards: ['rect', 'par-props'], task: 'rect' },
    { id: 'par', g: 'quad', name: 'Параллелограмм', svg: () => { const p = [[20, 120], [140, 120], [180, 30], [60, 30]]; return pg(p) + ln([60, 30], [60, 120], AC2, 1, 2) + rt([60, 120], [140, 120], [60, 30], 8) + tx(68, 82, 'h', AC2, 13, 'start') + tx(80, 136, 'a'); },
      def: 'Четырёхугольник, у которого противоположные стороны попарно параллельны.',
      props: ['Противоположные стороны и углы равны.', 'Соседние углы в сумме 180°.', 'Диагонали делятся точкой пересечения пополам.'],
      forms: ['S = a·h'], cards: ['par-area', 'par-props'], task: 'par' },
    { id: 'rhomb', g: 'quad', name: 'Ромб', svg: () => { const p = [[100, 10], [170, 75], [100, 140], [30, 75]]; return pg(p) + ln(p[0], p[2], AC2, 1, 2) + ln(p[1], p[3], AC2, 1, 2) + rt([100, 75], p[1], p[0], 8) + tick(p[0], p[1]) + tick(p[1], p[2]) + tick(p[2], p[3]) + tick(p[3], p[0]); },
      def: 'Параллелограмм, у которого все стороны равны.',
      props: ['Диагонали перпендикулярны.', 'Диагонали делят углы пополам.', 'Все свойства параллелограмма.'],
      forms: ['S = {d_1·d_2|2}'], cards: ['rhomb', 'par-props'], task: 'rhomb' },
    { id: 'trap', g: 'quad', name: 'Трапеция', svg: () => { const p = [[20, 125], [180, 125], [130, 30], [60, 30]]; return pg(p) + ln([40, 77], [155, 77], AC3, 1, 2) + ln([90, 30], [90, 125], AC2, 1, 2) + tx(100, 141, 'a') + tx(95, 24, 'b') + tx(170, 74, 'ср. линия', AC3, 11, 'start'); },
      def: 'Четырёхугольник, у которого ровно одна пара сторон параллельна (основания).',
      props: ['Средняя линия параллельна основаниям и равна (a + b)/2.', 'Углы при боковой стороне в сумме 180°.', 'В равнобедренной трапеции диагонали равны.'],
      forms: ['S = {a + b|2}·h'], cards: ['trap'], task: 'trap' },
    { id: 'kite', g: 'quad', name: 'Дельтоид', svg: () => { const p = [[100, 10], [150, 60], [100, 140], [50, 60]]; return pg(p) + ln(p[0], p[2], AC2, 1, 2) + ln(p[1], p[3], AC2, 1, 2) + tick(p[0], p[1]) + tick(p[3], p[0]) + tick(p[1], p[2], 2) + tick(p[2], p[3], 2); },
      def: 'Четырёхугольник с двумя парами равных соседних сторон — «воздушный змей».',
      props: ['Диагонали перпендикулярны.', 'Одна диагональ — ось симметрии.', 'Ромб — частный случай дельтоида.'],
      forms: ['S = {d_1·d_2|2}'], cards: ['rhomb'] },

    { id: 'circle', g: 'round', name: 'Окружность и круг', svg: () => '<circle cx="100" cy="72" r="58" fill="rgba(125,184,255,.15)" stroke="#fff" stroke-width="2.5"/>' + ln([100, 72], [158, 72], AC3) + tx(130, 66, 'R', AC3) + ln([52, 105], [148, 105], AC2, 0, 2) + tx(100, 120, 'хорда', AC2, 11) + ln([30, 14], [170, 14], OKC, 0, 2) + tx(100, 10, 'касательная', OKC, 11) + '<circle cx="100" cy="72" r="3" fill="#fff"/>',
      def: 'Окружность — все точки, удалённые от центра на расстояние R. Круг — часть плоскости внутри окружности.',
      props: ['Диаметр D = 2R — самая длинная хорда.', 'Касательная перпендикулярна радиусу в точке касания.', 'Вписанный угол равен половине центрального.'],
      forms: ['C = 2·π·R', 'S = π·R^2', 'l = {π·R·α|180}'], cards: ['circ-len', 'circ-area', 'arc', 'sector', 'inscribed', 'tangent', 'chords'] },
    { id: 'pent', g: 'round', name: 'Правильный пятиугольник', svg: () => pg(reg(5, 100, 80, 65, -90)) + tx(100, 84, '108°', AC3, 13),
      def: 'Пятиугольник с равными сторонами и равными углами.',
      props: ['Каждый угол 108°, сумма углов 540°.', 'Диагонали образуют звезду-пентаграмму.', 'Внешний угол 72°.'],
      forms: ['α = {180·(n − 2)|n}'], cards: ['poly-sum', 'reg-angle', 'ext-sum'], task: 'pent' },
    { id: 'hex', g: 'round', name: 'Правильный шестиугольник', svg: () => { const v = reg(6, 100, 75, 64, 0); return pg(v) + v.map((p) => ln([100, 75], p, DIM, 1, 1.5)).join('') + tx(100, 79, 'a', AC3); },
      def: 'Шестиугольник с равными сторонами и углами — пчелиные соты.',
      props: ['Каждый угол 120°.', 'Делится на 6 равносторонних треугольников.', 'Сторона равна радиусу описанной окружности.'],
      forms: ['S = {3·√3·a^2|2}'], cards: ['hex-area', 'reg-angle'] },

    { id: 'cube', g: 'poly3', name: 'Куб', svg: () => box3d(35, 50, 85, 85, 40, 35) + tx(78, 148, 'a'),
      def: 'Многогранник из 6 равных квадратов. 8 вершин, 12 рёбер.',
      props: ['Все рёбра равны.', 'Диагональ d = a√3.', 'Эйлер: 8 − 12 + 6 = 2.'],
      forms: ['V = a^3', 'S = 6·a^2', 'd = a·√3'], cards: ['cube-V', 'cube-S', 'cube-d', 'euler'] },
    { id: 'box', g: 'poly3', name: 'Прямоугольный параллелепипед', svg: () => box3d(20, 60, 120, 70, 45, 35) + tx(80, 145, 'a') + tx(30, 98, 'c', W, 13, 'end') + tx(168, 58, 'b', W, 13, 'start'),
      def: 'Многогранник, у которого все 6 граней — прямоугольники. Коробка.',
      props: ['Противоположные грани равны.', 'd² = a² + b² + c².', 'Все углы между гранями прямые.'],
      forms: ['V = a·b·c', 'S = 2·(a·b + b·c + a·c)'], cards: ['box-V', 'box-d', 'box-S'] },
    { id: 'prism', g: 'poly3', name: 'Треугольная призма', svg: () => { const A = [30, 135], B = [140, 135], C = [95, 108], A1 = [30, 45], B1 = [140, 45], C1 = [95, 18]; return pg([A1, B1, C1], 'rgba(125,184,255,.2)') + pg([A, B, B1, A1], 'rgba(125,184,255,.15)') + ln(B, C, W, 1) + ln(A, C, W, 1) + ln(C, C1, W, 1) + ln(B1, C1) + ln(A1, C1); },
      def: 'Многогранник: два равных параллельных основания-многоугольника и боковые грани-параллелограммы.',
      props: ['Объём = площадь основания × высота.', 'У прямой призмы боковые рёбра перпендикулярны основаниям.'],
      forms: ['V = S·h', 'S_(бок) = P·h'], cards: ['prism-V', 'prism-side'] },
    { id: 'pyramid', g: 'poly3', name: 'Пирамида', svg: () => { const A = [30, 130], B = [140, 130], C = [175, 100], Dd = [65, 100], S = [100, 15]; return pg([A, B, S], 'rgba(125,184,255,.2)') + pg([B, C, S], 'rgba(125,184,255,.12)') + ln(C, Dd, W, 1) + ln(Dd, A, W, 1) + ln(S, Dd, W, 1) + ln(S, [102, 115], AC2, 1, 2) + tx(108, 80, 'h', AC2, 13, 'start'); },
      def: 'Многогранник: основание-многоугольник и боковые грани-треугольники с общей вершиной.',
      props: ['Объём — треть призмы с тем же основанием и высотой.', 'У правильной пирамиды боковые грани — равные равнобедренные треугольники.'],
      forms: ['V = {S·h|3}', 'S_(бок) = {P·l|2}'], cards: ['pyr-V', 'pyr-side'] },

    { id: 'cyl', g: 'rot', name: 'Цилиндр', svg: () => ell(100, 30, 55, 14, W, 'rgba(125,184,255,.2)') + ln([45, 30], [45, 125]) + ln([155, 30], [155, 125]) + half(100, 125, 55, 14, true) + half(100, 125, 55, 14, false) + ln([100, 125], [155, 125], AC3, 1, 2) + tx(127, 120, 'R', AC3) + tx(165, 80, 'h', W, 13, 'start'),
      def: 'Тело, полученное вращением прямоугольника вокруг его стороны. Банка.',
      props: ['Основания — равные круги.', 'Развёртка боковой поверхности — прямоугольник 2πR × h.'],
      forms: ['V = π·R^2·h', 'S_(бок) = 2·π·R·h', 'S = 2·π·R·(R + h)'], cards: ['cyl-V', 'cyl-side', 'cyl-full'] },
    { id: 'cone', g: 'rot', name: 'Конус', svg: () => ln([100, 15], [40, 125]) + ln([100, 15], [160, 125]) + half(100, 125, 60, 15, true) + half(100, 125, 60, 15, false) + ln([100, 15], [100, 125], AC2, 1, 2) + ln([100, 125], [160, 125], AC3, 1, 2) + tx(130, 120, 'R', AC3) + tx(104, 80, 'h', AC2, 13, 'start') + tx(140, 65, 'l', W, 13, 'start'),
      def: 'Тело, полученное вращением прямоугольного треугольника вокруг катета. Рожок.',
      props: ['Образующая l = √(R² + h²).', 'Объём — треть цилиндра с тем же основанием и высотой.', 'Развёртка боковой поверхности — круговой сектор.'],
      forms: ['V = {π·R^2·h|3}', 'S_(бок) = π·R·l'], cards: ['cone-V', 'cone-side', 'cone-l'] },
    { id: 'sphere', g: 'rot', name: 'Шар и сфера', svg: () => '<circle cx="100" cy="75" r="60" fill="rgba(125,184,255,.18)" stroke="#fff" stroke-width="2.5"/>' + half(100, 75, 60, 15, true) + half(100, 75, 60, 15, false) + ln([100, 75], [160, 75], AC3, 1, 2) + tx(130, 70, 'R', AC3) + '<circle cx="100" cy="75" r="3" fill="#fff"/>',
      def: 'Сфера — все точки пространства на расстоянии R от центра; шар — тело внутри сферы.',
      props: ['Любое сечение шара плоскостью — круг.', 'Шар занимает 2/3 описанного цилиндра.'],
      forms: ['V = {4·π·R^3|3}', 'S = 4·π·R^2'], cards: ['sph-V', 'sph-S', 'sph-cyl'] }
  ];

  /* ---------- задания на построение (клетчатая сетка 10 × 10) ---------- */
  const v = (a, b) => [b[0] - a[0], b[1] - a[1]], d2 = (a, b) => (b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2;
  const dot = (u, w) => u[0] * w[0] + u[1] * w[1], cr = (u, w) => u[0] * w[1] - u[1] * w[0];
  const n_ = (p) => p.length, at = (p, i) => p[(i + n_(p)) % n_(p)];
  const sides = (p) => p.map((q, i) => d2(q, at(p, i + 1)));
  const area2 = (p) => Math.abs(p.reduce((s, q, i) => s + cr(q, at(p, i + 1)), 0));
  const angDot = (p, i) => dot(v(p[i], at(p, i - 1)), v(p[i], at(p, i + 1)));
  const angDeg = (p, i) => { const a = v(p[i], at(p, i - 1)), b = v(p[i], at(p, i + 1)); return (Math.acos(Math.max(-1, Math.min(1, dot(a, b) / Math.sqrt(dot(a, a) * dot(b, b))))) * 180) / Math.PI; };
  const rightAt = (p, i) => angDot(p, i) === 0;
  const allRight = (p) => p.every((_, i) => rightAt(p, i));
  const anyRight = (p) => p.some((_, i) => rightAt(p, i));
  const parEdges = (p, i, j) => cr(v(p[i], at(p, i + 1)), v(p[j], at(p, j + 1))) === 0;
  const allEq = (a) => a.every((x) => x === a[0]);
  function segX(a, b, c, d) { const o = (p, q, r) => Math.sign(cr(v(p, q), v(p, r))); return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0; }
  function valid(p) {
    if (area2(p) === 0) return 'Фигура «сплющилась»: все вершины на одной прямой.';
    for (let i = 0; i < p.length; i++) { if (cr(v(at(p, i - 1), p[i]), v(p[i], at(p, i + 1))) === 0) return 'Три соседние вершины лежат на одной прямой — это не настоящий угол.'; }
    for (let i = 0; i < p.length; i++) for (let j = i + 2; j < p.length; j++) { if (i === 0 && j === p.length - 1) continue; if (segX(p[i], at(p, i + 1), p[j], at(p, j + 1))) return 'Стороны пересекаются — получилась «восьмёрка». Расставь вершины по кругу.'; }
    return '';
  }
  const convex = (p) => { const s = p.map((_, i) => Math.sign(cr(v(at(p, i - 1), p[i]), v(p[i], at(p, i + 1))))); return s.every((x) => x === s[0]); };
  const isPar = (p) => parEdges(p, 0, 2) && parEdges(p, 1, 3);
  const isSquare = (p) => allEq(sides(p)) && allRight(p);
  const TASKS = [
    { id: 'right34', n: 3, fig: 'tri-right', title: 'Прямоугольный треугольник с катетами 3 и 4', hint: 'Отложи от одной точки 3 клетки вправо и 4 клетки вверх. Гипотенуза получится ровно 5.',
      check: (p) => (p.some((_, i) => rightAt(p, i) && [d2(p[i], at(p, i - 1)), d2(p[i], at(p, i + 1))].sort((a, b) => a - b).join() === '9,16') ? '' : 'Нужен прямой угол, а стороны у него — 3 и 4 клетки.') },
    { id: 'iso64', n: 3, fig: 'tri-iso', title: 'Равнобедренный треугольник с основанием 6 и высотой 4', hint: 'Основание — 6 клеток по горизонтали. Вершина — над серединой основания, на 4 клетки выше.',
      check: (p) => { const s = sides(p); for (let i = 0; i < 3; i++) if (s[i] === 36 && s[(i + 1) % 3] === s[(i + 2) % 3]) return area2(p) === 24 ? '' : 'Основание 6 и боковые равны, но высота не 4.'; return 'Нужны две равные боковые стороны и основание 6.'; } },
    { id: 'area6', n: 3, fig: 'tri-any', title: 'Любой треугольник площадью 6', hint: 'S = a·h/2. Например, основание 4 и высота 3, или основание 6 и высота 2.',
      check: (p) => (area2(p) === 12 ? '' : 'Площадь должна быть 6, а у тебя ' + area2(p) / 2 + '.') },
    { id: 'obtuse', n: 3, fig: 'tri-obtuse', title: 'Тупоугольный треугольник', hint: 'Сделай одну вершину «далеко вбок» за пределами основания: угол станет больше 90°.',
      check: (p) => (p.some((_, i) => angDot(p, i) < 0) ? '' : 'Ни один угол не больше 90°.') },
    { id: 'right-iso', n: 3, fig: 'tri-right', title: 'Равнобедренный прямоугольный треугольник', hint: 'Два катета одинаковой длины под прямым углом: например, 4 клетки вправо и 4 клетки вверх.',
      check: (p) => (p.some((_, i) => rightAt(p, i) && d2(p[i], at(p, i - 1)) === d2(p[i], at(p, i + 1))) ? '' : 'Нужен прямой угол с равными катетами.') },
    { id: 'tri558', n: 3, fig: 'tri-iso', title: 'Треугольник со сторонами 5, 5 и 8', hint: 'Основание 8, вершина над серединой. Высота по Пифагору: √(25 − 16) = 3.',
      check: (p) => (sides(p).slice().sort((a, b) => a - b).join() === '25,25,64' ? '' : 'Стороны должны быть 5, 5 и 8.') },
    { id: 'sq9', n: 4, fig: 'square', title: 'Квадрат площадью 9', hint: 'Сторона квадрата — √9 = 3 клетки.',
      check: (p) => (!isSquare(p) ? 'Это не квадрат: нужны равные стороны и прямые углы.' : area2(p) === 18 ? '' : 'Квадрат есть, но площадь ' + area2(p) / 2 + ', а нужно 9.') },
    { id: 'sq5', n: 4, fig: 'square', title: 'Квадрат площадью 5 (наклонный!)', hint: 'Сторона должна быть √5 — это гипотенуза треугольника 1 × 2. Каждая сторона: «2 клетки вбок, 1 вверх», потом поворот на 90°.',
      check: (p) => (!isSquare(p) ? 'Это не квадрат: нужны равные стороны и прямые углы.' : area2(p) === 10 ? '' : 'Квадрат есть, но площадь ' + area2(p) / 2 + ', а нужно 5.') },
    { id: 'sqd4', n: 4, fig: 'square', title: 'Квадрат с диагональю 4', hint: 'Поставь диагонали крест-накрест: каждая длиной 4, пересекаются посередине под прямым углом. Получится «ромбик» из клеток.',
      check: (p) => (!isSquare(p) ? 'Это не квадрат.' : d2(p[0], p[2]) === 16 ? '' : 'Квадрат есть, но диагональ не 4.') },
    { id: 'rect', n: 4, fig: 'rect', title: 'Прямоугольник с периметром 14 и площадью 12', hint: 'Подбери стороны: a + b = 7 и a·b = 12.',
      check: (p) => (!allRight(p) ? 'Нужны четыре прямых угла.' : sides(p).slice().sort((a, b) => a - b).join() === '9,9,16,16' ? '' : 'Прямоугольник есть, но стороны должны быть 3 и 4.') },
    { id: 'par', n: 4, fig: 'par', title: 'Параллелограмм, который не прямоугольник', hint: 'Нижняя сторона — 4 клетки вправо. Верхняя — тоже 4 вправо, но сдвинута на 2 клетки вбок.',
      check: (p) => (!isPar(p) ? 'Противоположные стороны должны быть параллельны.' : anyRight(p) ? 'Это прямоугольник — сделай углы «наклонными».' : '') },
    { id: 'par8', n: 4, fig: 'par', title: 'Наклонный параллелограмм площадью 8', hint: 'S = a·h: основание 4 и высота 2, верхнюю сторону сдвинь вбок.',
      check: (p) => (!isPar(p) ? 'Противоположные стороны должны быть параллельны.' : anyRight(p) ? 'Нужен наклонный, а не прямоугольник.' : area2(p) === 16 ? '' : 'Площадь ' + area2(p) / 2 + ', а нужно 8.') },
    { id: 'rhomb', n: 4, fig: 'rhomb', title: 'Ромб, который не квадрат', hint: 'Поставь диагонали крест-накрест разной длины, например 6 и 4, с общей серединой.',
      check: (p) => (!allEq(sides(p)) ? 'Все четыре стороны должны быть равны.' : anyRight(p) ? 'Получился квадрат — сделай диагонали разной длины.' : '') },
    { id: 'trap', n: 4, fig: 'trap', title: 'Трапеция', hint: 'Нижнее основание — 6 клеток, верхнее — 2 клетки, параллельно нижнему. Боковые стороны не параллельны.',
      check: (p) => { const a = parEdges(p, 0, 2), b = parEdges(p, 1, 3); return a !== b ? '' : a ? 'Обе пары сторон параллельны — это параллелограмм.' : 'Нет ни одной пары параллельных сторон.'; } },
    { id: 'rtrap', n: 4, fig: 'trap', title: 'Прямоугольная трапеция', hint: 'Трапеция, у которой одна боковая сторона перпендикулярна основаниям.',
      check: (p) => { const a = parEdges(p, 0, 2), b = parEdges(p, 1, 3); if (a === b) return 'Это не трапеция: нужна ровно одна пара параллельных сторон.'; return anyRight(p) ? '' : 'Нужен прямой угол у боковой стороны.'; } },
    { id: 'pent', n: 5, fig: 'pent', title: 'Выпуклый пятиугольник', hint: 'Расставь 5 точек «по кругу», чтобы все углы смотрели наружу (никаких «вмятин»).',
      check: (p) => (convex(p) ? '' : 'Есть «вмятина» — один из углов больше 180°.') }
  ];

  /* ---------- виды ---------- */
  const tabs = (cur) => '<div class="tchips figtabs"><a class="tchip' + (cur === 'cat' ? ' on' : '') + '" href="#/figures">📚 Каталог фигур</a><a class="tchip' + (cur === 'build' ? ' on' : '') + '" href="#/figures/build">✏️ Построй сам</a></div>';
  function viewCatalog() {
    app.innerHTML = '<div class="page-head"><h1>🔷 Фигуры</h1><p>Все основные фигуры и тела школьной геометрии: чертёж, определение, свойства и формулы. Нажми на фигуру, чтобы открыть подробности и связанные карточки.</p></div>' + tabs('cat') +
      G.map((g) => '<h2>' + g[1] + '</h2><div class="figgrid">' + FIGS.filter((f) => f.g === g[0]).map((f) => '<a class="figcard" href="#/figures/' + f.id + '">' + svgw(f.svg()) + '<b>' + esc(f.name) + '</b><small>' + esc(f.def.split('.')[0]) + '.</small></a>').join('') + '</div>').join('');
  }
  function viewFigure(id) {
    const f = FIGS.find((x) => x.id === id); if (!f) { location.hash = '#/figures'; return; }
    const byId = Object.fromEntries(D.formulas.map((c) => [c.id, c]));
    const cards = (f.cards || []).filter((c) => byId[c]);
    const task = f.task && TASKS.find((t) => t.id === f.task);
    app.innerHTML = '<a class="back" href="#/figures">← Все фигуры</a><section class="pcard figdetail"><div class="fd-pic">' + svgw(f.svg()) + '</div><div class="fd-body"><h1>' + esc(f.name) + '</h1><p>' + txt(f.def) + '</p>' +
      '<h3>Свойства</h3><ul>' + f.props.map((p) => '<li>' + txt(p) + '</li>').join('') + '</ul>' +
      '<h3>Формулы</h3><div class="forms">' + f.forms.map((s) => '<span class="form">' + math(s) + '</span>').join('') + '</div>' +
      (cards.length ? '<h3>Карточки</h3><div class="xtopics">' + cards.map((c) => '<a class="tchip" href="#/card/' + c + '">' + esc(byId[c].name) + '</a>').join('') + '</div>' : '') +
      '<div class="cta">' + (task ? '<a class="btn" href="#/figures/build/' + task.id + '">✏️ Построить: ' + esc(task.title) + '</a>' : '') + '<a class="btn ghost" href="#/figures/build">Все задания на построение</a></div></div></section>';
  }

  let st = null; /* {ti, pts, done} */
  const solved = () => A.store.get('build', {});
  const N = 10, SC = 40, PAD = 20;
  const X = (x) => PAD + x * SC, Y = (y) => PAD + (N - y) * SC;
  const lenStr = (q) => { const r = Math.sqrt(q); return Number.isInteger(r) ? String(r) : '√' + q + ' ≈ ' + r.toFixed(2).replace('.', ','); };
  const LET = 'ABCDEFGH';
  function boardSVG(t) {
    let g = '';
    for (let i = 0; i <= N; i++) g += '<line x1="' + X(i) + '" y1="' + Y(0) + '" x2="' + X(i) + '" y2="' + Y(N) + '" stroke="rgba(255,255,255,.14)"/><line x1="' + X(0) + '" y1="' + Y(i) + '" x2="' + X(N) + '" y2="' + Y(i) + '" stroke="rgba(255,255,255,.14)"/>';
    for (let x = 0; x <= N; x++) for (let y = 0; y <= N; y++) g += '<circle cx="' + X(x) + '" cy="' + Y(y) + '" r="2.2" fill="rgba(255,255,255,.4)"/>';
    const p = st.pts, full = p.length === t.n;
    if (p.length > 1) g += '<' + (full ? 'polygon' : 'polyline') + ' points="' + p.map((q) => X(q[0]) + ',' + Y(q[1])).join(' ') + '" fill="' + (full ? (st.ok ? 'rgba(110,231,165,.28)' : 'rgba(125,184,255,.25)') : 'none') + '" stroke="' + (st.ok ? OKC : '#fff') + '" stroke-width="3" stroke-linejoin="round"/>';
    p.forEach((q, i) => { g += '<circle cx="' + X(q[0]) + '" cy="' + Y(q[1]) + '" r="8" fill="' + AC3 + '" stroke="#fff" stroke-width="2"/><text x="' + (X(q[0]) + 10) + '" y="' + (Y(q[1]) - 10) + '" fill="' + AC3 + '" font-size="16" font-weight="700">' + LET[i] + '</text>'; });
    return '<svg viewBox="0 0 ' + (2 * PAD + N * SC) + ' ' + (2 * PAD + N * SC) + '" class="board" id="board" role="img" aria-label="клетчатое поле">' + g + '</svg>';
  }
  function measures(t) {
    const p = st.pts; if (p.length < 2) return '<p class="muted">Нажимай на узлы сетки, чтобы ставить вершины. Нужно ' + t.n + ' вершин' + (t.n === 3 ? 'ы' : '') + ' — фигура замкнётся сама.</p>';
    const full = p.length === t.n, rows = [];
    const m = full ? p.length : p.length - 1;
    for (let i = 0; i < m; i++) rows.push(LET[i] + LET[(i + 1) % p.length] + ' = ' + lenStr(d2(p[i], at(p, i + 1))));
    let html = '<div class="meas"><b>Стороны:</b> ' + rows.join(', ') + '</div>';
    if (full) html += '<div class="meas"><b>Углы:</b> ' + p.map((_, i) => '∠' + LET[i] + ' = ' + (Math.round(angDeg(p, i) * 10) / 10).toString().replace('.', ',') + '°').join(', ') + '</div><div class="meas"><b>Площадь:</b> ' + (area2(p) / 2).toString().replace('.', ',') + ' кл.</div>';
    return html;
  }
  function viewBuild(tid) {
    const ti = Math.max(0, TASKS.findIndex((t) => t.id === tid));
    if (!st || st.ti !== ti) st = { ti, pts: [], ok: false, hint: false, msg: '' };
    const t = TASKS[ti], s = solved();
    app.innerHTML = '<div class="page-head"><h1>✏️ Построй сам</h1><p>Строй фигуры на клетчатом поле: нажимай на узлы сетки. Сторона клетки = 1. Сайт сам измерит стороны, углы и площадь и скажет, что не так.</p></div>' + tabs('build') +
      '<div class="tchips btasks">' + TASKS.map((x, i) => '<a class="tchip' + (i === ti ? ' on' : '') + '" href="#/figures/build/' + x.id + '">' + (s[x.id] ? '✅ ' : '') + (i + 1) + '</a>').join('') + '</div>' +
      '<section class="pcard bwrap"><div class="bboard">' + boardSVG(t) + '</div><div class="bside"><span class="pill">Задание ' + (ti + 1) + ' из ' + TASKS.length + (s[t.id] ? ' · решено ✅' : '') + '</span><h2>' + esc(t.title) + '</h2>' +
      '<div id="bmeas">' + measures(t) + '</div><div id="bmsg">' + (st.msg ? st.msg : '') + (st.hint ? '<div class="phint"><b>Подсказка.</b> ' + esc(t.hint) + '</div>' : '') + '</div>' +
      '<div class="cta"><button class="btn" data-fa="check">✅ Проверить</button><button class="btn ghost sm" data-fa="undo">↶ Убрать точку</button><button class="btn ghost sm" data-fa="clear">🧹 Заново</button>' + (st.hint ? '' : '<button class="btn ghost sm" data-fa="hint">💡 Подсказка</button>') + '</div>' +
      '<div class="cta">' + (ti + 1 < TASKS.length ? '<a class="btn ghost sm" href="#/figures/build/' + TASKS[ti + 1].id + '">Следующее задание →</a>' : '') + '<a class="btn ghost sm" href="#/figures/' + t.fig + '">📚 Про эту фигуру</a></div></div></section>';
    const svg = app.querySelector('#board');
    svg.addEventListener('pointerdown', (e) => {
      const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const q = pt.matrixTransform(svg.getScreenCTM().inverse());
      const x = Math.round((q.x - PAD) / SC), y = Math.round(N - (q.y - PAD) / SC);
      if (x < 0 || x > N || y < 0 || y > N) return;
      if (st.pts.length >= t.n) { A.toast('Все вершины уже стоят. «Убрать точку» или «Заново».'); return; }
      if (st.pts.some((p) => p[0] === x && p[1] === y)) { A.toast('Эта точка уже занята'); return; }
      st.pts.push([x, y]); st.ok = false; st.msg = ''; if (window.FX) { try { FX.sfx('move'); } catch (er) { /* звук не обязателен */ } }
      viewBuild(t.id);
    });
  }
  function checkBuild() {
    const t = TASKS[st.ti], p = st.pts;
    let err = p.length < t.n ? 'Поставь все ' + t.n + ' вершины.' : valid(p) || t.check(p);
    st.ok = !err;
    if (st.ok) { const s = solved(); const first = !s[t.id]; s[t.id] = 1; A.store.set('build', s); if (first) A.addXp(15); if (window.FX) { try { FX.sfx('ok'); const r = app.querySelector('#board').getBoundingClientRect(); FX.burst(r.left + r.width / 2, r.top + r.height / 2, 40, { speed: 6 }); } catch (er) { /* эффекты не обязательны */ } } }
    else if (window.FX) { try { FX.sfx('bad'); } catch (er) { /* звук не обязателен */ } }
    st.msg = '<div class="pfb ' + (st.ok ? 'good' : 'badfb') + '"><b>' + (st.ok ? '✓ Верно! Фигура построена.' : '✗ Пока нет') + '</b>' + (err ? '<div class="pfb-x">' + esc(err) + '</div>' : '') + '</div>';
    viewBuild(t.id);
  }
  function onClick(e) {
    const b = e.target.closest('[data-fa]'); if (!b || !app || !app.contains(b) || !st) return;
    const a = b.dataset.fa, t = TASKS[st.ti];
    if (a === 'check') checkBuild();
    else if (a === 'undo') { st.pts.pop(); st.ok = false; st.msg = ''; viewBuild(t.id); }
    else if (a === 'clear') { st.pts = []; st.ok = false; st.msg = ''; viewBuild(t.id); }
    else if (a === 'hint') { st.hint = true; viewBuild(t.id); }
  }

  FIG.view = function (root, parts) {
    A = D.api; U = D.util; app = root;
    if (!FIG.bound) { document.addEventListener('click', onClick); FIG.bound = true; }
    if (parts[1] === 'build') { viewBuild(parts[2] || TASKS[0].id); return; }
    if (parts[1]) { viewFigure(parts[1]); return; }
    viewCatalog();
  };
  FIG._tasks = TASKS; FIG._figs = FIGS; FIG._st = () => st; FIG._valid = valid;
})();
