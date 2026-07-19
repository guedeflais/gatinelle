"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";

export interface MappedMerchant {
  businessName: string;
  category: string;
  address: string;
  latitude: number;
  longitude: number;
}

// Icône de repère maison plutôt que l'icône par défaut de Leaflet, dont les
// chemins d'images cassent sous le bundler de Next.js.
const pinIcon = L.divIcon({
  html: `
    <svg width="28" height="40" viewBox="0 0 28 40" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.3 21.7 0 14 0Z" fill="#4f8fc0" />
      <circle cx="14" cy="14" r="5.5" fill="#f0f6fb" />
    </svg>
  `,
  className: "",
  iconSize: [28, 40],
  iconAnchor: [14, 40],
  popupAnchor: [0, -36],
});

export function MerchantMap({ merchants }: { merchants: MappedMerchant[] }) {
  const bounds = merchants.map((m) => [m.latitude, m.longitude] as [number, number]);

  return (
    <MapContainer
      bounds={bounds}
      boundsOptions={{ padding: [24, 24] }}
      className="h-[420px] w-full rounded-xl"
      scrollWheelZoom={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {merchants.map((m) => (
        <Marker key={`${m.latitude}-${m.longitude}-${m.businessName}`} position={[m.latitude, m.longitude]} icon={pinIcon}>
          <Popup>
            <p className="font-medium">{m.businessName}</p>
            <p className="text-sm text-neutral-600">{m.category}</p>
            <p className="text-sm text-neutral-500">{m.address}</p>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
