/* ===== Original oʻyin 2: ESHIKLAR ZANJIRI =====
   Gʻoya: zanjir sxemasi tayyor, lekin eshiklar boʻsh. Sizda cheklangan "inventar" bor
   (masalan: 1 AND, 1 XOR, 2 NOT). Maqsad — shu eshiklarni joylashtirib, zanjirning
   chiqishi MAQSAD HAQIQAT JADVALI bilan barcha kirish kombinatsiyalarida mos tushsin.
   Bu — teskari muhandislik: natijadan zanjirni tiklash. Fayl: 1) mantiq, 2) generator, 3) interfeys. */
(function () {
  'use strict';
  /* ---------- 1) MANTIQ ---------- */
  const OPS = { AND: (a, b) => a & b, OR: (a, b) => a | b, XOR: (a, b) => a ^ b, NOT: a => 1 - a, WIRE: a => a };
  const BIN = ['AND', 'OR', 'XOR'], UN = ['NOT', 'WIRE'];   // ikki kirishli va bir kirishli eshiklar
  // Shablon tugunlari: bin=true → 2 kirish; src: kirish harfi ('A') yoki oldingi eshik indeksi (raqam)
  const B = (x, y) => ({ bin: true, src: [x, y] }), U = x => ({ bin: false, src: [x] });
  const TPL = [
    { inputs: ['A', 'B', 'C'], nodes: [B('A', 'B'), U('C'), B(0, 1)] },
    { inputs: ['A', 'B', 'C'], nodes: [B('A', 'B'), U(0), B(1, 'C')] },
    { inputs: ['A', 'B', 'C', 'D'], nodes: [B('A', 'B'), B('C', 'D'), U(0), B(2, 1)] },
    { inputs: ['A', 'B', 'C', 'D'], nodes: [B('A', 'B'), U('C'), B(0, 1), U(2), B(3, 'D')] },
    { inputs: ['A', 'B', 'C', 'D'], nodes: [B('A', 'B'), B('C', 'D'), U(0), U(1), B(2, 3), U(4)] }
  ];

  // Zanjirni bitta kirish qatori (row) uchun hisoblash; boʻsh eshik boʻlsa null
  function evalRow(tpl, assign, row) {
    const v = [], get = x => typeof x === 'string' ? row[tpl.inputs.indexOf(x)] : v[x];
    for (let i = 0; i < tpl.nodes.length; i++) {
      if (!assign[i]) return null;
      v[i] = OPS[assign[i]](...tpl.nodes[i].src.map(get));
    }
    return v[v.length - 1];                                  // oxirgi eshik = chiqish
  }

  /* ---------- 2) GENERATOR ---------- */
  const rng = a => () => { a = a * 1664525 + 1013904223 >>> 0; return a / 4294967296; };   // seedli tasodif: daraja har safar bir xil
  function generate(level) {
    const tpl = TPL[Math.min(level - 1, TPL.length - 1)], rnd = rng(level * 131 + 7), n = tpl.inputs.length;
    const rows = [...Array(1 << n).keys()].map(m => tpl.inputs.map((_, k) => m >> (n - 1 - k) & 1));   // barcha kirish kombinatsiyalari
    for (let a = 0; ; a++) {
      // Yashirin yechim: tasodifiy eshiklar. Maqsad jadvali shundan hisoblanadi → yechim albatta mavjud
      const assign = tpl.nodes.map(nd => { const p = nd.bin ? BIN : UN; return p[rnd() * p.length | 0]; });
      const target = rows.map(r => evalRow(tpl, assign, r)), ones = target.reduce((x, y) => x + y, 0);
      const varied = new Set(assign).size >= Math.min(3, assign.length);       // xilma-xil eshiklar: qiziqarliroq jumboq
      if (ones > 0 && ones < rows.length && (varied || a > 200)) {
        const tokens = assign.map(type => ({ type })).sort(() => rnd() - .5).map((t, id) => ({ id, type: t.type }));
        return { tpl, rows, target, tokens };                                   // inventar = yashirin yechim eshiklari (aralashtirilgan)
      }
    }
  }

  /* ---------- 3) INTERFEYS ---------- */
  function mount(root, ctx) {
    root.innerHTML = `
      <div class="hud"><span>Daraja <b class="lc-lvl"></b></span><span>Ball <b class="lc-score">0</b></span></div>
      <div class="msg lc-msg"></div><div class="lc-wrap"></div><div class="lc-tray"></div><div class="lc-table"></div>
      <div class="btn-row"><button class="btn ghost lc-reset" type="button">Tozalash</button><button class="btn accent lc-next" type="button" hidden>Keyingi daraja</button></div>`;
    const $ = s => root.querySelector(s);
    let level = 1, total = 0, L, slots, sel, placed, done;

    function load() {
      L = generate(level); slots = Array(L.tpl.nodes.length).fill(null); sel = null; placed = 0; done = false;
      $('.lc-next').hidden = true; msg('Inventardan eshikni tanlang, keyin zanjirdagi boʻsh joyni bosing. Jadvaldagi “Sizniki” ustuni “Maqsad” ga tenglashsin.'); render();
    }
    const msg = t => { $('.lc-msg').textContent = t; };
    const typeOf = id => id == null ? null : L.tokens[id].type;

    function render() {
      const { tpl } = L, assign = slots.map(typeOf), n = tpl.inputs.length;
      const mine = L.rows.map(r => evalRow(tpl, assign, r));
      const solved = mine.every((v, i) => v === L.target[i]);                 // null (boʻsh eshik) hech qachon teng emas
      // Joylashuv: chuqurlik (depth) = zanjirda nechanchi qatlam; x chuqurlikka, y qatlamdagi tartibga qarab
      const W = 640, H = 280, dep = [];
      tpl.nodes.forEach((nd, i) => { dep[i] = 1 + Math.max(...nd.src.map(x => typeof x === 'string' ? 0 : dep[x])); });
      const maxD = Math.max(...dep), X = d => 50 + d * 540 / (maxD + 1), pos = {};
      tpl.inputs.forEach((l, k) => { pos[l] = [X(0), (k + 1) * H / (n + 1)]; });
      for (let d = 1; d <= maxD; d++) { const ids = dep.map((x, i) => x === d ? i : -1).filter(i => i >= 0); ids.forEach((i, k) => { pos[i] = [X(d), (k + 1) * H / (ids.length + 1)]; }); }
      const last = tpl.nodes.length - 1, lamp = [X(maxD + 1), H / 2];
      let svg = `<svg class="lc-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Mantiqiy zanjir">`;
      const line = (p, q) => `<line x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}" stroke="#1b2340" stroke-width="2.5"/>`;
      tpl.nodes.forEach((nd, i) => nd.src.forEach(s => { svg += line(pos[s], pos[i]); }));
      svg += line(pos[last], lamp);
      tpl.inputs.forEach(l => { svg += `<circle cx="${pos[l][0]}" cy="${pos[l][1]}" r="16" fill="#fff" stroke="#1b2340" stroke-width="2.5"/><text x="${pos[l][0]}" y="${pos[l][1] + 5}" text-anchor="middle" font-weight="700" fill="#1b2340">${l}</text>`; });
      tpl.nodes.forEach((nd, i) => {
        const [x, y] = pos[i], t = assign[i];
        svg += `<g class="lc-slot" data-slot="${i}"><rect x="${x - 38}" y="${y - 19}" width="76" height="38" rx="10" fill="${t ? (nd.bin ? '#c9bfff' : '#ffc933') : '#fff'}" stroke="#1b2340" stroke-width="2.5" ${t ? '' : 'stroke-dasharray="5 4"'}/>
          <text x="${x}" y="${y + 5}" text-anchor="middle" font-weight="700" font-size="${t ? 15 : 11}" fill="${t ? '#1b2340' : '#5b6585'}">${t || (nd.bin ? '2 kirish' : '1 kirish')}</text></g>`;
      });
      svg += `<circle cx="${lamp[0]}" cy="${lamp[1]}" r="18" fill="${solved ? '#ffc933' : '#fff'}" stroke="#1b2340" stroke-width="2.5"/><text x="${lamp[0]}" y="${lamp[1] + 6}" text-anchor="middle" font-size="18">💡</text></svg>`;
      $('.lc-wrap').innerHTML = svg;
      // Inventar (hali joylanmagan eshiklar)
      $('.lc-tray').innerHTML = L.tokens.filter(t => !slots.includes(t.id)).map(t =>
        `<button class="btn small lc-tok${sel === t.id ? ' sel' : ''}" data-id="${t.id}" type="button">${t.type}</button>`).join('') || '<span class="msg">Inventar boʻsh</span>';
      // Haqiqat jadvali: maqsad va joriy natija
      $('.lc-table').innerHTML = `<table class="lc-tt"><tr>${tpl.inputs.map(l => `<th>${l}</th>`).join('')}<th>Maqsad</th><th>Sizniki</th></tr>${L.rows.map((r, i) =>
        `<tr>${r.map(b => `<td>${b}</td>`).join('')}<td><b>${L.target[i]}</b></td><td class="${mine[i] === null ? '' : mine[i] === L.target[i] ? 'ok' : 'bad'}">${mine[i] === null ? '·' : mine[i]}</td></tr>`).join('')}</table>`;
      $('.lc-lvl').textContent = level; $('.lc-score').textContent = total;
      if (solved && !done) win();
    }

    function win() {
      done = true;
      const gain = Math.max(30, 100 - 5 * (placed - slots.length)) + level * 10;   // ortiqcha urinishlar ballni kamaytiradi
      total += gain;
      msg(`Zanjir toʻgʻri! +${gain} ball 💡`);
      $('.lc-next').hidden = false;
      ctx.reportScore({ score: total, meta: { level } });
      $('.lc-score').textContent = total;
    }

    // Tanlash va joylashtirish
    const onClick = e => {
      if (done) return;
      const tok = e.target.closest('.lc-tok'), slot = e.target.closest('[data-slot]');
      if (tok) { sel = sel === +tok.dataset.id ? null : +tok.dataset.id; return render(); }
      if (!slot) return;
      const i = +slot.dataset.slot;
      if (sel === null) { slots[i] = null; return render(); }                    // tanlov yoʻq: eshikni inventarga qaytarish
      if (BIN.includes(typeOf(sel)) !== L.tpl.nodes[i].bin) return msg(L.tpl.nodes[i].bin ? 'Bu eshik ikki kirishli: AND, OR yoki XOR kerak.' : 'Bu eshik bir kirishli: NOT yoki WIRE kerak.');
      slots[i] = sel; sel = null; placed++; render();                            // oldingi eshik (bor boʻlsa) inventarga qaytadi
    };
    root.addEventListener('click', onClick);
    $('.lc-reset').addEventListener('click', () => { if (!done) { slots.fill(null); sel = null; render(); } });
    $('.lc-next').addEventListener('click', () => { level++; load(); });
    load();
    return () => root.removeEventListener('click', onClick);   // qayta ochilganda listener ikkilanmasligi uchun
  }

  IQArena.registerGame({
    id: 'logiccircuit', title: 'Eshiklar Zanjiri', icon: '🔌', color: '#19c3a6', kind: 'original', ready: true,
    blurb: 'Natijadan zanjirni tiklang: cheklangan eshiklarni shunday joylangki, chiqish maqsad jadvaliga tengla.',
    skill: 'Bulev mantiqi (AND, OR, XOR, NOT), sabab-oqibat zanjirlari va teskari muhandislik',
    rules: [
      'Zanjirda boʻsh eshik oʻrinlari bor. Pastda — sizga berilgan eshiklar (inventar). Barchasini ishlatish kerak.',
      'Eshikni tanlang, keyin zanjirdagi boʻsh oʻrinni bosing. Ikki kirishli joyga AND/OR/XOR, bir kirishli joyga NOT (inkor) yoki WIRE (oʻtkazgich) qoʻyiladi. Joylangan eshikni bossangiz, inventarga qaytadi.',
      'Jadvalda har bir kirish kombinatsiyasi (A, B, C…) uchun “Maqsad” chiqishi berilgan. “Sizniki” ustuni hammasida mos kelsa, lampochka yonadi.',
      'Kamroq urinish = koʻproq ball. Daraja oshgani sari kirishlar va eshiklar koʻpayadi.'
    ],
    mount
  });
})();
