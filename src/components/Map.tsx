import React, { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
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
  markers?: Array<{ id: string; lat: number; lng: number; title: string; subtitle?: string; type?: 'user' | 'doctor' | 'ambulance' }>
  onLocationSelect?: (loc: Location) => void
  interactive?: boolean
  className?: string
}

const getIcon = (type?: 'user' | 'doctor' | 'ambulance') => {
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

export default function Map({ center = { lat: 0, lng: 0 }, markers = [], onLocationSelect, interactive = false, className = "h-[400px] w-full" }: MapProps) {
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
        {markers.map((marker) => (
          <Marker key={marker.id} position={[marker.lat, marker.lng]} icon={getIcon(marker.type)}>
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
