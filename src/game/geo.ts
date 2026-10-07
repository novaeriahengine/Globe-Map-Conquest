import * as THREE from "three";
import type { Vec3 } from "./types";

export const GLOBE_RADIUS = 2;

export function latLonToXYZ(lat: number, lon: number, radius = GLOBE_RADIUS): Vec3 {
  const phi = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lon + 180);

  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);

  return [x, y, z];
}

export function xyzToLatLon(x: number, y: number, z: number): [number, number] {
  const radius = Math.sqrt(x * x + y * y + z * z) || 1;
  const lat = 90 - THREE.MathUtils.radToDeg(Math.acos(y / radius));
  const lon = THREE.MathUtils.radToDeg(Math.atan2(z, -x)) - 180;
  const normalizedLon = ((lon + 540) % 360) - 180;
  return [lat, normalizedLon];
}

export function seededColor(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  const hue = (hash % 360) / 360;
  const color = new THREE.Color();
  color.setHSL(hue, 0.66, 0.55);
  return `#${color.getHexString()}`;
}
