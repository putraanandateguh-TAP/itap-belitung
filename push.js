// Peringatan cuaca & gempa lewat Web Push. Langganan disimpan di Supabase (supabase/push.sql).
(function () {
  var cfg = window.ITAP_CONFIG || {}, key = cfg.VAPID_PUBLIC_KEY, base = String(cfg.SUPABASE_URL || '').replace(/\/$/, '');
  var btn = document.getElementById('push-btn'), msg = document.getElementById('push-msg');
  if (!btn || !key || !base || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return;
  function say(t) { if (msg) msg.textContent = t || ''; }
  function label(on) { btn.dataset.on = on ? '1' : ''; btn.textContent = on ? 'Matikan peringatan cuaca & gempa' : 'Aktifkan peringatan cuaca & gempa'; }
  function toKey(s) { var p = '='.repeat((4 - s.length % 4) % 4), r = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(r, function (c) { return c.charCodeAt(0); }); }
  btn.hidden = false;
  navigator.serviceWorker.ready.then(function (reg) { return reg.pushManager.getSubscription(); }).then(function (s) { label(!!s); }).catch(function () { label(false); });
  btn.addEventListener('click', function () {
    btn.disabled = true; say('');
    navigator.serviceWorker.ready.then(function (reg) {
      return reg.pushManager.getSubscription().then(function (sub) {
        if (sub) return sub.unsubscribe().then(function () { label(false); say('Peringatan dimatikan.'); });
        return Notification.requestPermission().then(function (p) {
          if (p !== 'granted') { say('Izin notifikasi ditolak. Ubah di pengaturan browser.'); return; }
          return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(key) }).then(function (s) {
            var j = s.toJSON();
            return fetch(base + '/rest/v1/push_subscriptions?on_conflict=endpoint', {
              method: 'POST',
              headers: { apikey: cfg.SUPABASE_ANON_KEY, 'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates,return=minimal' },
              body: JSON.stringify({ endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth })
            }).then(function (r) { if (!r.ok) throw new Error('simpan'); label(true); say('Aktif. Kamu akan dapat peringatan cuaca ekstrem, gelombang tinggi, dan gempa dekat Belitung.'); });
          });
        });
      });
    }).catch(function () { say('Gagal mengaktifkan. iPhone: pasang dulu ke Layar Utama (iOS 16.4+).'); }).then(function () { btn.disabled = false; });
  });
})();
