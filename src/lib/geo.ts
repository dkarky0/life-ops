export type DeviceGeo = {
  lat: number;
  lng: number;
  accuracy: number | null;
  mapsUrl: string;
  locationLabel: string;
};

export function mapsUrlFromCoords(lat: number, lng: number) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

async function reverseLabel(lat: number, lng: number): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
        },
      },
    );
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      name?: string;
      display_name?: string;
      address?: Record<string, string>;
    };
    const a = data.address || {};
    const bits = [
      data.name,
      a.road || a.pedestrian || a.neighbourhood,
      a.suburb || a.village || a.town || a.city_district,
      a.city || a.town || a.state_district,
    ].filter(Boolean);
    if (bits.length) return bits.slice(0, 3).join(", ");
    if (data.display_name) {
      return data.display_name.split(",").slice(0, 3).join(",").trim();
    }
    return null;
  } catch {
    return null;
  }
}

export function getDeviceLocation(
  options?: PositionOptions,
): Promise<DeviceGeo> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Location not available on this device/browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        const label =
          (await reverseLabel(lat, lng)) ||
          `Current location (${lat}, ${lng})`;
        resolve({
          lat,
          lng,
          accuracy: pos.coords.accuracy ?? null,
          mapsUrl: mapsUrlFromCoords(lat, lng),
          locationLabel: label,
        });
      },
      (err) => {
        reject(
          new Error(
            err.code === 1
              ? "Location permission denied. Allow location for Life Ops."
              : "Could not read GPS. Try again outdoors or check location is on.",
          ),
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 30_000,
        ...options,
      },
    );
  });
}

/** Fill missing place fields from GPS without overwriting AI/user text. */
export function mergePlaceGeo(
  proposal: Record<string, unknown>,
  geo: DeviceGeo | null | undefined,
) {
  if (!geo || proposal.type !== "place") return proposal;
  const next = { ...proposal };
  if (!next.mapsUrl) next.mapsUrl = geo.mapsUrl;
  if (!next.locationLabel) next.locationLabel = geo.locationLabel;
  const notes = String(next.notes || "");
  const pin = `GPS ${geo.lat},${geo.lng}`;
  if (!notes.includes(pin)) {
    next.notes = notes ? `${notes}\n${pin}` : pin;
  }
  return next;
}
