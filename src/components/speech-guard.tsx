"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { cancelSpeech } from "@/lib/speech";

/** Stops assistant TTS whenever the route changes. */
export function SpeechGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    cancelSpeech();
    return () => {
      cancelSpeech();
    };
  }, [pathname]);

  return <>{children}</>;
}
