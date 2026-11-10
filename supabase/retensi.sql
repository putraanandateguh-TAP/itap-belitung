-- Retensi data sesuai Kebijakan Privasi (berlaku 10 Nov 2026). Idempoten; jalankan di SQL Editor setelah itap-akun.sql.
-- 1) Catatan pesanan disimpan untuk pembukuan: saat akun dihapus, pesanan tidak ikut terhapus,
--    tetapi dilepas dari akun dan nomor WhatsApp + catatan pembeli dikosongkan.
alter table public.shop_orders alter column user_id drop not null;
alter table public.shop_orders drop constraint if exists shop_orders_user_id_fkey;
alter table public.shop_orders add constraint shop_orders_user_id_fkey
  foreign key (user_id) references public.profiles (id) on delete set null;

create or replace function public.shop_orders_anonymize()
returns trigger language plpgsql as $$
begin
  if new.user_id is null and old.user_id is not null then
    new.wa := '';
    new.note := '';
  end if;
  return new;
end;
$$;
drop trigger if exists shop_orders_anonymize on public.shop_orders;
create trigger shop_orders_anonymize before update on public.shop_orders
  for each row execute function public.shop_orders_anonymize();

-- 2) Pembersihan berkala: iklan > 90 hari dan log Asisten (ai_usage) > 30 hari.
--    Foto iklan yang ikut kedaluwarsa dibersihkan admin lewat tombol "Bersihkan foto yatim" (privasi-foto.sql).
create or replace function public.itap_retensi()
returns void language sql security definer set search_path = public as $$
  delete from public.listings where created_at < now() - interval '90 days';
  delete from public.ai_usage where created_at < now() - interval '30 days';
$$;
revoke all on function public.itap_retensi() from public, anon, authenticated;

-- Jadwal harian 03.00 WIB (20.00 UTC) bila ekstensi pg_cron aktif (Database → Extensions → pg_cron).
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'itap-retensi';
    perform cron.schedule('itap-retensi', '0 20 * * *', 'select public.itap_retensi();');
  end if;
end;
$$;
