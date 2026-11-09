(function () {
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let sb = null;
  const msg = (t) => { document.getElementById('msg').textContent = t; };
  async function client() {
    const cfg = window.ITAP_CONFIG || {};
    const lib = await import('https://esm.sh/@supabase/supabase-js@2.119.0');
    sb = lib.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    return sb;
  }
  document.getElementById('login').onsubmit = async (e) => {
    e.preventDefault();
    await client();
    const email = new FormData(e.target).get('email');
    const res = await sb.auth.signInWithOtp({ email: String(email), options: { emailRedirectTo: location.href } });
    msg(res.error ? 'Tautan belum terkirim.' : 'Tautan masuk dikirim. Buka dari HP ini.');
  };
  function slugify(text) {
    const base = String(text || 'acara').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'acara';
    return base + '-' + Math.random().toString(36).slice(2, 6);
  }
  async function draw() {
    const session = await sb.auth.getSession();
    const user = session.data.session && session.data.session.user;
    if (!user) return;
    const profile = await sb.from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (!profile.data || profile.data.role !== 'admin') { msg('Akun ini bukan admin.'); return; }
    document.getElementById('gate').hidden = true;
    document.getElementById('board').hidden = false;
    const orders = await sb.from('invitation_orders').select('*').order('created_at', { ascending: false }).limit(40);
    document.getElementById('orders').innerHTML = '<table><tr><th>Waktu</th><th>Acara</th><th>Tema</th><th>WA</th><th></th></tr>' + (orders.data || []).map((o) => '<tr><td>' + esc(new Date(o.created_at).toLocaleString('id-ID')) + '</td><td>' + esc(o.event_type) + '<br>' + esc(o.payload && o.payload.names) + '</td><td>' + esc(o.theme) + ' · ' + esc(o.package) + '</td><td>' + esc(o.contact_wa) + '</td><td><button type="button" data-draft="' + esc(o.id) + '">Buat draf</button></td></tr>').join('') + '</table>';
    const inv = await sb.from('invitations').select('id,slug,theme,status,package,owner_email,edit_token_hash').order('created_at', { ascending: false }).limit(40);
    document.getElementById('invites').innerHTML = (inv.data || []).map((row) => '<article class="card" data-id="' + esc(row.id) + '"><b>' + esc(row.slug) + '</b><p class="note">' + esc(row.status) + ' · ' + esc(row.package) + (row.edit_token_hash ? ' · ada tautan sunting' : '') + '</p><label>Email pembeli<input data-email value="' + esc(row.owner_email || '') + '" type="email"></label><p><button type="button" data-mail="' + esc(row.id) + '">Simpan email</button> ' + (row.status === 'active' ? '' : '<button type="button" data-on="' + esc(row.id) + '">Aktifkan</button> ') + '<button type="button" data-link="' + esc(row.id) + '" data-slug="' + esc(row.slug) + '">Buat tautan sunting</button> <button type="button" data-revoke="' + esc(row.id) + '">Cabut tautan</button> <button type="button" data-see="' + esc(row.id) + '">Lihat RSVP</button></p></article>').join('') || '<p>Belum ada undangan.</p>';
    document.getElementById('orders').onclick = async (ev) => {
      const id = ev.target && ev.target.dataset && ev.target.dataset.draft;
      if (!id) return;
      const order = (orders.data || []).find((o) => o.id === id);
      if (!order) return;
      const data = {
        title: (order.payload && order.payload.names) || order.event_type,
        kicker: order.event_type,
        inviteLine: 'Mengundang',
        dateLabel: (order.payload && order.payload.date) || '',
        hosts: [{ role: 'Tuan rumah', name: (order.payload && order.payload.names) || '', detail: '' }],
        countdownTo: (order.payload && order.payload.date) ? order.payload.date + 'T09:00:00+07:00' : '',
        events: [{ name: order.event_type, start: '', end: '', timeLabel: '', place: (order.payload && order.payload.venue) || '', address: '', maps: (order.payload && order.payload.maps) || '' }],
        story: [], gallery: [], streamUrl: '', gift: { bank: '', number: '', holder: '', qris: '' }, closing: ''
      };
      const ins = await sb.from('invitations').insert({ slug: slugify(order.payload && order.payload.names), theme: order.theme, package: order.package, data, status: 'draft' });
      msg(ins.error ? 'Draf belum terbuat.' : 'Draf tersimpan. Aktifkan setelah lunas.');
      if (!ins.error) draw();
    };
    document.getElementById('invites').onclick = async (ev) => {
      const t = ev.target;
      if (!t || !t.dataset) return;
      if (t.dataset.on) {
        const upd = await sb.from('invitations').update({ status: 'active' }).eq('id', t.dataset.on);
        msg(upd.error ? 'Belum aktif. Hanya admin yang bisa mengaktifkan.' : 'Undangan aktif.');
        if (!upd.error) draw();
      }
      if (t.dataset.mail) {
        const input = t.closest('article').querySelector('[data-email]');
        const email = String(input.value || '').trim().toLowerCase();
        const upd = await sb.from('invitations').update({ owner_email: email || null }).eq('id', t.dataset.mail);
        msg(upd.error ? 'Email belum tersimpan.' : 'Pembeli ditautkan. Minta dia masuk di halaman sunting.');
      }
      if (t.dataset.revoke) {
        const upd = await sb.from('invitations').update({ edit_token_hash: null }).eq('id', t.dataset.revoke);
        msg(upd.error ? 'Tautan belum tercabut.' : 'Tautan sunting dicabut.');
        if (!upd.error) draw();
      }
      if (t.dataset.link) {
        const raw = new Uint8Array(32);
        crypto.getRandomValues(raw);
        const token = btoa(String.fromCharCode.apply(null, raw)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
        const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
        const hash = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
        const upd = await sb.from('invitations').update({ edit_token_hash: hash }).eq('id', t.dataset.link);
        if (upd.error) { msg('Tautan belum terbuat.'); return; }
        const box = document.getElementById('linkbox');
        box.hidden = false;
        box.textContent = '';
        const p = document.createElement('p');
        p.textContent = 'Salin sekarang. Tautan ini tidak disimpan di server, hanya hash-nya.';
        const code = document.createElement('p');
        const link = location.origin + '/undangan/sunting/?s=' + t.dataset.slug + '&k=' + token;
        code.textContent = link;
        box.append(p, code);
        msg('Tautan sunting siap.');
      }
      if (t.dataset.see) {
        const rsvps = await sb.from('invitation_rsvps').select('guest_name,attendance,guests').eq('invitation_id', t.dataset.see);
        const wishes = await sb.from('invitation_wishes').select('guest_name,message').eq('invitation_id', t.dataset.see);
        const box = document.getElementById('guests');
        box.textContent = '';
        const title = document.createElement('h3');
        title.textContent = 'Tamu';
        box.append(title);
        (rsvps.data || []).forEach((r) => { const p = document.createElement('p'); p.textContent = r.guest_name + ' · ' + r.attendance + ' · ' + r.guests; box.append(p); });
        (wishes.data || []).forEach((w) => { const p = document.createElement('p'); p.textContent = w.guest_name + ': ' + w.message; box.append(p); });
        if (!(rsvps.data || []).length && !(wishes.data || []).length) { const p = document.createElement('p'); p.textContent = 'Belum ada RSVP atau ucapan.'; box.append(p); }
      }
    };
  }
  client().then(() => { if (sb) sb.auth.onAuthStateChange(() => draw()); draw(); });
})();
