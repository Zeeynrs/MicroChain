import { Network } from "lucide-react";
import Link from "next/link";

export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="MicroChain, beranda">
      <span className="brand-mark"><Network size={21} strokeWidth={1.8} aria-hidden="true" /></span>
      <span>Micro<span className="brand-accent">Chain</span></span>
    </Link>
  );
}
