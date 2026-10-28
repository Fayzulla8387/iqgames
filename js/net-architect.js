/* ===== Original oʻyin 1: TARMOQ MEʼMORI =====
   Gʻoya: tugun-vazn (node-weighted) Shteyner daraxti jumboqi.
   Stansiyadan barcha uylarga eng arzon tarmoq quring; 📡 minoralar ixtiyoriy,
   lekin har biri qoʻshimcha toʻlov talab qiladi. Kompyuter har daraja uchun
   mutlaq optimal yechimni toʻliq qidiruv (minoralar toʻplamlari × Kruskal MST) bilan topadi.
   Fayl: 1) tasodifiy generator, 2) yechuvchi va baholash, 3) Canvas interfeysi. */
(function () {
  'use strict';
  const FEE = 2;                                         // minorani ishlatish narxi
  const INK = '#1b2340', TEAL = '#19c3a6';

  /* ---------- 1) GENERATOR ---------- */
  // Seed boʻyicha bir xil tasodifiy sonlar: har daraja har safar bir xil chiqadi (reyting adolatli boʻlishi uchun)
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // Union-Find: komponentlarni birlashtirish (Kruskal va ulanishlik uchun)
  function makeDSU(n) {
    const p = [...Array(n).keys()];
    const find = x => p[x] === x ? x : (p[x] = find(p[x]));
    return { find, union(a, b) { a = find(a); b = find(b); if (a === b) return false; p[a] = b; return true; } };
  }

  function buildGraph(level, seed) {
    const rnd = mulberry32(seed);
    const houses = Math.min(3 + (level / 3 | 0), 5), towers = Math.min(2 + (level / 2 | 0), 6), n = 1 + houses + towers;
    // 1. Tugunlarni tasodifiy joylashtirish (bir-biriga juda yaqin boʻlmasligi uchun rad etish usuli)
    const nodes = [];
    for (let tries = 0; nodes.length < n; tries++) {
      const p = { x: .07 + rnd() * .86, y: .1 + rnd() * .8 };
      if (tries > 3000 || nodes.every(q => Math.hypot((q.x - p.x) * 4, (q.y - p.y) * 3) > (tries > 1500 ? .6 : .9))) nodes.push(p);
    }
    nodes.forEach((p, i) => { p.type = i === 0 ? 'station' : i <= houses ? 'house' : 'tower'; });
    const dist = (a, b) => Math.hypot((nodes[a].x - nodes[b].x) * 4, (nodes[a].y - nodes[b].y) * 3);
    // 2. Qirralar: har tugun 2–3 ta eng yaqin qoʻshnisi bilan ulanadi; narx ~ masofa × tasodifiy omil
    const edges = [], has = new Set();
    const addEdge = (a, b, extra = 0) => {
      if (a > b) [a, b] = [b, a];
      if (a === b || has.has(a + '-' + b)) return;
      has.add(a + '-' + b);
      edges.push({ id: edges.length, a, b, cost: Math.max(1, Math.round(dist(a, b) * (.8 + rnd() * .8) * 2)) + extra });
    };
    nodes.forEach((_, i) => {
      nodes.map((_, j) => j).filter(j => j !== i).sort((x, y) => dist(i, x) - dist(i, y))
        .slice(0, 2 + (rnd() < .4 ? 1 : 0)).forEach(j => addEdge(i, j));
    });
    // 3. Bogʻlanishni kafolatlash: ajralgan komponentlarni eng yaqin juftlik bilan ulaymiz.
    //    Avval faqat stansiya+uylar orasida (limit = 1+houses) — shunda minorasiz yechim ham mavjud boʻladi
    //    va minora majburiy emas, balki haqiqiy tanlov (pul tejash imkoni) boʻlib qoladi.
    const link = limit => {
      const dsu = makeDSU(n);
      edges.forEach(e => { if (e.a < limit && e.b < limit) dsu.union(e.a, e.b); });
      for (;;) {
        let best = null;
        for (let i = 0; i < limit; i++) for (let j = i + 1; j < limit; j++)
          if (dsu.find(i) !== dsu.find(j) && (!best || dist(i, j) < best.d)) best = { i, j, d: dist(i, j) };
        if (!best) break;
        addEdge(best.i, best.j, limit < n ? 2 : 0); dsu.union(best.i, best.j);   // majburiy uzun ulanish qimmatroq: aylanma yoʻl (minora) jozibali boʻladi
      }
    };
    link(1 + houses);                                    // 1) terminallar oʻzaro
    link(n);                                             // 2) butun graf
    return { nodes, edges };
  }

  /* ---------- 2) YECHUVCHI VA BAHOLASH ---------- */
  // Mutlaq optimum: minoralarning har bir qism-toʻplami uchun (terminallar + tanlangan minoralar)
  // ustida Kruskal MST quramiz va minora toʻlovlarini qoʻshamiz. Eng arzoni — javob.
  function solveOptimal(g) {
    const terms = [], towers = [];
    g.nodes.forEach((nd, i) => (nd.type === 'tower' ? towers : terms).push(i));
    const sorted = [...g.edges].sort((x, y) => x.cost - y.cost);
    let best = Infinity, bestNoTower = Infinity;
    for (let mask = 0; mask < 1 << towers.length; mask++) {
      const inSet = new Set(terms);
      let cost = 0;
      towers.forEach((t, k) => { if (mask >> k & 1) { inSet.add(t); cost += FEE; } });
      const dsu = makeDSU(g.nodes.length);
      let used = 0;
      for (const e of sorted) if (inSet.has(e.a) && inSet.has(e.b) && dsu.union(e.a, e.b)) { cost += e.cost; used++; }
      if (used !== inSet.size - 1) continue;             // bu toʻplam bogʻlana olmadi
      best = Math.min(best, cost);
      if (mask === 0) bestNoTower = cost;                // minorasiz eng yaxshi yechim
    }
    return { best, bestNoTower };
  }

  // Daraja yaratish: minora haqiqatan pul tejaydigan (best < bestNoTower) jumboqni tanlaymiz
  function generateLevel(level) {
    let g;
    for (let a = 0; a < 150; a++) {
      g = buildGraph(level, level * 1009 + a);
      g.opt = solveOptimal(g);
      if (isFinite(g.opt.bestNoTower) && g.opt.best < g.opt.bestNoTower) break;   // minora ixtiyoriy VA foydali
    }
    return g;
  }

  // Oʻyinchi tanlovi: umumiy narx, stansiyadan quvvat olgan tugunlar (BFS), ulangan uylar soni
  function evaluate(g, picked) {
    const adj = g.nodes.map(() => []), touched = new Set();
    let cost = 0;
    picked.forEach(id => {
      const e = g.edges[id];
      adj[e.a].push(e.b); adj[e.b].push(e.a); touched.add(e.a); touched.add(e.b); cost += e.cost;
    });
    touched.forEach(i => { if (g.nodes[i].type === 'tower') cost += FEE; });   // ishlatilgan minora toʻlovi
    const powered = new Set([0]), stack = [0];
    while (stack.length) adj[stack.pop()].forEach(v => { if (!powered.has(v)) { powered.add(v); stack.push(v); } });
    const houses = g.nodes.map((_, i) => i).filter(i => g.nodes[i].type === 'house');
    return { cost, powered, linked: houses.filter(i => powered.has(i)).length, total: houses.length };
  }

  const rate = (cost, opt) => cost <= opt ? 3 : cost <= Math.ceil(opt * 1.25) ? 2 : 1;   // yulduzcha

  // Nuqtadan kesmagacha masofa (qirrani bosishni aniqlash uchun)
  function segDist(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  }

  /* ---------- 3) INTERFEYS ---------- */
  function mount(root, ctx) {
    root.innerHTML = `
      <div class="hud"><span>Daraja <b class="na-lvl"></b></span><span>Xarajat <b class="na-cost"></b></span>
        <span>Uylar <b class="na-link"></b></span><span>Ball <b class="na-score">0</b></span></div>
      <canvas class="na-canvas" aria-label="Tarmoq xaritasi"></canvas>
      <div class="msg na-msg"></div>
      <div class="btn-row">
        <button class="btn ghost na-reset" type="button">Tozalash</button>
        <button class="btn na-ok" type="button" disabled>Tasdiqlash</button>
        <button class="btn accent na-next" type="button" hidden>Keyingi daraja</button>
      </div>`;
    const $ = s => root.querySelector(s);
    const cv = $('.na-canvas'), c = cv.getContext('2d');
    let level = 1, total = 0, g, picked, st, done;

    function load() {
      g = generateLevel(level); picked = new Set(); done = false;
      $('.na-next').hidden = true;
      $('.na-msg').textContent = 'Kabelni bosib qoʻying yoki olib tashlang: ⚡ dan barcha 🏠 gacha tok yetkazing.';
      update();
    }

    // Har oʻzgarishdan keyin: hisoblash, HUD yangilash, qayta chizish
    function update() {
      st = evaluate(g, picked);
      $('.na-lvl').textContent = level; $('.na-cost').textContent = st.cost;
      $('.na-link').textContent = `${st.linked}/${st.total}`; $('.na-score').textContent = total;
      $('.na-ok').disabled = done || st.linked < st.total;   // hamma uy ulangandagina tasdiqlash mumkin
      draw();
    }

    function confirmPlan() {
      done = true;
      const opt = g.opt.best, stars = rate(st.cost, opt);
      total += stars * 50 + level * 10;
      $('.na-msg').textContent = `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}  Sizniki: ${st.cost}, optimal: ${opt}.`
        + (stars < 3 ? ' Minorani boshqacha ishlatib arzonroq yechim bor!' : ' Mukammal — eng arzon tarmoq!');
      $('.na-next').hidden = false;
      ctx.reportScore({ score: total, meta: { level, stars } });   // umumiy ball reytingga
      update();
    }

    // Canvasni ekranga moslash (retina uchun devicePixelRatio)
    function fit() {
      const r = cv.getBoundingClientRect(), d = window.devicePixelRatio || 1;
      cv.width = r.width * d; cv.height = r.height * d; c.setTransform(d, 0, 0, d, 0, 0);
      if (g) draw();
    }

    function draw() {
      const W = cv.clientWidth, H = cv.clientHeight, R = Math.max(16, W * .038);
      const P = n => [n.x * W, n.y * H];
      c.clearRect(0, 0, W, H);
      c.textAlign = 'center'; c.textBaseline = 'middle';
      // Qirralar (kabellar)
      g.edges.forEach(e => {
        const [ax, ay] = P(g.nodes[e.a]), [bx, by] = P(g.nodes[e.b]), on = picked.has(e.id);
        c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by);
        c.lineWidth = on ? 6 : 2; c.strokeStyle = on ? TEAL : 'rgba(27,35,64,.28)'; c.stroke();
        // Narx yorligʻi qirra oʻrtasida
        const mx = (ax + bx) / 2, my = (ay + by) / 2;
        c.beginPath(); c.arc(mx, my, 11, 0, 7); c.fillStyle = on ? TEAL : '#fff'; c.fill();
        c.lineWidth = 1.5; c.strokeStyle = INK; c.stroke();
        c.fillStyle = INK; c.font = 'bold 12px sans-serif'; c.fillText(e.cost, mx, my + 1);
      });
      // Tugunlar: quvvat olganlar yashil halo bilan yonadi
      const ICON = { station: '⚡', house: '🏠', tower: '📡' }, FILL = { station: '#ffc933', house: '#fff', tower: '#c9bfff' };
      g.nodes.forEach((n, i) => {
        const [x, y] = P(n);
        if (st.powered.has(i)) { c.beginPath(); c.arc(x, y, R + 7, 0, 7); c.fillStyle = 'rgba(25,195,166,.35)'; c.fill(); }
        c.beginPath(); c.arc(x, y, R, 0, 7); c.fillStyle = FILL[n.type]; c.fill();
        c.lineWidth = 3; c.strokeStyle = INK; c.stroke();
        c.font = `${R * 1.1}px sans-serif`; c.fillStyle = INK; c.fillText(ICON[n.type], x, y + 1);
        if (n.type === 'tower') { c.font = 'bold 12px sans-serif'; c.fillText('+' + FEE, x, y + R + 12); }
      });
    }

    // Bosish: eng yaqin qirrani (16px ichida) tanlash/bekor qilish
    cv.addEventListener('pointerdown', ev => {
      if (done) return;
      const r = cv.getBoundingClientRect(), x = ev.clientX - r.left, y = ev.clientY - r.top;
      let hit = null, hitD = 16;
      g.edges.forEach(e => {
        const A = g.nodes[e.a], B = g.nodes[e.b];
        const d = segDist(x, y, A.x * r.width, A.y * r.height, B.x * r.width, B.y * r.height);
        if (d < hitD) { hitD = d; hit = e.id; }
      });
      if (hit !== null) { picked.has(hit) ? picked.delete(hit) : picked.add(hit); update(); }
    });
    $('.na-reset').addEventListener('click', () => { if (!done) { picked.clear(); update(); } });
    $('.na-ok').addEventListener('click', confirmPlan);
    $('.na-next').addEventListener('click', () => { level++; load(); });

    const ro = new ResizeObserver(fit);
    ro.observe(cv);
    fit(); load();
    return () => ro.disconnect();
  }

  IQArena.registerGame({
    id: 'netarchitect', title: 'Tarmoq Meʼmori', icon: '⚡', color: '#ffc933', kind: 'original', ready: true,
    blurb: 'Stansiyadan barcha uylarga eng arzon elektr tarmogʻini quring. Minora foydalimi yoki zararlimi?',
    skill: 'Optimallashtirish, graf nazariyasi (minimal yoyilgan daraxt, Shteyner daraxti) va xarajat/foyda tahlili',
    rules: [
      '⚡ stansiyadan barcha 🏠 uylarga tok yetkazing: kabel (chiziq)ni bosib qoʻying yoki olib tashlang. Har kabelning narxi yorliqda yozilgan.',
      '📡 minora — ixtiyoriy tugun. Uni ishlatsangiz +2 toʻlov, lekin uzun kabellarni qisqartirib, umumiy narxni kamaytirishi mumkin.',
      'Barcha uylar ulangach «Tasdiqlash»ni bosing. Kompyuter hisoblagan eng arzon tarmoq = 3 yulduz, undan ≤25% qimmat = 2 yulduz, qolgani = 1 yulduz.',
      'Darajalar oshgani sari uylar va minoralar koʻpayadi. Yulduzlar va daraja ballga aylanadi.'
    ],
    mount
  });
})();
