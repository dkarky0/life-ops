"use client";

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
    <AuthGate>
      <div className="app-shell">{children}</div>
      {hideNav ? null : <BottomNav />}
    </AuthGate>
  );
}
