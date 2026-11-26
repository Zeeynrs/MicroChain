import type { Metadata } from "next";
import { Simulator } from "@/features/simulation/simulator";

export const metadata: Metadata = { title: "Simulator Pasokan" };
export default function Page() { return <Simulator />; }
