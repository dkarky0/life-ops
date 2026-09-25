import { Suspense } from "react";
import TrackersClient from "./trackers-client";

export default function TrackersPage() {
  return (
    <Suspense
      fallback={
        <div className="app-shell">
          <p className="empty">Loading trackers…</p>
        </div>
      }
    >
      <TrackersClient />
    </Suspense>
  );
}
