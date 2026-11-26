"use client";

import { Building2, ChartNoAxesColumnIncreasing, Database, FlaskConical, LayoutGrid, LogIn, LogOut, Network, Save, Store } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { notify } from "@/lib/notify";
import { createClient } from "@/lib/supabase/client";
import { WorkspaceGate, WorkspaceProvider, useWorkspaceMeta, type Mode } from "@/lib/workspace-context";
import { Brand } from "./brand";
import { CoachMarks } from "./guide/coach-marks";
import { HelpMenu } from "./guide/help-menu";
import { Onboarding } from "./guide/onboarding";
import { useGuide } from "./guide/use-guide";
import { Button } from "./ui/button";

const routes = [
  { path: "/dashboard", label: "Ringkasan", mobileLabel: "Ringkasan", icon: LayoutGrid },
  { path: "/network", label: "Jaringan Pasok", mobileLabel: "Jaringan", icon: Network },
  { path: "/simulator", label: "Simulator", mobileLabel: "Simulator", icon: FlaskConical },
  { path: "/comparison", label: "Perbandingan", mobileLabel: "Bandingkan", icon: ChartNoAxesColumnIncreasing },
  { path: "/data", label: "Data Usaha", mobileLabel: "Data Usaha", icon: Database },
];

function Shell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { mode, base, businessName, dirty, saving, save } = useWorkspaceMeta();
  const pathname = usePathname().replace(/\/$/, "");
  const current = routes.find(({ path }) => `${base}${path}` === pathname);
  const isWorkspace = mode === "workspace";
  const guide = useGuide(mode);
  const name = businessName?.replace(/\s*\(DATA SIMULASI\)\s*$/i, "") ?? (isWorkspace ? "Usaha Anda" : "Dapur Sari");

  async function logout() {
    try {
      await createClient().auth.signOut();
      notify.info("Anda sudah keluar.");
    } finally {
      router.replace("/");
    }
  }

  return (
    <div className="workspace">
      <a className="skip-link" href="#workspace-main">Lewati ke isi</a>
      <aside className="sidebar">
        <div className="sidebar-brand"><Brand /></div>
        <div className="sidebar-business"><span className="business-mark"><Store size={18} aria-hidden="true" /></span><span>{name}<small>{isWorkspace ? "Workspace Anda" : "Ruang kerja demo"}</small></span></div>
        <nav className="workspace-nav" aria-label="Navigasi ruang kerja" data-tour="nav-menu">
          {routes.map(({ path, label, mobileLabel, icon: Icon }) => (
            <Link key={path} href={`${base}${path}`} data-tour={`nav-${path.slice(1)}`} aria-current={`${base}${path}` === pathname ? "page" : undefined}>
              <Icon size={18} aria-hidden="true" />
              <span className="workspace-nav-desktop">{label}</span>
              <span className="workspace-nav-mobile">{mobileLabel}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-end">
          <span className="sidebar-live" />{isWorkspace ? "Tersimpan di akun" : "Data simulasi"}
          {!isWorkspace && <Link href="/login" className="sidebar-login"><LogIn size={14} aria-hidden="true" /> Masuk</Link>}
        </div>
      </aside>
      <div className="workspace-area">
        <header className="workspace-bar">
          <div className="desktop-context"><Building2 size={17} aria-hidden="true" /><span>{name}</span><span className="context-divider" aria-hidden="true">/</span><strong>{current?.label}</strong></div>
          <div className="mobile-brand"><Brand /></div>
          <div className="workspace-actions">
            <span className="workspace-mode" data-tour="mode"><FlaskConical size={15} aria-hidden="true" /> {isWorkspace ? (dirty ? "Belum disimpan" : "Tersimpan") : "Data simulasi"}</span>
            <HelpMenu onIntro={guide.openIntro} onTour={guide.startTour} />
            {isWorkspace && (
              <>
                <Button type="button" size="sm" data-tour="save" onClick={save} disabled={!dirty || saving} aria-label="Simpan ke Workspace"><Save size={15} aria-hidden="true" /> <span className="label-full">Simpan ke Workspace</span><span className="label-short" aria-hidden="true">{saving ? "Menyimpan" : "Simpan"}</span></Button>
                <Button type="button" size="sm" variant="ghost" onClick={logout} aria-label="Keluar"><LogOut size={15} aria-hidden="true" /> <span className="label-full">Keluar</span></Button>
              </>
            )}
          </div>
        </header>
        <main id="workspace-main" tabIndex={-1} className="workspace-main">
          <WorkspaceGate>{children}</WorkspaceGate>
        </main>
      </div>
      {guide.view === "intro" && <Onboarding mode={mode} onFinish={guide.finishIntro} onSkip={() => guide.finishIntro(false)} />}
      {guide.view === "tour" && <CoachMarks steps={guide.steps} index={guide.step} base={base} onIndex={guide.setStep} onClose={guide.closeTour} />}
    </div>
  );
}

export function Workspace({ mode, children }: { mode: Mode; children: ReactNode }) {
  return (
    <WorkspaceProvider mode={mode}>
      <Shell>{children}</Shell>
    </WorkspaceProvider>
  );
}

export function PageHeader({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return <header className="page-header"><div><h1>{title}</h1><p>{children}</p></div>{action && <div className="page-header-action">{action}</div>}</header>;
}
