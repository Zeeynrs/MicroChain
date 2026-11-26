import type { Metadata } from "next";
import { Comparison } from "@/features/simulation/comparison";

export const metadata: Metadata = { title: "Perbandingan Skenario" };
export default function Page() { return <Comparison />; }
