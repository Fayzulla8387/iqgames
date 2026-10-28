/* ===== Original oʻyin 3: BURILISH KATAGI =====
   Gʻoya: "qarama-qarshi tortishish". Taxtani 90° burasiz. Ekranda tortishish doim pastga:
   moviy bloklar pastga tushadi, qizil bloklar esa TESKARI vaqt/tortishishga boʻysunadi — tepaga koʻtariladi.
   Maqsad: har bir blokni oʻz rangidagi maqsad katagiga yetkazish, imkon qadar kam burilishda.
   Daraja generatori: tasodifiy yurishlar zanjiri maqsadni belgilaydi (yechim kafolatli),
   BFS esa mutlaq optimal yurishlar sonini (par) hisoblaydi.
   Fayl: 1) fizika va yechuvchi, 2) generator, 3) interfeys. */
(function () {
  'use strict';
  const N = 6;
  // Tortishish yoʻnalishi TAXTA koordinatasida. Taxta soat strelkasi boʻyicha burilganda: pastga → oʻngga → tepaga → chapga
  const G = [[0, 1], [1, 0], [0, -1], [-1, 0]];
  const mod4 = k => (k % 4 + 4) % 4;
  const pk = l => l.map(p => p[1] * N + p[0]).sort((a, b) => a - b).join(',');   // bloklar toʻplamining kanonik kaliti

  /* ---------- 1) FIZIKA VA YECHUVCHI ---------- */
  // Tortishish k boʻyicha barcha bloklar sirpanadi: avval moviylar (g tomonga), keyin qizillar (teskari tomonga).
  // Har guruhda oldingi (yoʻnalish tomonidagi) blok birinchi harakatlanadi; toʻsiq: devor, chekka, boshqa blok.
  function fall(walls, bl, rd, k) {
    const [dx, dy] = G[mod4(k)], occ = Uint8Array.from(walls);
    [...bl, ...rd].forEach(([x, y]) => { occ[y * N + x] = 1; });
    const slide = (list, sx, sy) => {
      const out = list.map(p => p.slice());
      const order = out.map((_, i) => i).sort((i, j) => (out[j][0] * sx + out[j][1] * sy) - (out[i][0] * sx + out[i][1] * sy));
      for (const i of order) {
        let [x, y] = out[i];
        occ[y * N + x] = 0;
        for (;;) { const nx = x + sx, ny = y + sy; if (nx < 0 || ny < 0 || nx >= N || ny >= N || occ[ny * N + nx]) break; x = nx; y = ny; }
        occ[y * N + x] = 1; out[i] = [x, y];
      }
      return out;
    };
    const b = slide(bl, dx, dy), r = slide(rd, -dx, -dy);        // tartib muhim: moviy → qizil
    return { bl: b, rd: r };
  }

  // BFS: har yurishda 2 ta tanlov (chapga/oʻngga burish). Holat = (tortishish, moviy toʻplam, qizil toʻplam)
  function solve(walls, bl, rd, tb, tr, maxD = 14) {
    const gb = pk(tb), gr = pk(tr);
    if (pk(bl) === gb && pk(rd) === gr) return 0;
    let layer = [{ bl, rd, k: 0 }];
    const seen = new Set(['0|' + pk(bl) + '|' + pk(rd)]);
    for (let d = 1; d <= maxD && layer.length; d++) {
      const next = [];
      for (const s of layer) for (const dk of [1, -1]) {
        const k = mod4(s.k + dk), f = fall(walls, s.bl, s.rd, k);
        if (pk(f.bl) === gb && pk(f.rd) === gr) return d;
        const id = k + '|' + pk(f.bl) + '|' + pk(f.rd);
        if (!seen.has(id)) { seen.add(id); next.push({ bl: f.bl, rd: f.rd, k }); }
      }
      layer = next;
    }
    return -1;
  }

  /* ---------- 2) GENERATOR ---------- */
  const rng = a => () => { a = a * 1664525 + 1013904223 >>> 0; return a / 4294967296; };   // seedli: har daraja har safar bir xil
  function generate(level) {
    const rnd = rng(level * 977 + 5), nb = 1 + (level >= 3), nr = 1 + (level >= 5);
    const minPar = Math.min(2 + level, 9), walk = Math.min(5 + level, 12), wc = Math.min(4 + level, 11);
    let best = null;
    for (let a = 0; a < 300; a++) {
      const walls = new Uint8Array(N * N), cells = [...Array(N * N).keys()].sort(() => rnd() - .5);
      cells.slice(0, wc).forEach(c => { walls[c] = 1; });                         // tasodifiy devorlar
      const pts = cells.slice(wc, wc + nb + nr).map(c => [c % N, c / N | 0]);      // boshlangʻich bloklar
      const bl = pts.slice(0, nb), rd = pts.slice(nb);
      let s = { bl, rd }, k = 0;
      for (let i = 0; i < walk; i++) { k += rnd() < .5 ? 1 : -1; s = fall(walls, s.bl, s.rd, k); }   // tasodifiy yurishlar → maqsad
      const par = solve(walls, bl, rd, s.bl, s.rd);
      if (par < 1) continue;
      const cand = { walls, bl, rd, tb: s.bl, tr: s.rd, par };
      if (par >= minPar && par <= minPar + 3) return cand;                         // qiyinlik asta-sekin oshadi
      if (!best || par > best.par) best = cand;
    }
    return best;
  }

  /* ---------- 3) INTERFEYS ---------- */
  function mount(root, ctx) {
    root.innerHTML = `
      <div class="hud"><span>Daraja <b class="gg-lvl"></b></span><span>Yurishlar <b class="gg-mv">0</b></span><span>Optimal <b class="gg-par"></b></span><span>Ball <b class="gg-score">0</b></span></div>
      <div class="msg gg-msg"></div>
      <div class="gg-wrap"></div>
      <div class="gg-legend"><span><i class="gg-lg b"></i> pastga tushadi</span><span><i class="gg-lg r"></i> tepaga koʻtariladi</span></div>
      <div class="btn-row"><button class="btn gg-ccw" type="button">↺ Chapga burish</button><button class="btn gg-cw" type="button">Oʻngga burish ↻</button></div>
      <div class="btn-row"><button class="btn ghost gg-undo" type="button">⏪ Vaqtni qaytarish</button><button class="btn ghost gg-redo" type="button">Qaytadan</button><button class="btn accent gg-next" type="button" hidden>Keyingi daraja</button></div>`;
    const $ = s => root.querySelector(s), wrap = $('.gg-wrap');
    let level = 1, total = 0, L, st, hist, done, board, blEls, rdEls;

    function load() {
      L = generate(level); st = { bl: L.bl, rd: L.rd, k: 0, angle: 0 }; hist = []; done = false;
      const has = (list, x, y) => list.some(p => p[0] === x && p[1] === y);
      // Taxta har darajada qayta yaratiladi (shunda burilish animatsiyasi nolga "qaytib" ketmaydi)
      wrap.innerHTML = `<div class="gg-board">${Array.from({ length: N * N }, (_, i) => {
        const x = i % N, y = i / N | 0;
        return `<div class="gg-c${L.walls[i] ? ' w' : has(L.tb, x, y) ? ' tb' : has(L.tr, x, y) ? ' tr' : ''}"></div>`;
      }).join('')}${L.bl.map(() => '<div class="gg-blk b"><i></i></div>').join('')}${L.rd.map(() => '<div class="gg-blk r"><i></i></div>').join('')}</div>`;
      board = wrap.firstChild; blEls = [...board.querySelectorAll('.gg-blk.b')]; rdEls = [...board.querySelectorAll('.gg-blk.r')];
      $('.gg-next').hidden = true; $('.gg-par').textContent = L.par;
      msg('Taxtani buring: moviylar pastga tushadi, qizillar tepaga koʻtariladi. Hammasini oʻz maqsadiga yetkazing.');
      sync();
    }
    const msg = t => { $('.gg-msg').textContent = t; };

    // Holatni ekranga: bloklar pozitsiyasi (CSS transition bilan sirpanadi) va taxta burilishi
    function sync() {
      const tb = new Set(L.tb.map(p => p[1] * N + p[0])), tr = new Set(L.tr.map(p => p[1] * N + p[0]));
      const put = (els, list, targets) => els.forEach((el, i) => {
        el.style.left = list[i][0] * 100 / N + '%'; el.style.top = list[i][1] * 100 / N + '%';
        el.classList.toggle('on', targets.has(list[i][1] * N + list[i][0]));         // maqsadda turgan blok yonadi
      });
      put(blEls, st.bl, tb); put(rdEls, st.rd, tr);
      board.style.transform = `rotate(${st.angle}deg)`;
      $('.gg-mv').textContent = hist.length; $('.gg-lvl').textContent = level; $('.gg-score').textContent = total;
    }

    // dk = +1: oʻngga (soat strelkasi boʻyicha), −1: chapga
    function move(dk) {
      if (done) return;
      hist.push(st);                                                 // oldingi holat (massivlar oʻzgarmaydi, faqat almashtiriladi)
      const k = st.k + dk, f = fall(L.walls, st.bl, st.rd, k);
      st = { bl: f.bl, rd: f.rd, k, angle: st.angle + 90 * dk };
      sync();
      if (pk(st.bl) === pk(L.tb) && pk(st.rd) === pk(L.tr)) win();
    }
    function undo() { if (!done && hist.length) { st = hist.pop(); sync(); } }

    function win() {
      done = true;
      const mv = hist.length, stars = mv <= L.par ? 3 : mv <= L.par + 2 ? 2 : 1;
      total += stars * 50 + level * 10;
      msg(`${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}  ${mv} yurish (optimal ${L.par}). ${stars === 3 ? 'Mukammal!' : 'Kamroq burilishda ham mumkin edi.'}`);
      $('.gg-next').hidden = false; $('.gg-score').textContent = total;
      ctx.reportScore({ score: total, meta: { level, stars, moves: mv } });
    }

    // Klaviatura: ← → burish, Z yoki Backspace — vaqtni qaytarish
    const onKey = e => {
      if (/^(SELECT|INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); move(-1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); move(1); }
      else if (e.key === 'z' || e.key === 'Backspace') { e.preventDefault(); undo(); }
    };
    document.addEventListener('keydown', onKey);
    $('.gg-ccw').addEventListener('click', () => move(-1));
    $('.gg-cw').addEventListener('click', () => move(1));
    $('.gg-undo').addEventListener('click', undo);
    $('.gg-redo').addEventListener('click', load);
    $('.gg-next').addEventListener('click', () => { level++; load(); });
    load();
    return () => document.removeEventListener('keydown', onKey);
  }

  IQArena.registerGame({
    id: 'gravitygrid', title: 'Burilish Katagi', icon: '🌀', color: '#ff5d5d', kind: 'original', ready: true,
    blurb: 'Taxtani buring: moviy bloklar pastga tushadi, qizillar esa tepaga koʻtariladi. Hammasini maqsadga yetkazing.',
    skill: 'Fazoviy mantiq, aqliy simulyatsiya va yurishlar ketma-ketligini oldindan rejalashtirish',
    rules: [
      'Taxtada 🔵 moviy doiralar va 🟥 qizil kvadratlar bor. Punktir shakllar — ularning maqsad kataklari. Har bir blokni oʻz rangidagi maqsadga olib boring.',
      'Har yurishda taxtani 90° buring (chapga yoki oʻngga). Ekranda tortishish doim pastga: moviy bloklar pastga tushadi, qizil bloklar teskari tortishishga boʻysunadi va tepaga koʻtariladi. Ular devor, chekka yoki boshqa blokka tegguncha sirpanadi.',
      'Avval moviylar, keyin qizillar harakatlanadi; har guruhda oldingi blok birinchi.',
      '«Vaqtni qaytarish» oxirgi burilishni bekor qiladi (klaviatura: ← → burish, Z qaytarish). Optimal yurishda yechsangiz 3 yulduz.'
    ],
    mount
  });
})();
