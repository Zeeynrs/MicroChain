// Menerapkan berkas supabase/migrations/*.sql berurutan lewat Supabase Management API.
// Pemakaian: SUPABASE_PROJECT_REF=... SUPABASE_ACCESS_TOKEN=sbp_... node scripts/apply-migrations.mjs
// Token tidak pernah ditulis ke disk. Semua migrasi bersifat idempoten.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const ref = process.env.SUPABASE_PROJECT_REF;
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!ref || !token) {
  console.error("Set SUPABASE_PROJECT_REF dan SUPABASE_ACCESS_TOKEN.");
  process.exit(1);
}

const dir = path.join(process.cwd(), "supabase", "migrations");
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

for (const file of files) {
  const query = readFileSync(path.join(dir, file), "utf8");
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  console.log(`${res.ok ? "OK  " : "GAGAL"} ${file} (${res.status})`);
  if (!res.ok) {
    console.error(text);
    process.exit(1);
  }
}
