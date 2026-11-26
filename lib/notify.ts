import { toast } from "sonner";

/**
 * Notifikasi (toast) tipis di atas sonner. Dipisahkan agar mudah diganti dan mudah di-mock di test.
 * Aksi eksplisit (tambah, hapus, simpan, reset) memakai `success`/`error`; ketikan beruntun di isian
 * digabung menjadi satu toast lewat `changed` supaya layar tidak dibanjiri pesan.
 */

const timers = new Map<string, ReturnType<typeof setTimeout>>();
const DEBOUNCE_MS = 700;

export const notify = {
  success: (message: string) => void toast.success(message),
  error: (message: string) => void toast.error(message),
  info: (message: string) => void toast.info(message),
  /** Toast sukses yang digabung: hanya muncul sekali setelah perubahan beruntun berhenti. */
  changed(message: string, id = "data-updated") {
    const pending = timers.get(id);
    if (pending) clearTimeout(pending);
    timers.set(
      id,
      setTimeout(() => {
        timers.delete(id);
        toast.success(message, { id });
      }, DEBOUNCE_MS),
    );
  },
};
