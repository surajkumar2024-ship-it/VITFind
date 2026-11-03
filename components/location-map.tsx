"use client";
import { useEffect, useRef, useState } from "react";
import { LocateFixed, MapPin, X } from "lucide-react";
import type * as Leaflet from "leaflet";

type Point = { latitude: number; longitude: number };
type Props = { latitude?: number|null; longitude?: number|null; onChange?: (value:Point|null)=>void; label?:string };
const campus: [number,number] = [12.9716,79.1596];
export default function LocationMap({latitude,longitude,onChange,label="Item location"}:Props) {
  const container = useRef<HTMLDivElement>(null), map = useRef<Leaflet.Map|null>(null), marker = useRef<Leaflet.Marker|null>(null);
  const change = useRef(onChange), initial = useRef({latitude,longitude});
  const [ready,setReady]=useState(false), [error,setError]=useState(""), [locating,setLocating]=useState(false);
  const editable=!!onChange;
  useEffect(()=>{change.current=onChange;},[onChange]);
  useEffect(()=>{
    let cancelled=false;
    void import("leaflet").then(L=>{
      if(cancelled||!container.current)return;
      const point=initial.current.latitude!=null&&initial.current.longitude!=null ? [initial.current.latitude,initial.current.longitude] as [number,number] : campus;
      const m=L.map(container.current,{scrollWheelZoom:false,zoomControl:true}).setView(point,17);
      map.current=m;
      const icon=L.divIcon({className:"campus-map-pin",html:'<span></span>',iconSize:[26,36],iconAnchor:[13,36]});
      const update=(lat:number,lng:number,notify:boolean)=>{
        if(!marker.current){
          marker.current=L.marker([lat,lng],{icon,draggable:editable,title:"Item location pin",keyboard:true}).addTo(m);
          marker.current.on("dragend",()=>{const p=marker.current!.getLatLng();change.current?.({latitude:+p.lat.toFixed(6),longitude:+p.lng.toFixed(6)});});
        } else marker.current.setLatLng([lat,lng]);
        if(notify)change.current?.({latitude:+lat.toFixed(6),longitude:+lng.toFixed(6)});
      };
      if(initial.current.latitude!=null&&initial.current.longitude!=null)update(point[0],point[1],false);
      if(editable)m.on("click",(e:Leaflet.LeafletMouseEvent)=>update(e.latlng.lat,e.latlng.lng,true));
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',referrerPolicy:"strict-origin-when-cross-origin"}).on("tileerror",()=>{if(!cancelled)setError("Map tiles could not load. You can still enter coordinates below.");}).addTo(m);
      setReady(true);
      requestAnimationFrame(()=>m.invalidateSize());
    }).catch(()=>{if(!cancelled)setError("The map could not load. Please enter the coordinates below.");});
    return()=>{cancelled=true;map.current?.remove();map.current=null;marker.current=null;};
  },[editable]);
  useEffect(()=>{
    if(!ready||!map.current)return;
    if(latitude==null||longitude==null){marker.current?.remove();marker.current=null;return;}
    // A click creates the marker; external coordinate entry needs a map event too.
    if(marker.current)marker.current.setLatLng([latitude,longitude]);
    else if(editable)map.current.fire("click",{latlng:{lat:latitude,lng:longitude}});
    map.current.panTo([latitude,longitude],{animate:false});
  },[latitude,longitude,ready,editable]);
  function locate(){
    if(!navigator.geolocation){setError("Location is unavailable. Tap the map or enter coordinates.");return;}
    setLocating(true);setError("");
    navigator.geolocation.getCurrentPosition(p=>{setLocating(false);change.current?.({latitude:+p.coords.latitude.toFixed(6),longitude:+p.coords.longitude.toFixed(6)});},()=>{setLocating(false);setError("Location permission was unavailable. Tap the map or enter coordinates.");},{enableHighAccuracy:true,timeout:10000,maximumAge:30000});
  }
  const pinned=latitude!=null&&longitude!=null;
  return <section className="location-map-block" aria-label={label}>
    <div className="map-heading"><strong><MapPin size={17}/>{editable?"Pin the exact spot":"Reported location"}</strong>{editable&&pinned&&<button type="button" className="text-button" onClick={()=>change.current?.(null)}><X size={14}/>Clear pin</button>}</div>
    {editable&&<p className="map-help">Tap the map or drag the pin. The initial view is VIT Vellore; pan to your campus if needed.</p>}
    <div ref={container} className="location-map" role="region" aria-label={`${label} interactive map`} />
    {!ready&&!error&&<p role="status" className="map-help">Loading map…</p>}
    {editable&&<><div className="map-tools"><button type="button" className="text-button" disabled={locating} onClick={locate}><LocateFixed size={16}/>{locating?"Locating…":"Use my current location"}</button><button type="button" className="text-button" disabled={!ready} onClick={()=>{const p=map.current?.getCenter();if(p)change.current?.({latitude:+p.lat.toFixed(6),longitude:+p.lng.toFixed(6)});}}>Use map centre</button></div>
      <div className="form-grid map-coordinates"><label className="field">Latitude<input aria-label="Location latitude" type="number" min={-90} max={90} step="any" placeholder="12.971600" value={latitude??""} onChange={e=>e.target.value===""?change.current?.(null):change.current?.({latitude:Number(e.target.value),longitude:longitude??map.current?.getCenter().lng??campus[1]})}/></label><label className="field">Longitude<input aria-label="Location longitude" type="number" min={-180} max={180} step="any" placeholder="79.159600" value={longitude??""} onChange={e=>e.target.value===""?change.current?.(null):change.current?.({latitude:latitude??map.current?.getCenter().lat??campus[0],longitude:Number(e.target.value)})}/></label></div>
      <p className="map-help">Choose where the item was found or last seen. This pin is visible to signed-in board members.</p></>}
    {error&&<p className="field-error" role="status">{error}</p>}
    {pinned&&!editable&&<a className="text-button" href={`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=19/${latitude}/${longitude}`} target="_blank" rel="noreferrer">Open location in map</a>}
  </section>;
}
