/* ===== Connect 4 =====
   Fayl 2 qismdan iborat:
   1) Sof mantiq (DOMʼga bogʻliq emas — alohida sinash mumkin)
   2) mount(): interfeys va oʻyin oqimi */
(function () {
  'use strict';
  const ROWS = 6, COLS = 7, HUM = 1, AI = 2;
  const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];       // gorizontal, vertikal, ikki diagonal
  // Qiyinlik: depth = AI necha yurish oldinga hisoblaydi, noise = tasodifiy xato ehtimoli
  const LEVELS = { easy: { depth: 2, noise: 0.3, base: 100 }, medium: { depth: 4, noise: 0, base: 200 }, hard: { depth: 6, noise: 0, base: 400 } };

  /* ---------- 1) MANTIQ ---------- */
  const newBoard = () => Array.from({ length: ROWS }, () => Array(COLS).fill(0));

  // Ustunga disk tushsa, qaysi qatorga qoʻnadi? (-1 = ustun toʻla)
  function dropRow(b, c) { for (let r = ROWS - 1; r >= 0; r--) if (!b[r][c]) return r; return -1; }

  // Toʻla boʻlmagan ustunlar; markazdan boshlab (alfa-beta kesish uchun yaxshiroq tartib)
  const validCols = b => [3, 2, 4, 1, 5, 0, 6].filter(c => !b[0][c]);

  // (r,c) katagi orqali p oʻyinchining 4+ ta chizigʻi bormi? Boʻlsa — kataklar roʻyxati
  function lineThrough(b, r, c, p) {
    for (const [dr, dc] of DIRS) {
      const cells = [[r, c]];
      for (const s of [1, -1]) {                         // chiziqning ikki tomoniga yurish
        let rr = r + dr * s, cc = c + dc * s;
        while (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS && b[rr][cc] === p) { cells.push([rr, cc]); rr += dr * s; cc += dc * s; }
      }
      if (cells.length >= 4) return cells;
    }
    return null;
  }

  // Evristika: taxtaning "foydaliligi" (AI uchun +, raqib uchun −)
  function evaluate(b) {
    let s = 0;
    for (let r = 0; r < ROWS; r++) s += b[r][3] === AI ? 3 : b[r][3] === HUM ? -3 : 0;   // markaz ustuni muhim
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) for (const [dr, dc] of DIRS) {
      const er = r + 3 * dr, ec = c + 3 * dc;
      if (er < 0 || er >= ROWS || ec < 0 || ec >= COLS) continue;                       // 4 katakli "oyna" sigʻmasa
      let a = 0, h = 0;
      for (let k = 0; k < 4; k++) { const v = b[r + k * dr][c + k * dc]; if (v === AI) a++; else if (v === HUM) h++; }
      if (a && h) continue;                                                              // ikkalasi aralash — foydasiz
      if (a === 3) s += 5; else if (a === 2) s += 2;
      if (h === 3) s -= 6; else if (h === 2) s -= 2;                                     // raqib xavfini ogʻirroq baholaymiz
    }
    return s;
  }

  // Minimax + alfa-beta kesish. last = oxirgi yurish (gʻalabani tez tekshirish uchun)
  function minimax(b, depth, alpha, beta, aiTurn, last) {
    if (lineThrough(b, last.r, last.c, last.p)) return last.p === AI ? 1e6 + depth : -1e6 - depth; // tezroq gʻalaba yaxshiroq
    const cols = validCols(b);
    if (!cols.length) return 0;                          // durang
    if (depth === 0) return evaluate(b);
    let best = aiTurn ? -Infinity : Infinity;
    for (const c of cols) {
      const r = dropRow(b, c), p = aiTurn ? AI : HUM;
      b[r][c] = p;                                       // yurishni sinab koʻramiz...
      const v = minimax(b, depth - 1, alpha, beta, !aiTurn, { r, c, p });
      b[r][c] = 0;                                       // ...va qaytarib olamiz
      if (aiTurn) { best = Math.max(best, v); alpha = Math.max(alpha, v); } else { best = Math.min(best, v); beta = Math.min(beta, v); }
      if (alpha >= beta) break;                          // kesish: bu shoxa natijani oʻzgartirmaydi
    }
    return best;
  }

  // AI yurishini tanlash; teng baholi yurishlardan tasodifiy biri (turli oʻyinlar uchun)
  function bestMove(b, lv) {
    const cols = validCols(b);
    if (Math.random() < lv.noise) return cols[Math.random() * cols.length | 0];
    let best = [], bestV = -Infinity;
    for (const c of cols) {
      const r = dropRow(b, c);
      b[r][c] = AI;
      const v = minimax(b, lv.depth - 1, -Infinity, Infinity, false, { r, c, p: AI });
      b[r][c] = 0;
      if (v > bestV) { bestV = v; best = [c]; } else if (v === bestV) best.push(c);
    }
    return best[Math.random() * best.length | 0];
  }

  /* ---------- 2) INTERFEYS ---------- */
  function mount(root, ctx) {
    root.innerHTML = `
      <div class="row">
        <select class="c4-mode" aria-label="Rejim"><option value="ai">AIʼga qarshi</option><option value="pvp">2 kishi</option></select>
        <select class="c4-level" aria-label="Qiyinlik"><option value="easy">Oson</option><option value="medium" selected>Oʻrta</option><option value="hard">Qiyin</option></select>
        <button class="btn accent c4-new" type="button">Yangi oʻyin</button>
      </div>
      <div class="status c4-status" aria-live="polite"></div>
      <div class="c4-board"></div>`;
    const $ = s => root.querySelector(s);
    const boardEl = $('.c4-board'), statusEl = $('.c4-status'), modeEl = $('.c4-mode'), levelEl = $('.c4-level');
    // 42 ta katak (tugma); har biri oʻz ustun raqamini saqlaydi
    boardEl.innerHTML = Array.from({ length: ROWS * COLS }, (_, i) => `<button class="c4-cell" data-c="${i % COLS}" aria-label="${i % COLS + 1}-ustun"></button>`).join('');
    const cells = [...boardEl.children];
    let board, turn, over, moves, last, win, timer;

    function reset() {
      clearTimeout(timer);
      board = newBoard(); turn = HUM; over = false; moves = 0; last = null; win = null;
      levelEl.disabled = modeEl.value === 'pvp';         // qiyinlik faqat AI rejimida
      render();
    }

    // Holatni ekranga chizish
    function render() {
      cells.forEach((el, i) => {
        const r = i / COLS | 0, c = i % COLS, v = board[r][c];
        el.className = 'c4-cell' + (v ? ' p' + v : '')
          + (last && last[0] === r && last[1] === c ? ' drop' : '')                     // faqat oxirgi disk tushish animatsiyasi bilan
          + (win && win.some(([a, b]) => a === r && b === c) ? ' win' : '');           // gʻalaba chizigʻi yonadi
        el.style.setProperty('--r', r);
      });
      boardEl.classList.toggle('locked', over);
      const ai = modeEl.value === 'ai', name = p => p === 1 ? 'Qizil' : 'Sariq';
      statusEl.textContent = over
        ? (!win ? 'Durang! Taxta toʻldi.' : ai ? (turn === HUM ? 'Gʻalaba! Siz AIʼni yengdingiz 🎉' : 'AI gʻalaba qozondi. Qayta urinib koʻring.') : name(turn) + ' gʻalaba qozondi 🎉')
        : ai ? (turn === HUM ? 'Sizning navbatingiz (qizil)' : 'AI oʻylamoqda…') : name(turn) + ' navbati';
    }

    // Yurishni bajarish va natijani tekshirish
    function place(r, c) {
      board[r][c] = turn; moves++; last = [r, c];
      win = lineThrough(board, r, c, turn);
      if (win) { over = true; finish(); }                // turn oʻzgarmaydi: gʻolib = turn
      else if (moves === ROWS * COLS) { over = true; }
      else turn = 3 - turn;                              // 1 <-> 2
      render();
    }

    // AIʼni yengsa — reytingga ball: qiyinlik + tezlik bonusi
    function finish() {
      if (modeEl.value === 'ai' && turn === HUM) {
        const lv = levelEl.value;
        ctx.reportScore({ score: LEVELS[lv].base + (ROWS * COLS - moves) * 5, meta: { level: lv, moves } });
      }
    }

    function play(col) {
      const ai = modeEl.value === 'ai';
      if (over || (ai && turn !== HUM)) return;          // AI oʻylayotganda bosib boʻlmaydi
      const r = dropRow(board, col);
      if (r < 0) return;
      place(r, col);
      if (!over && ai) {                                 // AI navbati: kichik pauza (hisob-kitob UIʼni qotirmasligi uchun)
        timer = setTimeout(() => { const c = bestMove(board, LEVELS[levelEl.value]); place(dropRow(board, c), c); }, 350);
      }
    }

    boardEl.addEventListener('click', e => { const b = e.target.closest('.c4-cell'); if (b) play(+b.dataset.c); });
    $('.c4-new').addEventListener('click', reset);
    modeEl.addEventListener('change', reset);
    levelEl.addEventListener('change', reset);
    reset();
    return () => clearTimeout(timer);                    // sahifadan chiqqanda taymerni toʻxtatish
  }

  IQArena.registerGame({
    id: 'connect4', title: 'Connect 4', icon: '🔴', color: '#3b82f6', kind: 'classic', ready: true,
    blurb: 'Toʻrtta diskni bir chiziqqa tizing: AIʼga qarshi yoki doʻstingiz bilan.',
    skill: 'Kombinatorika, oldindan hisoblash (lookahead) va naqshlarni tanish',
    rules: [
      'Taxta 7×6. Navbat bilan ustunni tanlang — disk eng pastki boʻsh katakka tushadi.',
      'Gorizontal, vertikal yoki diagonal boʻylab 4 ta oʻz diskingizni birinchi boʻlib tizing.',
      'Rejim: AIʼga qarshi (oson, oʻrta, qiyin) yoki 2 kishi. AIʼni yengsangiz reytingga ball yoziladi: qiyinroq daraja va tezroq gʻalaba = koʻproq ball.'
    ],
    mount
  });
})();
