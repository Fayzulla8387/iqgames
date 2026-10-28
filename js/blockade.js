/* ===== Blockade (klassik) — Quoridor uslubida =====
   7×7 taxta. Siz pastdan tepaga (🔴), AI tepadan pastga (🟡) oʻtishi kerak.
   Har navbatda: 1) bir katak yuring YOKI 2) 2 katak uzunlikdagi devor qoʻying.
   Devor raqibning yoʻlini toʻliq yopolmaydi (BFS bilan tekshiriladi).
   Fayl: 1) sof mantiq, 2) AI, 3) interfeys. */
(function () {
  'use strict';
  const N = 7, WALLS = 6, HUM = 0, AI = 1, GOAL = [0, N - 1];   // GOAL[p] = p oʻyinchining maqsad qatori
  const D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  /* ---------- 1) MANTIQ ---------- */
  const grid = () => Array.from({ length: N }, () => Array(N).fill(false));
  // hb[r][c]: (r,c) va (r+1,c) orasidagi devor; vb[r][c]: (r,c) va (r,c+1) orasida.
  // hs/vs: devor boshlangʻich nuqtasi (devorlar kesishmasligini tekshirish uchun)
  const newState = () => ({ pos: [{ r: N - 1, c: 3 }, { r: 0, c: 3 }], hb: grid(), vb: grid(), hs: grid(), vs: grid(), walls: [WALLS, WALLS] });
  const clone = s => JSON.parse(JSON.stringify(s));

  // (r,c) dan (dr,dc) tomonga yurish mumkinmi? (taxta ichida va devorsiz)
  function open(s, r, c, dr, dc) {
    const nr = r + dr, nc = c + dc;
    if (nr < 0 || nr >= N || nc < 0 || nc >= N) return false;
    if (dr === 1) return !s.hb[r][c];
    if (dr === -1) return !s.hb[nr][c];
    return dc === 1 ? !s.vb[r][c] : !s.vb[r][nc];
  }

  // BFS: p oʻyinchining maqsadgacha eng qisqa yoʻli (devorlar hisobga olinadi)
  function dist(s, p) {
    const { r, c } = s.pos[p], seen = grid(), q = [[r, c, 0]];
    seen[r][c] = true;
    for (let i = 0; i < q.length; i++) {
      const [a, b, d] = q[i];
      if (a === GOAL[p]) return d;
      for (const [dr, dc] of D4) if (open(s, a, b, dr, dc) && !seen[a + dr][b + dc]) { seen[a + dr][b + dc] = true; q.push([a + dr, b + dc, d + 1]); }
    }
    return Infinity;
  }

  // Devor qoʻyish (state ni oʻzgartiradi); t='h' gorizontal, 'v' vertikal; (r,c) — boshlangʻich nuqta
  function placeWall(s, t, r, c) {
    if (r < 0 || c < 0 || r >= N - 1 || c >= N - 1) return false;
    if (t === 'h') {
      if (s.hb[r][c] || s.hb[r][c + 1] || s.vs[r][c]) return false;      // ustma-ust yoki kesishish
      s.hb[r][c] = s.hb[r][c + 1] = s.hs[r][c] = true;
    } else {
      if (s.vb[r][c] || s.vb[r + 1][c] || s.hs[r][c]) return false;
      s.vb[r][c] = s.vb[r + 1][c] = s.vs[r][c] = true;
    }
    return true;
  }
  // Qonuniy devor boʻlsa yangi holatni qaytaradi: ikkala oʻyinchining yoʻli ochiq qolishi shart
  function tryWall(s, p, t, r, c) {
    if (s.walls[p] < 1) return null;
    const n = clone(s);
    if (!placeWall(n, t, r, c) || dist(n, 0) === Infinity || dist(n, 1) === Infinity) return null;
    n.walls[p]--;
    return n;
  }
  const steps = (s, p) => D4.filter(([dr, dc]) => open(s, s.pos[p].r, s.pos[p].c, dr, dc)
    && !(s.pos[1 - p].r === s.pos[p].r + dr && s.pos[1 - p].c === s.pos[p].c + dc)).map(([dr, dc]) => [s.pos[p].r + dr, s.pos[p].c + dc]);

  // p uchun barcha mumkin yurishlar (yangi holat + yurish tavsifi)
  function successors(s, p) {
    const out = [];
    for (const [r, c] of steps(s, p)) { const n = clone(s); n.pos[p] = { r, c }; out.push(n); }
    for (let r = 0; r < N - 1; r++) for (let c = 0; c < N - 1; c++) for (const t of 'hv') { const n = tryWall(s, p, t, r, c); if (n) out.push(n); }
    return out;
  }

  /* ---------- 2) AI: 2 qatlamli qidiruv (oʻz yurishi + raqibning eng yaxshi javobi) ---------- */
  // Baho: raqib yoʻli qancha uzun va oʻzimiznikining qancha qisqa boʻlsa, shuncha yaxshi
  const score = s => dist(s, HUM) - dist(s, AI) + 0.2 * (s.walls[AI] - s.walls[HUM]);
  function aiMove(s) {
    let best = null, bv = -Infinity;
    for (const a of successors(s, AI)) {
      let v;
      if (a.pos[AI].r === GOAL[AI]) v = 1e3;                               // darrov gʻalaba
      else {
        v = Infinity;
        for (const b of successors(a, HUM)) {                              // raqib eng yomon (biz uchun) javob beradi
          const e = b.pos[HUM].r === GOAL[HUM] ? -1e3 : score(b);
          if (e < v) v = e;
          if (v <= bv) break;                                              // alfa kesish: bu yurish yaxshiroq boʻla olmaydi
        }
        if (v === Infinity) v = score(a);
      }
      v += Math.random() * 0.01;                                           // teng yurishlarda tasodif
      if (v > bv) { bv = v; best = a; }
    }
    return best;
  }

  /* ---------- 3) INTERFEYS ---------- */
  function mount(root, ctx) {
    root.innerHTML = `
      <div class="hud"><span>Sizning yoʻlingiz <b class="bk-d0"></b></span><span>AI yoʻli <b class="bk-d1"></b></span><span>Devorlar <b class="bk-w0"></b> / <b class="bk-w1"></b></span></div>
      <div class="status bk-status" aria-live="polite"></div>
      <div class="bk-board"></div>
      <div class="btn-row"><button class="btn accent bk-new" type="button">Yangi oʻyin</button></div>`;
    const $ = s => root.querySelector(s), board = $('.bk-board'), st = $('.bk-status');
    // (2N−1)² element: juft/juft = katak, toq/juft = gorizontal devor oraligʻi, juft/toq = vertikal, toq/toq = tutashgan nuqta
    const items = [];
    for (let i = 0; i < 2 * N - 1; i++) for (let j = 0; j < 2 * N - 1; j++) {
      const e = document.createElement('div'), k = i % 2 ? (j % 2 ? 'x' : 'h') : (j % 2 ? 'v' : 'cell');
      e.dataset.k = k; e.dataset.r = i >> 1; e.dataset.c = j >> 1;
      board.appendChild(e); items.push({ e, k, r: i >> 1, c: j >> 1 });
    }
    let s, turn, over, turns, timer;

    function reset() { clearTimeout(timer); s = newState(); turn = HUM; over = false; turns = 0; msg('Sizning navbatingiz: yuring (yashil katak) yoki devor qoʻying (katakchalar orasini bosing).'); render(); }
    const msg = t => { st.textContent = t; };

    function render() {
      const legal = new Set(!over && turn === HUM ? steps(s, HUM).map(x => x.join(',')) : []);
      for (const { e, k, r, c } of items) {
        let cls = 'bk-' + k;
        if (k === 'cell') {
          cls += r === GOAL[HUM] ? ' g0' : r === GOAL[AI] ? ' g1' : '';
          if (s.pos[HUM].r === r && s.pos[HUM].c === c) cls += ' me';
          else if (s.pos[AI].r === r && s.pos[AI].c === c) cls += ' ai';
          else if (legal.has(r + ',' + c)) cls += ' ok';
        } else if ((k === 'h' && s.hb[r][c]) || (k === 'v' && s.vb[r][c]) || (k === 'x' && (s.hs[r][c] || s.vs[r][c]))) cls += ' on';
        e.className = cls;
      }
      $('.bk-d0').textContent = dist(s, HUM); $('.bk-d1').textContent = dist(s, AI);
      $('.bk-w0').textContent = s.walls[HUM]; $('.bk-w1').textContent = s.walls[AI];
    }

    // Navbat tugadi: gʻalabani tekshirish, navbatni almashtirish, kerak boʻlsa AI yurishi
    function endTurn() {
      if (s.pos[turn].r === GOAL[turn]) {
        over = true;
        if (turn === HUM) {
          msg('Gʻalaba! Siz AIʼdan oldin maqsadga yetdingiz 🎉');
          ctx.reportScore({ score: 200 + s.walls[HUM] * 25 + Math.max(0, 40 - turns) * 5, meta: { turns, wallsLeft: s.walls[HUM] } });
        } else msg('AI gʻalaba qozondi. Devorlarni tejamkorroq ishlating!');
        return render();
      }
      turn = 1 - turn;
      if (!steps(s, turn).length && s.walls[turn] < 1) turn = 1 - turn;     // yurishga joyi yoʻq oʻyinchi navbatni oʻtkazadi
      render();
      if (turn === AI) {
        msg('AI oʻylamoqda…');
        timer = setTimeout(() => { const n = aiMove(s); if (n) s = n; endTurn(); if (!over && turn === HUM) msg('Sizning navbatingiz.'); }, 60);
      }
    }

    board.addEventListener('click', ev => {
      const t = ev.target.closest('[data-k]');
      if (!t || over || turn !== HUM) return;
      const k = t.dataset.k, r = +t.dataset.r, c = +t.dataset.c;
      if (k === 'cell') {
        if (!steps(s, HUM).some(([a, b]) => a === r && b === c)) return;
        s = clone(s); s.pos[HUM] = { r, c };
      } else if (k === 'h' || k === 'v') {
        // Bosilgan oraliq devorning boshi yoki oxiri boʻlishi mumkin: ikkala variantni sinaymiz
        const n = [k === 'h' ? [r, c] : [r, c], k === 'h' ? [r, c - 1] : [r - 1, c]].map(([a, b]) => tryWall(s, HUM, k, a, b)).find(Boolean);
        if (!n) return msg(s.walls[HUM] < 1 ? 'Devorlaringiz tugadi — faqat yurish mumkin.' : 'Bu yerga devor qoʻyib boʻlmaydi (kesishadi yoki yoʻlni butunlay yopadi).');
        s = n;
      } else return;
      turns++; endTurn();
    });
    $('.bk-new').addEventListener('click', reset);
    reset();
    return () => clearTimeout(timer);
  }

  IQArena.registerGame({
    id: 'blockade', title: 'Blockade', icon: '🚧', color: '#ffffff', kind: 'classic', ready: true,
    blurb: 'Devor qoʻyib raqibni yoʻldan ozdiring, lekin oʻz yoʻlingizni ham oching.',
    skill: 'Yoʻl qidirish (eng qisqa yoʻl), strategik rejalashtirish va resurslarni taqsimlash',
    rules: [
      'Siz 🔴 pastdan tepa qatorga (pushti qator), AI 🟡 tepadan pastki qatorga (sariq qator) yetishi kerak.',
      'Navbatda bitta ish: bir katak yuring (yashil kataklar) YOKI 2 katak uzunlikdagi devor qoʻying (katakchalar orasini bosing). Har kimda 6 ta devor.',
      'Devor yoʻlni toʻliq yopolmaydi va boshqa devor bilan kesishmaydi. Tepadagi hisobda ikkala tomonning eng qisqa yoʻli koʻrinib turadi.',
      'Birinchi boʻlib maqsad qatoriga yetgan yutadi. Ortiq devor va tezroq gʻalaba = koʻproq ball.'
    ],
    mount
  });
})();
