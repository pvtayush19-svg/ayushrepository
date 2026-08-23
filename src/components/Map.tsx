import React, { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet'
import L from 'leaflet'

// Fix for default marker icons in react-leaflet
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
})
L.Marker.prototype.options.icon = DefaultIcon

type Location = {
  lat: number
  lng: number
}

type MapProps = {
  center?: Location
  markers?: Array<{ id: string; lat: number; lng: number; title: string; subtitle?: string; type?: 'user' | 'doctor' | 'ambulance', avatar_url?: string }>
  onLocationSelect?: (loc: Location) => void
  interactive?: boolean
  className?: string
  route?: { start: Location; end: Location }
}

const getIcon = (type?: 'user' | 'doctor' | 'ambulance', avatarUrl?: string) => {
  if (avatarUrl) {
    return L.divIcon({
      className: 'bg-transparent border-none',
      html: `<div style="
        width: 40px; 
        height: 40px; 
        border-radius: 50%; 
        border: 3px solid white; 
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
        background-image: url('${avatarUrl}');
        background-size: cover;
        background-position: center;
        transform: translate(-50%, -100%);
      "></div>`,
      iconSize: [40, 40],
      iconAnchor: [0, 0]
    })
  }

  let emoji = '📍'
  if (type === 'user') emoji = '👤'
  else if (type === 'doctor') emoji = '👨‍⚕️'
  else if (type === 'ambulance') emoji = '🚑'
  
  return L.divIcon({
    className: 'bg-transparent border-none',
    html: `<div style="font-size: 30px; line-height: 30px; filter: drop-shadow(0px 2px 2px rgba(0,0,0,0.4)); transform: translate(-50%, -100%);">${emoji}</div>`,
    iconSize: [30, 30],
    iconAnchor: [0, 0] // Adjusted via CSS transform
  })
}

function MapUpdater({ center }: { center: Location }) {
  const map = useMap()
  useEffect(() => {
    map.setView([center.lat, center.lng], map.getZoom())
  }, [center, map])
  return null
}

function LocationPicker({ onSelect }: { onSelect: (loc: Location) => void }) {
  const map = useMap()
  useEffect(() => {
    const onClick = (e: L.LeafletMouseEvent) => {
      onSelect({ lat: e.latlng.lat, lng: e.latlng.lng })
    }
    map.on('click', onClick)
    return () => {
      map.off('click', onClick)
    }
  }, [map, onSelect])
  return null
}

function RouteLayer({ start, end }: { start: Location, end: Location }) {
  const [routePoints, setRoutePoints] = useState<[number, number][]>([])

  useEffect(() => {
    if (start && end) {
      fetch(`https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`)
        .then(r => r.json())
        .then(data => {
           if (data.routes && data.routes[0]) {
              const coords = data.routes[0].geometry.coordinates; // [lng, lat]
              setRoutePoints(coords.map((c: any) => [c[1], c[0]])) // convert to [lat, lng]
           }
        }).catch(err => console.error("OSRM Error:", err))
    }
  }, [start.lat, start.lng, end.lat, end.lng])

  if (routePoints.length === 0) return null
  return <Polyline positions={routePoints} color="#3b82f6" weight={5} opacity={0.8} />
}

export default function Map({ center = { lat: 0, lng: 0 }, markers = [], onLocationSelect, interactive = false, className = "h-[400px] w-full", route }: MapProps) {
  const [currentCenter, setCurrentCenter] = useState(center)

  useEffect(() => {
    setCurrentCenter(center)
  }, [center])

  return (
    <div className={`${className} rounded-md overflow-hidden border border-slate-200 z-0 relative`}>
      <MapContainer center={[currentCenter.lat, currentCenter.lng]} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapUpdater center={currentCenter} />
        {interactive && onLocationSelect && <LocationPicker onSelect={onLocationSelect} />}
        {route && <RouteLayer start={route.start} end={route.end} />}
        {markers.map((marker) => (
          <Marker key={marker.id} position={[marker.lat, marker.lng]} icon={getIcon(marker.type, marker.avatar_url)}>
            <Popup>
              <strong>{marker.title}</strong>
              {marker.subtitle && <p>{marker.subtitle}</p>}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
