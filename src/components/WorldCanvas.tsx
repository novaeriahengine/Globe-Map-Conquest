import { Canvas } from "@react-three/fiber";
import { Html, OrbitControls, Stars, TransformControls } from "@react-three/drei";
import { feature } from "topojson-client";
import worldAtlas from "world-atlas/countries-110m.json";
import * as THREE from "three";
import { useMemo, useRef } from "react";
import { GLOBE_RADIUS, latLonToXYZ } from "../game/geo";
import type { SceneObject } from "../game/types";
import { useGameStore } from "../store/useGameStore";

function EarthBorders() {
  const geometry = useMemo(() => {
    const geo = feature(
      worldAtlas as unknown as Parameters<typeof feature>[0],
      (worldAtlas as any).objects.countries
    ) as any;

    const positions: number[] = [];

    const addRing = (ring: number[][]) => {
      for (let i = 1; i < ring.length; i += 1) {
        const a = latLonToXYZ(ring[i - 1][1], ring[i - 1][0], GLOBE_RADIUS + 0.008);
        const b = latLonToXYZ(ring[i][1], ring[i][0], GLOBE_RADIUS + 0.008);
        positions.push(...a, ...b);
      }
    };

    for (const item of geo.features ?? []) {
      const shape = item.geometry;
      if (!shape) continue;
      if (shape.type === "Polygon") {
        shape.coordinates.forEach(addRing);
      } else if (shape.type === "MultiPolygon") {
        shape.coordinates.forEach((polygon: number[][][]) => polygon.forEach(addRing));
      }
    }

    const result = new THREE.BufferGeometry();
    result.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );
    return result;
  }, []);

  return (
    <lineSegments geometry={geometry} renderOrder={2}>
      <lineBasicMaterial color="#8fa6b8" transparent opacity={0.55} />
    </lineSegments>
  );
}

function EarthGlobe() {
  return (
    <group>
      <mesh receiveShadow>
        <sphereGeometry args={[GLOBE_RADIUS, 96, 64]} />
        <meshStandardMaterial
          color="#123f59"
          roughness={0.92}
          metalness={0.04}
        />
      </mesh>
      <EarthBorders />
    </group>
  );
}

function proceduralHeight(x: number, y: number, z: number, seed: number) {
  const s = seed * 0.000137;
  const a = Math.sin(x * 3.7 + y * 1.9 + z * 2.2 + s * 17);
  const b = Math.sin(x * 7.1 - y * 5.3 + z * 4.1 + s * 31) * 0.45;
  const c = Math.cos(x * 13.7 + y * 9.2 - z * 8.8 + s * 53) * 0.2;
  const continents = Math.sin(x * 1.3 + s) + Math.cos(z * 1.55 - s * 0.7);
  return (a + b + c) * 0.42 + continents * 0.32;
}

function ProceduralGlobe({ seed }: { seed: number }) {
  const geometry = useMemo(() => {
    const source = new THREE.IcosahedronGeometry(GLOBE_RADIUS, 5);
    const geometry = source.toNonIndexed();
    source.dispose();

    const position = geometry.getAttribute("position") as THREE.BufferAttribute;
    const colors: number[] = [];
    const temp = new THREE.Vector3();
    const ocean = new THREE.Color("#194b6d");
    const beach = new THREE.Color("#d9b86c");
    const grass = new THREE.Color("#4e7d46");
    const rock = new THREE.Color("#75806f");
    const snow = new THREE.Color("#e9eef2");

    for (let i = 0; i < position.count; i += 1) {
      temp.fromBufferAttribute(position, i).normalize();
      const h = proceduralHeight(temp.x, temp.y, temp.z, seed);
      const land = h > 0.02;
      const radius = land
        ? GLOBE_RADIUS + Math.min(0.18, h * 0.105)
        : GLOBE_RADIUS - 0.018 + h * 0.012;

      temp.multiplyScalar(radius);
      position.setXYZ(i, temp.x, temp.y, temp.z);

      const color =
        !land ? ocean : h < 0.1 ? beach : h < 0.65 ? grass : h < 0.95 ? rock : snow;
      colors.push(color.r, color.g, color.b);
    }

    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    return geometry;
  }, [seed]);

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.94} metalness={0.02} />
    </mesh>
  );
}

function CountryMarkers() {
  const factions = useGameStore((state) => state.factions);
  const selectedFactionId = useGameStore((state) => state.selectedFactionId);
  const selectFaction = useGameStore((state) => state.selectFaction);

  const factionById = useMemo(
    () => new Map(factions.map((faction) => [faction.id, faction])),
    [factions]
  );

  return (
    <group>
      {factions.map((faction) => {
        const position = latLonToXYZ(faction.lat, faction.lon, GLOBE_RADIUS + 0.045);
        const controller = faction.controlledBy
          ? factionById.get(faction.controlledBy)
          : faction;
        const selected = selectedFactionId === faction.id;

        return (
          <mesh
            key={faction.id}
            position={position}
            scale={selected ? 1.7 : 1}
            onPointerDown={(event) => {
              event.stopPropagation();
              selectFaction(faction.id);
            }}
          >
            <sphereGeometry args={[0.022, 10, 10]} />
            <meshStandardMaterial
              color={controller?.color ?? faction.color}
              emissive={selected ? "#ffffff" : "#000000"}
              emissiveIntensity={selected ? 0.5 : 0}
            />
            {selected && (
              <Html distanceFactor={8} position={[0, 0.06, 0]} center>
                <div className="country-label">
                  <span>{faction.emoji}</span>
                  <strong>{faction.name}</strong>
                </div>
              </Html>
            )}
          </mesh>
        );
      })}
    </group>
  );
}

function ObjectVisual({ object }: { object: SceneObject }) {
  const material = <meshStandardMaterial color={object.color} roughness={0.7} />;

  if (object.kind === "sphere") {
    return (
      <mesh castShadow>
        <sphereGeometry args={[1, 24, 16]} />
        {material}
      </mesh>
    );
  }

  if (object.kind === "cylinder") {
    return (
      <mesh castShadow>
        <cylinderGeometry args={[0.65, 0.65, 1.6, 20]} />
        {material}
      </mesh>
    );
  }

  if (object.kind === "spawn") {
    return (
      <group>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.75, 0.12, 10, 30]} />
          <meshStandardMaterial color={object.color} emissive={object.color} emissiveIntensity={0.35} />
        </mesh>
        <mesh position={[0, 0.35, 0]}>
          <coneGeometry args={[0.28, 0.7, 4]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      </group>
    );
  }

  if (object.kind === "king") {
    return (
      <group>
        <mesh position={[0, 0.72, 0]} castShadow>
          <sphereGeometry args={[0.34, 18, 12]} />
          <meshStandardMaterial color="#d9a679" />
        </mesh>
        <mesh position={[0, 0.08, 0]} castShadow>
          <capsuleGeometry args={[0.4, 0.8, 8, 16]} />
          {material}
        </mesh>
        <mesh position={[0, 1.12, 0]} castShadow>
          <coneGeometry args={[0.42, 0.38, 5]} />
          <meshStandardMaterial color="#ffd166" metalness={0.45} roughness={0.35} />
        </mesh>
      </group>
    );
  }

  return (
    <mesh castShadow>
      <boxGeometry args={[1.4, 1.4, 1.4]} />
      {material}
    </mesh>
  );
}

function EditableObject({ object }: { object: SceneObject }) {
  const groupRef = useRef<THREE.Group>(null);
  const selectedObjectId = useGameStore((state) => state.selectedObjectId);
  const selectObject = useGameStore((state) => state.selectObject);
  const tool = useGameStore((state) => state.tool);
  const updateObjectTransform = useGameStore((state) => state.updateObjectTransform);
  const selected = selectedObjectId === object.id;

  const group = (
    <group
      ref={groupRef}
      position={object.position}
      rotation={object.rotation}
      scale={object.scale}
      onPointerDown={(event) => {
        event.stopPropagation();
        selectObject(object.id);
      }}
    >
      <ObjectVisual object={object} />
    </group>
  );

  if (!selected || tool === "select") return group;

  const mode = tool === "move" ? "translate" : tool;

  return (
    <TransformControls
      mode={mode}
      onObjectChange={() => {
        const current = groupRef.current;
        if (!current) return;
        updateObjectTransform(object.id, {
          position: [current.position.x, current.position.y, current.position.z],
          rotation: [current.rotation.x, current.rotation.y, current.rotation.z],
          scale: [current.scale.x, current.scale.y, current.scale.z]
        });
      }}
    >
      {group}
    </TransformControls>
  );
}

function SceneObjects() {
  const objects = useGameStore((state) => state.objects);
  return (
    <group>
      {objects.map((object) => (
        <EditableObject key={object.id} object={object} />
      ))}
    </group>
  );
}

function WorldScene() {
  const worldMode = useGameStore((state) => state.worldMode);
  const seed = useGameStore((state) => state.seed);

  return (
    <>
      <color attach="background" args={["#070b12"]} />
      <fog attach="fog" args={["#070b12", 7, 16]} />
      <ambientLight intensity={0.85} />
      <directionalLight
        position={[4, 6, 5]}
        intensity={2.2}
        castShadow
      />
      <pointLight position={[-5, -1, -4]} intensity={0.7} color="#5c8dff" />
      <Stars radius={70} depth={30} count={1800} factor={2.5} saturation={0} fade speed={0.4} />

      <group>
        {worldMode === "earth" ? <EarthGlobe /> : <ProceduralGlobe seed={seed} />}
        {worldMode === "earth" && <CountryMarkers />}
        <SceneObjects />
      </group>

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={2.8}
        maxDistance={10}
      />
    </>
  );
}

export function WorldCanvas() {
  const selectObject = useGameStore((state) => state.selectObject);

  return (
    <Canvas
      onPointerMissed={() => selectObject(null)}
      shadows
      dpr={[1, 1.6]}
      camera={{ position: [0, 1.6, 5.7], fov: 46, near: 0.05, far: 120 }}
    >
      <WorldScene />
    </Canvas>
  );
}
