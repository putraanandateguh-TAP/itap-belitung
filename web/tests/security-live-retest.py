#!/usr/bin/env python3
"""Uji ulang LIVE pasca-perbaikan keamanan (migrasi 0007/0008/0009).

JALANKAN HANYA SETELAH migrasi 0007 + 0008 + 0009 diterapkan via SQL Editor
dan Edge Function delete-account versi SEC-11 di-redeploy:
  python3 web/tests/security-live-retest.py

Membaca kunci dari web/.env.local (TIDAK PERNAH mencetak nilainya).
Membuat akun uji sementara, memainkan ulang SEMUA skenario eksploitasi
SEC-01..SEC-17 (harus DITOLAK) + alur sah (harus LOLOS), lalu membersihkan
semua akun uji. Keluar 0 bila semua cek lolos; 1 bila ada yang gagal.

Catatan:
- SEC-11 jalur gagal Storage (500 saat list/remove error) TIDAK bisa diuji
  live tanpa mensimulasikan outage Storage — yang diuji di sini adalah
  jalur bahagia (foto ikut terhapus saat akun dihapus). Jalur gagal
  terverifikasi lewat code review + log error di kode.
- SEC-06/SEC-09/LIC-01 tidak ada di sini (butuh P2 / keputusan pemilik).
  Uji live lisensi ada di web/docs/LICENSE-LIVE-TESTS.md.
"""
import base64
import json
import os
import secrets
import sys
import urllib.error
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
# .env.local tidak ada di worktree (gitignored) — pakai salinan site/ bila perlu.
# Skrip hanya MEMBACA kunci; tidak pernah mencetak atau menyimpannya.
for _cand in (os.path.join(HERE, "..", ".env.local"),
              os.path.expanduser("~/workspace/itap-belitung-app/site/web/.env.local")):
    if os.path.exists(_cand):
        ENV_PATH = _cand
        break
else:
    raise SystemExit("Tidak menemukan .env.local (worktree web/ maupun site/web/).")


def env(k):
    for line in open(ENV_PATH):
        if line.startswith(k + "="):
            return line.strip()[len(k) + 1:]
    raise KeyError(k)


URL = env("NEXT_PUBLIC_SUPABASE_URL")
ANON = env("NEXT_PUBLIC_SUPABASE_ANON_KEY")
SRV = env("SUPABASE_SERVICE_ROLE_KEY")

PASS = 0
FAIL = 0
FAILURES = []


def check(name, ok, detail=""):
    global PASS, FAIL
    if ok:
        PASS += 1
        print(f"PASS  {name}")
    else:
        FAIL += 1
        FAILURES.append(name)
        print(f"FAIL  {name} — {detail}")


def req(method, path, key, body=None, token=None, raw=None, ctype="application/json"):
    h = {"apikey": key, "Authorization": f"Bearer {token or key}"}
    data = raw
    if body is not None:
        h["Content-Type"] = "application/json"
        h["Prefer"] = "return=representation"
        data = json.dumps(body).encode()
    elif raw is not None:
        h["Content-Type"] = ctype
    r = urllib.request.Request(URL + path, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(r) as resp:
            b = resp.read()
            try:
                return resp.status, json.loads(b or b"null")
            except Exception:
                return resp.status, b
    except urllib.error.HTTPError as e:
        b = e.read()
        try:
            return e.code, json.loads(b or b"null")
        except Exception:
            return e.code, b


def mkuser(tag):
    pw = secrets.token_urlsafe(16)
    em = f"sec-retest-{tag}-{secrets.token_hex(3)}@itap.local"
    st, b = req("POST", "/auth/v1/admin/users", SRV,
                {"email": em, "password": pw, "email_confirm": True})
    assert st in (200, 201), (st, b)
    return b["id"], em, pw


def signin(em, pw):
    st, b = req("POST", "/auth/v1/token?grant_type=password", ANON,
                {"email": em, "password": pw})
    assert st == 200, (st, b)
    return b["access_token"]


def deluser(uid):
    req("DELETE", f"/auth/v1/admin/users/{uid}", SRV)


# PNG 1x1 transparan (untuk uji upload sah SEC-12 / foto SEC-11).
PNG_1X1 = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAwMCAO+ip1sAAAAASUVORK5CYII=")


def main():
    users = []
    try:
        # --- Setup pengguna uji ---
        idd, emd, pwd = mkuser("d")
        idf, emf, pwf = mkuser("f")
        ida, ema, pwa = mkuser("a")
        idb, emb, pwb = mkuser("b")
        ide, eme, pwe = mkuser("e")
        users = [idd, idf, ida, idb, ide]
        td, tf, ta, tb, te = (signin(e, p) for e, p in
                              [(emd, pwd), (emf, pwf), (ema, pwa), (emb, pwb), (eme, pwe)])
        # Profil: D reader, F reader, A/B reader, E admin_portal (via service_role).
        for uid, em in [(idd, emd), (idf, emf), (ida, ema), (idb, emb)]:
            st, _ = req("POST", "/rest/v1/profiles?on_conflict=id", SRV,
                        {"id": uid, "email": em, "display_name": "uji", "role": "reader"})
            assert st in (200, 201), (st, _)
        st, _ = req("POST", "/rest/v1/profiles?on_conflict=id", SRV,
                    {"id": ide, "email": eme, "display_name": "uji", "role": "admin_portal"})
        assert st in (200, 201), (st, _)

        # --- SEC-01: INSERT profil role=superadmin sebagai pengguna baru ---
        idn, emn, pwn = mkuser("n")
        users.append(idn)
        tn = signin(emn, pwn)
        st, b = req("POST", "/rest/v1/profiles", ANON,
                    {"id": idn, "email": emn, "display_name": "N", "role": "superadmin"}, token=tn)
        st2, b2 = req("GET", f"/rest/v1/profiles?select=role&id=eq.{idn}", SRV)
        check("SEC-01 insert superadmin -> tersimpan reader (bukan superadmin)",
              st in (200, 201) and isinstance(b2, list) and b2 and b2[0].get("role") == "reader",
              f"status={st} role={b2}")

        # --- SEC-02: admin_portal UPDATE role sendiri ---
        st, _ = req("PATCH", f"/rest/v1/profiles?id=eq.{ide}", ANON, {"role": "superadmin"}, token=te)
        st2, b2 = req("GET", f"/rest/v1/profiles?select=role&id=eq.{ide}", SRV)
        check("SEC-02 admin_portal promosi diri -> DITOLAK (role tetap admin_portal)",
              isinstance(b2, list) and b2 and b2[0].get("role") == "admin_portal",
              f"patch={st} role={b2}")
        st, _ = req("PATCH", f"/rest/v1/profiles?id=eq.{idd}", ANON, {"role": "contributor"}, token=te)
        st2, b2 = req("GET", f"/rest/v1/profiles?select=role&id=eq.{idd}", SRV)
        check("SEC-02 admin_portal ubah role orang lain ke contributor -> diizinkan",
              isinstance(b2, list) and b2 and b2[0].get("role") == "contributor",
              f"patch={st} role={b2}")
        st, _ = req("PATCH", f"/rest/v1/profiles?id=eq.{idd}", ANON, {"role": "superadmin"}, token=te)
        st2, b2 = req("GET", f"/rest/v1/profiles?select=role&id=eq.{idd}", SRV)
        check("SEC-02 admin_portal tetapkan superadmin ke orang lain -> DITOLAK",
              isinstance(b2, list) and b2 and b2[0].get("role") == "contributor",
              f"patch={st} role={b2}")

        # --- SEC-05: whatsapp_verified_at sendiri ---
        st, _ = req("PATCH", f"/rest/v1/profiles?id=eq.{idf}", ANON,
                    {"whatsapp_verified_at": "2026-11-18T00:00:00Z"}, token=tf)
        st2, b2 = req("GET", f"/rest/v1/profiles?select=whatsapp_verified_at&id=eq.{idf}", SRV)
        check("SEC-05 isi whatsapp_verified_at sendiri -> DITOLAK (tetap null)",
              isinstance(b2, list) and b2 and b2[0].get("whatsapp_verified_at") is None,
              f"patch={st} val={b2}")

        # --- SEC-03 / SEC-14: RPC publik ---
        st, _ = req("POST", "/rest/v1/rpc/award_contribution_point", ANON,
                    {"p_user_id": idf, "p_source_type": "article", "p_source_id": "00000000-0000-0000-0000-000000000000"})
        check("SEC-03 RPC award sebagai anon -> DITOLAK", st in (401, 403, 404), f"status={st}")
        st, _ = req("POST", "/rest/v1/rpc/award_contribution_point", ANON,
                    {"p_user_id": idf, "p_source_type": "article", "p_source_id": "00000000-0000-0000-0000-000000000000"}, token=tf)
        check("SEC-03 RPC award sebagai user -> DITOLAK", st in (401, 403, 404), f"status={st}")
        st, _ = req("POST", "/rest/v1/rpc/increment_article_views", ANON,
                    {"p_article_id": "00000000-0000-0000-0000-000000000000"})
        check("SEC-14 RPC views sebagai anon -> DITOLAK", st in (401, 403, 404), f"status={st}")

        # --- SEC-04: contributor_profiles ---
        st, b = req("POST", "/rest/v1/contributor_profiles", ANON,
                    {"user_id": idf, "verification_status": "verified",
                     "auto_approve": True, "points_total": 9999}, token=tf)
        check("SEC-04 insert verified/poin 9999 -> dipaksa default",
              st in (200, 201) and isinstance(b, list) and b and
              b[0].get("verification_status") == "unverified" and
              b[0].get("auto_approve") is False and b[0].get("points_total") == 0,
              f"status={st} body={b}")
        st, _ = req("PATCH", f"/rest/v1/contributor_profiles?user_id=eq.{idf}", ANON,
                    {"points_total": 9999}, token=tf)
        st2, b2 = req("GET", f"/rest/v1/contributor_profiles?select=points_total&user_id=eq.{idf}", SRV)
        check("SEC-04 update points_total sendiri -> DITOLAK (tetap 0)",
              isinstance(b2, list) and b2 and b2[0].get("points_total") == 0,
              f"patch={st} val={b2}")

        # --- SEC-07 / SEC-08 ---
        st, _ = req("POST", "/rest/v1/info_submissions", ANON,
                    {"user_id": idf, "text": "uji", "status": "approved"}, token=tf)
        check("SEC-07 insert info approved -> DITOLAK", st in (400, 401, 403), f"status={st}")
        st, _ = req("POST", "/rest/v1/info_submissions", ANON,
                    {"user_id": idf, "text": "uji", "status": "pending"}, token=tf)
        check("SEC-07 insert info pending -> diizinkan", st in (200, 201), f"status={st}")
        st, _ = req("POST", "/rest/v1/reports", ANON,
                    {"reporter_id": idf, "target_type": "listing",
                     "target_id": "00000000-0000-0000-0000-000000000000",
                     "reason": "spam", "status": "dismissed", "moderator_note": "palsu"}, token=tf)
        check("SEC-08 insert laporan dismissed+note -> DITOLAK", st in (400, 401, 403), f"status={st}")
        st, _ = req("POST", "/rest/v1/reports", ANON,
                    {"reporter_id": idf, "target_type": "listing",
                     "target_id": "00000000-0000-0000-0000-000000000000",
                     "reason": "spam"}, token=tf)
        check("SEC-08 insert laporan biasa -> status open", st in (200, 201), f"status={st}")

        # --- SEC-10: thread seller palsu (butuh listing milik A) ---
        st, lst = req("POST", "/rest/v1/listings", SRV,
                      {"seller_id": ida, "title": "Uji SEC-10", "price_cents": 1000, "status": "aktif"})
        listing_id = lst[0]["id"] if isinstance(lst, list) and lst else None
        assert listing_id, lst
        st, _ = req("POST", "/rest/v1/chat_threads", ANON,
                    {"listing_id": listing_id, "buyer_id": idb, "seller_id": idf}, token=tb)
        check("SEC-10 thread seller palsu -> DITOLAK", st in (400, 401, 403), f"status={st}")
        st, _ = req("POST", "/rest/v1/chat_threads", ANON,
                    {"listing_id": listing_id, "buyer_id": idb, "seller_id": ida}, token=tb)
        check("SEC-10 thread seller benar -> diizinkan", st in (200, 201), f"status={st}")

        # --- SEC-15 / SEC-16 ---
        st, arts = req("GET", "/rest/v1/articles?select=id,author_id&limit=1", SRV)
        art = arts[0] if isinstance(arts, list) and arts else None
        if art:
            st, _ = req("POST", "/rest/v1/article_revisions", ANON,
                        {"article_id": art["id"], "editor_id": idb, "changes": {}}, token=tb)
            check("SEC-15 revisi artikel orang lain -> DITOLAK", st in (400, 401, 403), f"status={st}")
        st, _ = req("PATCH", f"/rest/v1/listings?id=eq.{listing_id}", ANON, {"views": 999}, token=ta)
        st2, b2 = req("GET", f"/rest/v1/listings?select=views&id=eq.{listing_id}", SRV)
        check("SEC-16 penjual ubah views sendiri -> DITOLAK (tetap 0)",
              isinstance(b2, list) and b2 and b2[0].get("views") == 0,
              f"patch={st} val={b2}")

        # --- SEC-12: upload Storage ---
        st, _ = req("POST", f"/storage/v1/object/listing-photos/{idf}/uji.html", ANON,
                    raw=b"<script>alert(1)</script>", ctype="text/html", token=tf)
        check("SEC-12 upload .html -> DITOLAK", st in (400, 401, 403), f"status={st}")
        st, _ = req("POST", f"/storage/v1/object/listing-photos/{idf}/uji.png", ANON,
                    raw=PNG_1X1, ctype="image/png", token=tf)
        check("SEC-12 upload PNG sah -> diizinkan", st in (200, 201), f"status={st}")
        st, _ = req("GET", f"/storage/v1/object/public/listing-photos/{idf}/uji.png", ANON)
        check("SEC-12 PNG sah bisa dibuka publik", st == 200, f"status={st}")
        req("DELETE", f"/storage/v1/object/listing-photos/{idf}/uji.png", ANON, token=tf)

        # --- SEC-11 (jalur bahagia): foto ikut terhapus saat akun dihapus ---
        idg, emg, pwg = mkuser("g")
        users.append(idg)
        tg = signin(emg, pwg)
        req("POST", "/rest/v1/profiles?on_conflict=id", SRV,
            {"id": idg, "email": emg, "display_name": "uji", "role": "reader"})
        for bucket in ("article-images", "listing-photos"):
            st, _ = req("POST", f"/storage/v1/object/{bucket}/{idg}/foto.png", ANON,
                        raw=PNG_1X1, ctype="image/png", token=tg)
            assert st in (200, 201), (bucket, st, _)
        st, b = req("POST", "/functions/v1/delete-account", ANON, {}, token=tg)
        check("SEC-11 hapus akun pemilik foto -> 200 ok", st == 200 and isinstance(b, dict) and b.get("ok") is True,
              f"status={st} body={b}")
        gone = True
        for bucket in ("article-images", "listing-photos"):
            st, _ = req("GET", f"/storage/v1/object/public/{bucket}/{idg}/foto.png", ANON)
            gone = gone and st == 404
        check("SEC-11 foto tidak lagi bisa dibuka publik setelah hapus akun", gone)
        users.remove(idg)

        # --- Regresi RLS dua pengguna + anon ---
        st, _ = req("POST", "/rest/v1/articles", ANON,
                    {"author_id": idf, "channel": "wisata", "slug": f"uji-{secrets.token_hex(3)}",
                     "title_id": "Draf", "body_id": "Isi", "status": "draft"}, token=tf)
        check("REGRESI user bisa buat draf sendiri", st in (200, 201), f"status={st}")
        st, b = req("GET", f"/rest/v1/profiles?select=id&id=eq.{idf}", ANON, token=tb)
        check("REGRESI user lain tidak melihat profil", isinstance(b, list) and len(b) == 0, f"body={b}")
        st, b = req("GET", "/rest/v1/articles?select=id&limit=1", ANON)
        check("REGRESI anon baca artikel publik 200", st == 200, f"status={st}")
        st, b = req("GET", "/rest/v1/profiles?select=id&limit=1", ANON)
        check("REGRESI anon baca profiles -> 401", st == 401, f"status={st}")
        st, _ = req("POST", "/rest/v1/articles", ANON,
                    {"author_id": idf, "channel": "wisata", "slug": "x", "title_id": "T",
                     "body_id": "B", "status": "draft"})
        check("REGRESI anon INSERT articles -> 401", st == 401, f"status={st}")
    finally:
        for uid in users:
            try:
                deluser(uid)
            except Exception:
                pass
        st, b = req("GET", "/auth/v1/admin/users?per_page=50", SRV)
        n = len(b.get("users", [])) if isinstance(b, dict) else -1
        check("CLEANUP hanya admin tersisa", n == 1, f"users={n}")
        st, b = req("GET", "/rest/v1/articles?select=id", SRV)
        check("CLEANUP artikel seed utuh (54)", isinstance(b, list) and len(b) == 54, f"n={len(b) if isinstance(b, list) else b}")

    print(f"\n{PASS} PASS, {FAIL} FAIL")
    if FAILURES:
        print("Gagal:", ", ".join(FAILURES))
    sys.exit(1 if FAIL else 0)


if __name__ == "__main__":
    main()
