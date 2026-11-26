-- Magic Link: hapus trigger/fungsi warisan non-MicroChain yang menyisipkan ke public.business_profiles
-- (tabel itu tidak ada, sehingga pendaftaran pengguna baru bisa gagal). No-op bila tidak ada.
-- Tidak dianjurkan dikembalikan, jadi tidak ada langkah rollback.
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
