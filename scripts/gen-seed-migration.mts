// Membangkitkan migrasi seed demo_templates dari fixture Dapur Sari agar keduanya selalu sinkron.
// Jalankan: node --experimental-strip-types scripts/gen-seed-migration.mts
import { writeFileSync } from "node:fs";
import { DAPUR_SARI_FALLBACK_FIXTURE as f } from "../lib/domain/fixture.ts";

const payload = JSON.stringify({ demo_data: true, snapshot: f.snapshot, scenarios: f.scenarios }, null, 2);
const sql = `-- Seed template demo Dapur Sari (dibangkitkan dari lib/domain/fixture.ts oleh scripts/gen-seed-migration.mts).
insert into public.demo_templates (id, payload, updated_at)
values ('dapur_sari', $json$${payload}$json$::jsonb, now())
on conflict (id) do update set payload = excluded.payload, updated_at = now();
`;
writeFileSync("supabase/migrations/20261125115000_seed_demo_template.sql", sql);
console.log("ok");
