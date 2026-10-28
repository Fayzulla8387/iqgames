/* ===== Tower of Hanoi (klassik) =====
   Qoida: bir vaqtda bitta disk, katta disk kichigining ustiga qoʻyilmaydi.
   "Yechimni koʻrsat" tugmasi rekursiv algoritmni jonli koʻrsatadi. */
(function () {
  'use strict';
  // Rekursiv yechim: n ta diskni a dan b ga (c — yordamchi) koʻchirish
  function solve(n, a, b, c, out) {
    if (n === 0) return;
    solve(n - 1, a, c, b, out);      // 1) n−1 ta diskni yordamchi tayoqqa
    out.push([a, b]);                // 2) eng katta diskni manzilga
    solve(n - 1, c, b, a, out);      // 3) n−1 ta diskni uning ustiga
  }

  function mount(root, ctx) {
    root.innerHTML = `
      <div class="row">
        <label>Disklar soni <select class="hn-n">${[3, 4, 5, 6, 7].map(n => `<option${n === 4 ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
        <button class="btn accent hn-new" type="button">Qaytadan</button>
        <button class="btn ghost hn-solve" type="button">Yechimni koʻrsat</button>
      </div>
      <div class="hud"><span>Yurishlar <b class="hn-moves">0</b></span><span>Optimal <b class="hn-opt"></b></span></div>
      <div class="status hn-status" aria-live="polite"></div>
      <div class="hn-pegs">${[0, 1, 2].map(i => `<div class="hn-peg" data-p="${i}" role="button" aria-label="${i + 1}-tayoq"></div>`).join('')}</div>`;
    const $ = s => root.querySelector(s), pegEls = [...root.querySelectorAll('.hn-peg')], nEl = $('.hn-n'), st = $('.hn-status');
    let n, pegs, sel, moves, auto, timer, helped;

    function reset() {
      clearInterval(timer);
      n = +nEl.value; pegs = [Array.from({ length: n }, (_, i) => n - i), [], []];   // [katta ... kichik]
      sel = -1; moves = 0; auto = false; helped = false;
      $('.hn-opt').textContent = 2 ** n - 1;                                         // optimal yurishlar = 2ⁿ − 1
      st.textContent = 'Tayoqni bosib diskni tanlang, keyin manzil tayoqni bosing.';
      render();
    }
    function render() {
      pegEls.forEach((el, p) => {
        el.className = 'hn-peg' + (sel === p ? ' sel' : '');
        el.innerHTML = pegs[p].map((d, i) => `<div class="hn-disk${sel === p && i === pegs[p].length - 1 ? ' lift' : ''}"
          style="width:${28 + 66 * d / n}%;background:hsl(${d * 360 / (n + 1)} 80% 62%)"></div>`).join('');
      });
      $('.hn-moves').textContent = moves;
    }
    function move(a, b) {
      const top = pegs[a][pegs[a].length - 1];
      if (top === undefined) return false;
      if (pegs[b].length && pegs[b][pegs[b].length - 1] < top) { st.textContent = 'Katta disk kichigining ustiga qoʻyilmaydi!'; return false; }
      pegs[b].push(pegs[a].pop()); moves++;
      if (pegs[2].length === n) {                                                    // hamma disk oxirgi tayoqda
        const opt = 2 ** n - 1;
        st.textContent = moves === opt ? `Mukammal! ${moves} yurish — optimal 🎉` : `Tayyor! ${moves} yurish (optimal ${opt}).`;
        if (!helped) ctx.reportScore({ score: Math.round(n * 100 * opt / moves), meta: { disks: n, moves } });   // optimaldan uzoqlashgan sari ball kamayadi
      }
      return true;
    }
    root.querySelector('.hn-pegs').addEventListener('click', e => {
      const el = e.target.closest('.hn-peg');
      if (!el || auto || pegs[2].length === n) return;
      const p = +el.dataset.p;
      if (sel < 0) { if (pegs[p].length) sel = p; }
      else { if (sel !== p) move(sel, p); sel = -1; }
      render();
    });
    // Avtomatik yechim: boshidan, rekursiv yurishlar roʻyxati boʻyicha
    $('.hn-solve').addEventListener('click', () => {
      reset(); helped = true; auto = true;
      const seq = []; solve(n, 0, 2, 1, seq);
      st.textContent = 'Rekursiya: (n−1) ni chetga, eng kattasini manzilga, (n−1) ni uning ustiga.';
      let i = 0;
      timer = setInterval(() => { if (i >= seq.length) { clearInterval(timer); auto = false; return; } move(...seq[i++]); render(); }, 450);
    });
    $('.hn-new').addEventListener('click', reset);
    nEl.addEventListener('change', reset);
    reset();
    return () => clearInterval(timer);
  }

  IQArena.registerGame({
    id: 'hanoi', title: 'Tower of Hanoi', icon: '🗼', color: '#ffffff', kind: 'classic', ready: true,
    blurb: 'Disklarni uch tayoq orasida eng kam yurishda koʻchiring.',
    skill: 'Rekursiv va algoritmik fikrlash, masalani kichik qismlarga boʻlish',
    rules: [
      'Barcha disklar chap tayoqda. Maqsad: hammasini oʻng tayoqqa koʻchirish.',
      'Bir yurishda faqat eng yuqoridagi bitta disk koʻchiriladi: tayoqni bosing, keyin manzilni bosing.',
      'Katta disk hech qachon kichik disk ustiga qoʻyilmaydi.',
      'n ta disk uchun eng kam yurish 2ⁿ−1. Optimalga yaqin yechim = koʻproq ball. «Yechimni koʻrsat» ishlatilsa ball yozilmaydi.'
    ],
    mount
  });
})();
