(function () {
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let sb = null;
  const params = new URLSearchParams(location.search);
  const slug = params.get('s') || '';
  const key = params.get('k') || '';
  const msg = (t) => { const n = document.getElementById('msg'); if (n) n.textContent = t; };
  async function client() {
    if (sb) return sb;
    const cfg = window.ITAP_CONFIG || {};
    const lib = await import('https://esm.sh/@supabase/supabase-js@2.119.0');
    sb = lib.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    return sb;
  }
  function formHtml(row) {
    const data = row.data || {};
    const gift = data.gift || {};
    return '<form id="edit" class="card"><h2>' + esc(row.slug) + '</h2><p class="note">' + esc(row.status) + ' · ' + esc(row.package) + '</p>'
      + '<label>Judul<input name="title" value="' + esc(data.title || '') + '"></label>'
      + '<label>Tanggal tampilan<input name="dateLabel" value="' + esc(data.dateLabel || '') + '"></label>'
      + '<label>Tautan musik bebas royalti<input name="musicUrl" value="' + esc(data.musicUrl || '') + '"></label>'
      + '<label>Bank<input name="bank" value="' + esc(gift.bank || '') + '"></label>'
      + '<label>Nomor<input name="number" value="' + esc(gift.number || '') + '"></label>'
      + '<label>Atas nama<input name="holder" value="' + esc(gift.holder || '') + '"></label>'
      + '<button class="cta" type="submit">Simpan</button></form><h2>RSVP</h2><div id="rsvps"></div><h2>Ucapan</h2><div id="wishes"></div>';
  }
  function paintGuests(boxR, boxW, rsvps, wishes) {
    boxR.innerHTML = (rsvps || []).map((r) => '<p>' + esc(r.guest_name) + ' · ' + esc(r.attendance) + ' · ' + esc(r.guests) + '</p>').join('') || '<p class="note">Belum ada.</p>';
    boxW.innerHTML = (wishes || []).map((w) => '<p><b>' + esc(w.guest_name) + '</b><br>' + esc(w.message) + '</p>').join('') || '<p class="note">Belum ada.</p>';
  }
  async function tokenMode() {
    await client();
    const opened = await sb.rpc('invitation_manage', { p_slug: slug, p_token: key });
    const row = opened.data;
    if (!row) { msg('Tautan sunting tidak berlaku atau sudah dicabut.'); return; }
    document.getElementById('gate').hidden = true;
    const board = document.getElementById('board');
    board.hidden = false;
    board.innerHTML = formHtml(row);
    const guests = await sb.rpc('invitation_guests', { p_slug: slug, p_token: key });
    paintGuests(document.getElementById('rsvps'), document.getElementById('wishes'), guests.data && guests.data.rsvps, guests.data && guests.data.wishes);
    document.getElementById('edit').onsubmit = async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const next = Object.assign({}, row.data || {}, {
        title: String(f.get('title') || ''),
        dateLabel: String(f.get('dateLabel') || ''),
        musicUrl: String(f.get('musicUrl') || ''),
        gift: { bank: String(f.get('bank') || ''), number: String(f.get('number') || ''), holder: String(f.get('holder') || ''), qris: (row.data && row.data.gift && row.data.gift.qris) || '' }
      });
      const saved = await sb.rpc('invitation_save_token', { p_slug: slug, p_token: key, p_data: next });
      msg(saved.data ? 'Tersimpan.' : 'Belum tersimpan.');
    };
  }
  document.getElementById('login').onsubmit = async (e) => {
    e.preventDefault();
    await client();
    const res = await sb.auth.signInWithOtp({ email: String(new FormData(e.target).get('email')), options: { emailRedirectTo: location.href } });
    msg(res.error ? 'Tautan belum terkirim.' : 'Tautan dikirim. Buka dari perangkat ini.');
  };
  async function draw() {
    const session = await sb.auth.getSession();
    const user = session.data.session && session.data.session.user;
    if (!user) return;
    document.getElementById('gate').hidden = true;
    const board = document.getElementById('board');
    board.hidden = false;
    const list = await sb.from('invitations').select('id,slug,theme,package,data,status,owner_id,owner_email');
    const email = (user.email || '').toLowerCase();
    const rows = (list.data || []).filter((row) => row.owner_id === user.id || (row.owner_email || '').toLowerCase() === email);
    if (!rows.length) { board.innerHTML = '<p>Belum ada undangan untuk email ini. Minta admin iTAP menautkan email kamu.</p>'; return; }
    const current = rows[0];
    if (!current.owner_id) await sb.from('invitations').update({ owner_id: user.id }).eq('id', current.id);
    board.innerHTML = formHtml(current);
    document.getElementById('edit').onsubmit = async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const data = Object.assign({}, current.data || {}, {
        title: String(f.get('title') || ''),
        dateLabel: String(f.get('dateLabel') || ''),
        musicUrl: String(f.get('musicUrl') || ''),
        gift: { bank: String(f.get('bank') || ''), number: String(f.get('number') || ''), holder: String(f.get('holder') || ''), qris: (current.data && current.data.gift && current.data.gift.qris) || '' }
      });
      const upd = await sb.from('invitations').update({ data }).eq('id', current.id);
      msg(upd.error ? 'Belum tersimpan.' : 'Tersimpan.');
    };
    const rsvps = await sb.from('invitation_rsvps').select('guest_name,attendance,guests').eq('invitation_id', current.id);
    const wishes = await sb.from('invitation_wishes').select('guest_name,message').eq('invitation_id', current.id);
    paintGuests(document.getElementById('rsvps'), document.getElementById('wishes'), rsvps.data, wishes.data);
  }
  client().then(() => {
    if (slug && key) { tokenMode(); return; }
    sb.auth.onAuthStateChange(() => draw());
    draw();
  });
})();
