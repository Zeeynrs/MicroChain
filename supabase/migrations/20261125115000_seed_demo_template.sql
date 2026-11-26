-- Seed template demo Dapur Sari (dibangkitkan dari lib/domain/fixture.ts oleh scripts/gen-seed-migration.mts).
insert into public.demo_templates (id, payload, updated_at)
values ('dapur_sari', $json${
  "demo_data": true,
  "snapshot": {
    "business": {
      "id": "dapur_sari",
      "name": "Dapur Sari",
      "sector": "Toko roti dan kue",
      "currency": "IDR",
      "planning_cutoff_date": "2026-11-24",
      "scenario_date": "2026-11-23"
    },
    "suppliers": [
      {
        "id": "supplier_a",
        "name": "Pemasok A",
        "active": true,
        "notes": "Pemasok utama tepung terigu."
      },
      {
        "id": "supplier_b",
        "name": "Pemasok B",
        "active": true,
        "notes": "Pemasok cadangan tepung terigu."
      }
    ],
    "materials": [
      {
        "id": "flour",
        "name": "Tepung terigu",
        "unit_kind": "mass",
        "base_unit": "g",
        "stock_on_hand": 8000
      },
      {
        "id": "sugar",
        "name": "Gula pasir",
        "unit_kind": "mass",
        "base_unit": "g",
        "stock_on_hand": 10000
      },
      {
        "id": "butter",
        "name": "Mentega",
        "unit_kind": "mass",
        "base_unit": "g",
        "stock_on_hand": 6000
      }
    ],
    "products": [
      {
        "id": "bread",
        "name": "Roti",
        "demand_units": 100,
        "unit_contribution_idr": 3000
      },
      {
        "id": "cookies",
        "name": "Kue kering",
        "demand_units": 30,
        "unit_contribution_idr": 5000
      }
    ],
    "bom": [
      {
        "product_id": "bread",
        "material_id": "flour",
        "quantity_per_product": 250
      },
      {
        "product_id": "bread",
        "material_id": "sugar",
        "quantity_per_product": 20
      },
      {
        "product_id": "bread",
        "material_id": "butter",
        "quantity_per_product": 10
      },
      {
        "product_id": "cookies",
        "material_id": "flour",
        "quantity_per_product": 100
      },
      {
        "product_id": "cookies",
        "material_id": "sugar",
        "quantity_per_product": 50
      },
      {
        "product_id": "cookies",
        "material_id": "butter",
        "quantity_per_product": 40
      }
    ],
    "committed_deliveries": [
      {
        "id": "supplier_a_flour_delivery",
        "supplier_id": "supplier_a",
        "material_id": "flour",
        "quantity_base_units": 25000,
        "arrival_date": "2026-11-23",
        "enabled_in_baseline": true
      }
    ],
    "alternative_offers": [
      {
        "id": "supplier_b_flour_offer",
        "supplier_id": "supplier_b",
        "material_id": "flour",
        "pack_size_base_units": 1000,
        "max_packs": 12,
        "lead_days": 1,
        "incremental_premium_idr_per_pack": 1000,
        "enabled_in_scenario": true
      }
    ],
    "scenario_date": "2026-11-23",
    "demo_data": true
  },
  "scenarios": [
    {
      "id": "baseline",
      "name": "Normal",
      "cutoff_date": "2026-11-24",
      "disabled_supplier_ids": [],
      "enabled_offer_ids": [],
      "disruptions": [],
      "overrides": {},
      "source": "demo"
    },
    {
      "id": "outage",
      "name": "Pemasok Utama Gagal",
      "cutoff_date": "2026-11-24",
      "disabled_supplier_ids": [
        "supplier_a"
      ],
      "enabled_offer_ids": [],
      "disruptions": [],
      "overrides": {},
      "source": "demo"
    },
    {
      "id": "mitigation",
      "name": "Mitigasi: Pemasok Alternatif Aktif",
      "cutoff_date": "2026-11-24",
      "disabled_supplier_ids": [
        "supplier_a"
      ],
      "enabled_offer_ids": [
        "supplier_b_flour_offer"
      ],
      "disruptions": [],
      "overrides": {},
      "source": "demo"
    }
  ]
}$json$::jsonb, now())
on conflict (id) do update set payload = excluded.payload, updated_at = now();
