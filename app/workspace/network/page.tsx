import type { Metadata } from "next";
import { SupplyNetwork } from "@/features/network/supply-network";

export const metadata: Metadata = { title: "Jaringan Pasok" };
export default function Page() { return <SupplyNetwork />; }
