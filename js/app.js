/* ===== Yadro: roʻyxatga olish, marshrutlash, interfeys =====
   Har bir oʻyin moduli quyidagi shartnomaga amal qiladi:
   IQArena.registerGame({
     id, title, icon, color, kind: 'classic' | 'original', ready: true|false,
     blurb,   // kartadagi qisqa taʼrif
     skill,   // qaysi qobiliyatni rivojlantiradi
     rules,   // qoidalar massivi (matn)
     mount(root, ctx) -> cleanup   // root: oʻyin sahnasi, ctx.reportScore({score, meta})
   }) */
(function () {
  'use strict';
  const A = window.IQArena = window.IQArena || {};
  const ORDER = ['connect4', 'blockade', 'hanoi', 'netarchitect', 'logiccircuit', 'gravitygrid'];
  const games = {};
  let cleanup = null;                                   // oldingi oʻyinni tozalash funksiyasi
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  A.registerGame = def => { games[def.id] = def; };

  // Bosh sahifa: kartalarni chizish (tartib ORDER bilan belgilanadi)
  function renderHome() {
    $('#grid').innerHTML = ORDER.filter(id => games[id]).map(id => {
      const g = games[id];
      return `<a class="card ${g.kind}${g.ready ? '' : ' soon'}" style="--c:${g.color}" href="#/${id}">
        <span class="icon">${g.icon}</span><h3>${g.title}</h3><p>${g.blurb}</p>
        <span class="tag">${g.kind === 'original' ? 'Original' : 'Klassik'}</span>${g.ready ? '' : '<span class="tag off">Tez orada</span>'}
      </a>`;
    }).join('');
  }

  // Reyting jadvali (storage.js orqali — keyin Firebase/Supabase boʻladi)
  async function renderBoard(id) {
    const top = await A.scores.top(id, 5);
    $('#g-board').innerHTML = top.length
      ? top.map(r => `<li><span>${esc(r.name)}</span><b>${r.score}</b></li>`).join('')
      : '<li class="empty">Hali natija yoʻq. Birinchi boʻling!</li>';
  }

  function openGame(g) {
    $('#g-title').textContent = `${g.icon} ${g.title}`;
    $('#g-skill').textContent = g.skill;
    $('#g-rules').innerHTML = g.rules.map(r => `<li>${r}</li>`).join('');
    const stage = $('#stage');
    stage.innerHTML = '';
    // ctx — oʻyin faqat shu orqali tashqi dunyo (reyting) bilan gaplashadi
    const ctx = { reportScore: async p => { await A.scores.submit({ gameId: g.id, ...p }); renderBoard(g.id); } };
    cleanup = g.mount(stage, ctx) || null;
    renderBoard(g.id);
  }

  // Hash marshrutlash: #/connect4, #/netarchitect ...
  function route() {
    if (cleanup) { cleanup(); cleanup = null; }          // oldingi oʻyin taymer/listenerlarini oʻchirish
    const g = games[location.hash.replace('#/', '')];
    const show = !!(g && g.ready);
    $('#home').hidden = show;
    $('#game').hidden = !show;
    show ? openGame(g) : renderHome();
  }

  // Oʻyinchi ismini oʻzgartirish (Auth ulanguncha vaqtincha prompt)
  function renderPlayer() { $('#player-btn').textContent = '👤 ' + A.player.name; }
  document.addEventListener('DOMContentLoaded', () => {
    renderPlayer();
    $('#player-btn').addEventListener('click', () => {
      const n = prompt('Ismingiz:', A.player.name);
      if (n && n.trim()) { A.player.setName(n); renderPlayer(); }
    });
    window.addEventListener('hashchange', route);
    route();
  });
})();
