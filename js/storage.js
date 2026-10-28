/* ===== Reyting xizmati =====
   MUHIM: barcha metodlar Promise qaytaradi. Firebase/Supabase ulashda faqat
   quyidagi `localAdapter` ni almashtirish kifoya — oʻyinlar kodiga tegilmaydi.

   Firebase misoli:   submit → addDoc(collection(db,'scores'), {...})
                      top    → query(..., where('gameId','==',id), orderBy('score','desc'), limit(n))
   Supabase misoli:   submit → supabase.from('scores').insert({...})
                      top    → supabase.from('scores').select().eq('game_id', id).order('score',{ascending:false}).limit(n) */
(function () {
  'use strict';
  const A = window.IQArena = window.IQArena || {};
  const SCORE_KEY = 'iqarena.scores.v1', NAME_KEY = 'iqarena.name';

  // Oʻyinchi: hozircha mehmon. Auth ulanganda id/name shu yerdan olinadi.
  A.player = {
    id: 'guest',
    get name() { try { return localStorage.getItem(NAME_KEY) || 'Mehmon'; } catch (e) { return 'Mehmon'; } },
    setName(n) { try { localStorage.setItem(NAME_KEY, n.trim().slice(0, 20)); } catch (e) {} }
  };

  const read = () => { try { return JSON.parse(localStorage.getItem(SCORE_KEY)) || {}; } catch (e) { return {}; } };
  const write = d => { try { localStorage.setItem(SCORE_KEY, JSON.stringify(d)); } catch (e) {} };

  // Mahalliy (brauzer) adapter
  A.scores = {
    async submit({ gameId, score, meta }) {
      const all = read(), list = all[gameId] || [];
      list.push({ name: A.player.name, score, meta: meta || {}, at: Date.now() });
      list.sort((a, b) => b.score - a.score);          // eng yuqori ball birinchi
      all[gameId] = list.slice(0, 20);                  // faqat 20 ta eng yaxshisini saqlaymiz
      write(all);
    },
    async top(gameId, n = 5) { return (read()[gameId] || []).slice(0, n); }
  };
})();
