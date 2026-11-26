"use client";

import { ChevronDown, Settings2 } from "lucide-react";
import { DateInput, NumberInput } from "@/components/ui/number-input";
import { formatMoney, formatQuantity } from "@/lib/format";
import type { ScenarioConfig, WorkspaceSnapshot } from "@/lib/domain/types";

interface Props {
  snapshot: WorkspaceSnapshot;
  scenario: ScenarioConfig;
  pending: boolean;
  onChange: (next: ScenarioConfig) => void;
}

const toggle = (list: string[], id: string, on: boolean) => (on ? [...new Set([...list, id])].sort() : list.filter((x) => x !== id));

/**
 * Pengaturan skenario terpilih: batas tanggal, pemasok gagal kirim, penawaran cadangan, dan keterlambatan.
 * Perubahan langsung diterapkan ke skenario sehingga hasil simulasi sebelumnya menjadi basi.
 */
export function ScenarioSettings({ snapshot, scenario, pending, onChange }: Props) {
  const supplierName = (id: string) => snapshot.suppliers.find((s) => s.id === id)?.name ?? id;
  const material = (id: string) => snapshot.materials.find((m) => m.id === id);
  const delayOf = (deliveryId: string) =>
    scenario.disruptions.filter((d) => d.delivery_id === deliveryId).reduce((sum, d) => sum + d.delay_days, 0);
  const setDelay = (deliveryId: string, days: number) => {
    const rest = scenario.disruptions.filter((d) => d.delivery_id !== deliveryId);
    onChange({ ...scenario, disruptions: days > 0 ? [...rest, { type: "delay_delivery", delivery_id: deliveryId, delay_days: days }] : rest });
  };

  return (
    <details className="parameter-details">
      <summary><Settings2 size={17} aria-hidden="true" /> Atur skenario <ChevronDown size={17} aria-hidden="true" /></summary>
      <fieldset disabled={pending} className="parameters-compact">
        <legend className="sr-only">Pengaturan skenario</legend>
        <section className="parameter-section">
          <h3>Batas waktu pasokan</h3>
          <div className="parameter-fields">
            <DateInput label="Tanggal batas" value={scenario.cutoff_date} onCommit={(v) => onChange({ ...scenario, cutoff_date: v })} />
          </div>
          <small className="field-hint">Bahan yang tiba setelah tanggal ini tidak bisa dipakai.</small>
        </section>

        <section className="parameter-section">
          <h3>Pemasok</h3>
          <div className="check-list">
            {snapshot.suppliers.map((supplier) => (
              <label key={supplier.id} className="check-row">
                <input
                  type="checkbox"
                  checked={!supplier.active || scenario.disabled_supplier_ids.includes(supplier.id)}
                  disabled={!supplier.active}
                  onChange={(event) => onChange({ ...scenario, disabled_supplier_ids: toggle(scenario.disabled_supplier_ids, supplier.id, event.target.checked) })}
                />
                <span>{supplier.name} gagal kirim{!supplier.active && <small>Nonaktif di Data Usaha</small>}</span>
              </label>
            ))}
            {snapshot.suppliers.length === 0 && <p className="muted">Belum ada pemasok.</p>}
          </div>
        </section>

        <section className="parameter-section">
          <h3>Penawaran cadangan</h3>
          <div className="check-list">
            {snapshot.alternative_offers.map((offer) => {
              const mat = material(offer.material_id);
              return (
                <label key={offer.id} className="check-row">
                  <input
                    type="checkbox"
                    checked={offer.enabled_in_scenario && scenario.enabled_offer_ids.includes(offer.id)}
                    disabled={!offer.enabled_in_scenario}
                    onChange={(event) => onChange({ ...scenario, enabled_offer_ids: toggle(scenario.enabled_offer_ids, offer.id, event.target.checked) })}
                  />
                  <span>
                    Aktifkan penawaran {supplierName(offer.supplier_id)}: {mat?.name ?? offer.material_id}
                    <small>
                      Maks. {offer.max_packs} pak{mat ? ` × ${formatQuantity(offer.pack_size_base_units, mat.base_unit)}` : ""}, tiba +{offer.lead_days} hari, tambahan {formatMoney(offer.incremental_premium_idr_per_pack)} per pak
                    </small>
                    {!offer.enabled_in_scenario && <small className="text-warning">Dinonaktifkan di Data Usaha</small>}
                  </span>
                </label>
              );
            })}
            {snapshot.alternative_offers.length === 0 && <p className="muted">Belum ada penawaran cadangan.</p>}
          </div>
        </section>

        {snapshot.committed_deliveries.length > 0 && (
          <section className="parameter-section">
            <h3>Keterlambatan pengiriman</h3>
            <div className="parameter-fields">
              {snapshot.committed_deliveries.map((delivery) => (
                <NumberInput
                  key={delivery.id}
                  label={`Keterlambatan ${supplierName(delivery.supplier_id)} – ${material(delivery.material_id)?.name ?? delivery.material_id} (hari)`}
                  value={delayOf(delivery.id)}
                  max={365}
                  onCommit={(n) => setDelay(delivery.id, n)}
                />
              ))}
            </div>
          </section>
        )}
      </fieldset>
    </details>
  );
}
