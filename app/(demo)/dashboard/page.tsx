import type { Metadata } from "next";
import { Dashboard } from "@/features/dashboard/dashboard";

export const metadata: Metadata = { title: "Ringkasan Usaha" };
export default function Page() { return <Dashboard />; }
