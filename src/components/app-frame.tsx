"use client";

import { Suspense } from "react";
import { AuthGate } from "@/components/auth-gate";
import { BottomNav } from "@/components/bottom-nav";

export function AppFrame({
  children,
  hideNav = false,
}: {
  children: React.ReactNode;
  hideNav?: boolean;
}) {
  return (
    <Suspense
      fallback={
        <div className="app-shell">
          <p className="empty">Loading Life Ops…</p>
        </div>
      }
    >
      <AuthGate>
        <div className="app-shell">{children}</div>
        {hideNav ? null : <BottomNav />}
      </AuthGate>
    </Suspense>
  );
}
