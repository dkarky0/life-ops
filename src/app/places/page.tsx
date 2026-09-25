"use client";
import TypePage from "@/app/_type-page";

export default function PlacesPage() {
  return (
    <TypePage
      type="place"
      title="Places"
      empty="No saved places yet. Capture a shop while you travel."
      showMaps
      showComplete={false}
    />
  );
}
