import { redirect } from "next/navigation";

/** Alamat lama mode tamu; ruang demo sekarang di /dashboard. */
export default function DemoIndex() {
  redirect("/dashboard");
}
