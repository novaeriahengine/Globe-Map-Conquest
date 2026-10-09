import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { Html, OrbitControls, Stars } from "@react-three/drei";
import { feature } from "topojson-client";
import worldAtlas from "world-atlas/countries-110m.json";
import * as THREE from "three";
import { useEffect, useMemo, useRef, useState } from "react";
import { US_STATES } from "../data/usStates";
import { GLOBE_RADIUS, latLonToXYZ, xyzToLatLon } from "../game/geo";
import type { LatLon, SceneObject, TerritoryPatch, WorldMode } from "../game/types";
import { useGameStore } from "../store/useGameStore";

type GeoFeature = {
  id?: string | number;
  geometry?: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
};

function normalizeRing(ring: number[][]) {
  if (ring.length < 3) return [] as THREE.Vector2[];

  const withoutDuplicate =
    ring.length > 3 &&
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1]
      ? ring.slice(0, -1)
      : ring;

  const lons = withoutDuplicate.map((point) => point[0]);
  const spread = Math.max(...lons) - Math.min(...lons);
  const unwrap = spread > 180;

  return withoutDuplicate.map(([lon, lat]) => {
    const adjustedLon = unwrap && lon < 0 ? lon + 360 : lon;
    return new THREE.Vector2(adjustedLon, lat);
  });
}

function geometryFromPolygon(
  rings: number[][][],
  radius = GLOBE_RADIUS + 0.012
) {
  const contour = normalizeRing(rings[0] ?? []);
  const holes = rings.slice(1).map(normalizeRing).filter((ring) => ring.length >= 3);

  if (contour.length < 3) return null;

  let faces: number[][] = [];
  try {
    faces = THREE.ShapeUtils.triangulateShape(contour, holes);
  } catch {
    return null;
  }

  const flat = [contour, ...holes].flat();
  const positions: number[] = [];

  for (const face of faces) {
    for (const index of face) {
      const point = flat[index];
      if (!point) continue;
      const xyz = latLonToXYZ(point.y, point.x, radius);
      positions.push(...xyz);
    }
  }

  if (!positions.length) return null;

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  );
  geometry.computeVertexNormals();
  return geometry;
}

function geometryFromTerritory(
  territory: TerritoryPatch,
  radius = GLOBE_RADIUS + 0.026
) {
  if (territory.points.length < 3) return null;

  const ring = territory.points.map(([lat, lon]) => [lon, lat]);
  ring.push([territory.points[0][1], territory.points[0][0]]);
  return geometryFromPolygon([ring], radius);
}

function countryFeatures() {
  const geo = feature(
    worldAtlas as unknown as Parameters<typeof feature>[0],
    (worldAtlas as any).objects.countries
  ) as any;

  return (geo.features ?? []) as GeoFeature[];
}

function EarthBorders() {
  const geometry = useMemo(() => {
    const positions: number[] = [];

    const addRing = (ring: number[][]) => {
      for (let i = 1; i < ring.length; i += 1) {
        const a = latLonToXYZ(ring[i - 1][1], ring[i - 1][0], GLOBE_RADIUS + 0.034);
        const b = latLonToXYZ(ring[i][1], ring[i][0], GLOBE_RADIUS + 0.034);
        positions.push(...a, ...b);
      }
    };

    for (const item of countryFeatures()) {
      const shape = item.geometry;
      if (!shape) continue;

      if (shape.type === "Polygon") {
        (shape.coordinates as number[][][]).forEach(addRing);
      } else if (shape.type === "MultiPolygon") {
        (shape.coordinates as number[][][][]).forEach((polygon) => polygon.forEach(addRing));
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
    <lineSegments geometry={geometry} renderOrder={4}>
      <lineBasicMaterial color="#d5e4ef" transparent opacity={0.68} />
    </lineSegments>
  );
}

function CountryRegion({
  item,
  factionId
}: {
  item: GeoFeature;
  factionId: string;
}) {
  const factions = useGameStore((state) => state.factions);
  const selectedFactionId = useGameStore((state) => state.selectedFactionId);
  const selectFaction = useGameStore((state) => state.selectFaction);
  const tool = useGameStore((state) => state.tool);
  const addTerritoryPoint = useGameStore((state) => state.addTerritoryPoint);
  const createNationAt = useGameStore((state) => state.createNationAt);
  const nationPlacementSize = useGameStore((state) => state.nationPlacementSize);
  const nationPlacementName = useGameStore((state) => state.nationPlacementName);
  const nationPlacementColor = useGameStore((state) => state.nationPlacementColor);

  const faction = factions.find((entry) => entry.id === factionId);
  const controller = faction?.controlledBy
    ? factions.find((entry) => entry.id === faction.controlledBy)
    : faction;

  const geometries = useMemo(() => {
    const shape = item.geometry;
    if (!shape) return [] as THREE.BufferGeometry[];

    const polygons =
      shape.type === "Polygon"
        ? [shape.coordinates as number[][][]]
        : (shape.coordinates as number[][][][]);

    return polygons
      .map((polygon) => geometryFromPolygon(polygon))
      .filter((value): value is THREE.BufferGeometry => Boolean(value));
  }, [item]);

  useEffect(
    () => () => {
      geometries.forEach((geometry) => geometry.dispose());
    },
    [geometries]
  );

  if (!faction) return null;

  const selected = selectedFactionId === faction.id;
  const color = controller?.color ?? faction.color;

  const onPointerDown = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();

    if (tool === "territory") {
      addTerritoryPoint(xyzToLatLon(event.point.x, event.point.y, event.point.z));
      return;
    }

    selectFaction(faction.id);
  };

  return (
    <group>
      {geometries.map((geometry, index) => (
        <mesh
          key={index}
          geometry={geometry}
          onPointerDown={onPointerDown}
          renderOrder={2}
        >
          <meshStandardMaterial
            color={color}
            transparent
            opacity={selected ? 0.9 : 0.68}
            roughness={0.88}
            metalness={0}
            emissive={selected ? color : "#000000"}
            emissiveIntensity={selected ? 0.24 : 0}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function CountryRegions() {
  const factions = useGameStore((state) => state.factions);
  const features = useMemo(countryFeatures, []);

  const byNumericCode = useMemo(() => {
    const map = new Map<string, string>();
    for (const faction of factions) {
      if (!faction.numericCode) continue;
      map.set(String(Number(faction.numericCode)), faction.id);
    }
    return map;
  }, [factions]);

  return (
    <group>
      {features.map((item, index) => {
        const id = item.id == null ? "" : String(Number(item.id));
        const factionId = byNumericCode.get(id);
        if (!factionId) return null;

        return (
          <CountryRegion
            key={`${id}-${index}`}
            item={item}
            factionId={factionId}
          />
        );
      })}
    </group>
  );
}

function EarthGlobe() {
  const tool = useGameStore((state) => state.tool);
  const addTerritoryPoint = useGameStore((state) => state.addTerritoryPoint);

  return (
    <group>
      <mesh
        receiveShadow
        onPointerDown={(event) => {
          if (tool !== "territory") return;
          event.stopPropagation();
          addTerritoryPoint(xyzToLatLon(event.point.x, event.point.y, event.point.z));
        }}
      >
        <sphereGeometry args={[GLOBE_RADIUS, 96, 64]} />
        <meshStandardMaterial
          color="#0f3650"
          roughness={0.96}
          metalness={0.02}
        />
      </mesh>
      <CountryRegions />
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

function ProceduralTrees({
  seed,
  dense
}: {
  seed: number;
  dense: boolean;
}) {
  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const crownRef = useRef<THREE.InstancedMesh>(null);

  const trees = useMemo(() => {
    const candidates = dense ? 620 : 330;
    const results: Array<{
      position: THREE.Vector3;
      quaternion: THREE.Quaternion;
      scale: number;
    }> = [];

    const golden = Math.PI * (3 - Math.sqrt(5));

    for (let i = 0; i < candidates; i += 1) {
      const y = 1 - (i / Math.max(1, candidates - 1)) * 2;
      const radius = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = golden * (i + (seed % 91) * 0.017);
      const x = Math.cos(theta) * radius;
      const z = Math.sin(theta) * radius;
      const height = proceduralHeight(x, y, z, seed);
      if (height <= (dense ? 0.02 : 0.11) || height > 0.82) continue;

      const normal = new THREE.Vector3(x, y, z).normalize();
      const surfaceRadius = GLOBE_RADIUS + Math.min(0.18, height * 0.105);
      const position = normal.clone().multiplyScalar(surfaceRadius + 0.025);
      const quaternion = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        normal
      );
      const scale = 0.72 + (((i * 37 + seed) % 100) / 100) * 0.65;

      results.push({ position, quaternion, scale });
    }

    return results;
  }, [dense, seed]);

  useEffect(() => {
    const trunk = trunkRef.current;
    const crown = crownRef.current;
    if (!trunk || !crown) return;

    const dummy = new THREE.Object3D();

    trees.forEach((tree, index) => {
      dummy.position.copy(tree.position);
      dummy.quaternion.copy(tree.quaternion);
      dummy.scale.setScalar(tree.scale);
      dummy.updateMatrix();
      trunk.setMatrixAt(index, dummy.matrix);

      const crownPosition = tree.position
        .clone()
        .add(new THREE.Vector3(0, 0.055 * tree.scale, 0).applyQuaternion(tree.quaternion));
      dummy.position.copy(crownPosition);
      dummy.quaternion.copy(tree.quaternion);
      dummy.scale.setScalar(tree.scale);
      dummy.updateMatrix();
      crown.setMatrixAt(index, dummy.matrix);
    });

    trunk.instanceMatrix.needsUpdate = true;
    crown.instanceMatrix.needsUpdate = true;
  }, [trees]);

  return (
    <group>
      <instancedMesh ref={trunkRef} args={[undefined, undefined, trees.length]}>
        <cylinderGeometry args={[0.006, 0.008, 0.055, 5]} />
        <meshStandardMaterial color="#6b4423" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={crownRef} args={[undefined, undefined, trees.length]}>
        <coneGeometry args={[0.034, 0.105, 6]} />
        <meshStandardMaterial color={dense ? "#3fa34d" : "#2d7d46"} roughness={0.95} />
      </instancedMesh>
    </group>
  );
}

function ProceduralGlobe({
  seed,
  mode
}: {
  seed: number;
  mode: WorldMode;
}) {
  const tool = useGameStore((state) => state.tool);
  const addTerritoryPoint = useGameStore((state) => state.addTerritoryPoint);
  const dense = mode === "sandbox";

  const geometry = useMemo(() => {
    const source = new THREE.IcosahedronGeometry(GLOBE_RADIUS, dense ? 5 : 5);
    const geometry = source.toNonIndexed();
    source.dispose();

    const position = geometry.getAttribute("position") as THREE.BufferAttribute;
    const colors: number[] = [];
    const temp = new THREE.Vector3();

    const ocean = new THREE.Color(dense ? "#2a9df4" : "#194b6d");
    const beach = new THREE.Color(dense ? "#f2d16b" : "#d9b86c");
    const grass = new THREE.Color(dense ? "#62b84f" : "#4e7d46");
    const rock = new THREE.Color(dense ? "#7b846f" : "#75806f");
    const snow = new THREE.Color("#e9eef2");

    for (let i = 0; i < position.count; i += 1) {
      temp.fromBufferAttribute(position, i).normalize();
      const h = proceduralHeight(temp.x, temp.y, temp.z, seed);
      const land = h > (dense ? -0.02 : 0.02);
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
  }, [dense, seed]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <group>
      <mesh
        geometry={geometry}
        castShadow
        receiveShadow
        onPointerDown={(event) => {
          if (tool !== "territory") return;
          event.stopPropagation();
          addTerritoryPoint(xyzToLatLon(event.point.x, event.point.y, event.point.z));
        }}
      >
        <meshStandardMaterial
          vertexColors
          roughness={dense ? 0.98 : 0.94}
          metalness={0.01}
          flatShading={dense}
        />
      </mesh>
      <ProceduralTrees seed={seed} dense={dense} />
    </group>
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
        const position = latLonToXYZ(faction.lat, faction.lon, GLOBE_RADIUS + 0.07);
        const controller = faction.controlledBy
          ? factionById.get(faction.controlledBy)
          : faction;
        const selected = selectedFactionId === faction.id;

        return (
          <mesh
            key={faction.id}
            position={position}
            scale={selected ? 1.8 : 1}
            onPointerDown={(event) => {
              event.stopPropagation();
              selectFaction(faction.id);
            }}
          >
            <sphereGeometry args={[0.023, 10, 10]} />
            <meshStandardMaterial
              color={controller?.color ?? faction.color}
              emissive={selected ? "#ffffff" : "#000000"}
              emissiveIntensity={selected ? 0.52 : 0}
            />
            {selected && (
              <Html distanceFactor={8} position={[0, 0.065, 0]} center>
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

function StateMarkers() {
  const selectedFactionId = useGameStore((state) => state.selectedFactionId);
  const selectedSubdivisionId = useGameStore((state) => state.selectedSubdivisionId);
  const selectSubdivision = useGameStore((state) => state.selectSubdivision);

  if (selectedFactionId !== "USA") return null;

  return (
    <group>
      {US_STATES.map((state) => {
        const selected = selectedSubdivisionId === state.id;
        const position = latLonToXYZ(state.lat, state.lon, GLOBE_RADIUS + 0.095);

        return (
          <mesh
            key={state.id}
            position={position}
            scale={selected ? 1.9 : 1}
            onPointerDown={(event) => {
              event.stopPropagation();
              selectSubdivision(state.id);
            }}
          >
            <sphereGeometry args={[0.012, 8, 8]} />
            <meshStandardMaterial
              color={selected ? "#ffffff" : "#ffcf56"}
              emissive={selected ? "#7fc8ff" : "#000000"}
              emissiveIntensity={selected ? 0.7 : 0}
            />
            {selected && (
              <Html distanceFactor={7} position={[0, 0.045, 0]} center>
                <div className="country-label">
                  <strong>{state.name}</strong>
                  <span>{state.id}</span>
                </div>
              </Html>
            )}
          </mesh>
        );
      })}
    </group>
  );
}

function TerritoryMesh({ territory }: { territory: TerritoryPatch }) {
  const selectedTerritoryId = useGameStore((state) => state.selectedTerritoryId);
  const selectTerritory = useGameStore((state) => state.selectTerritory);

  const geometry = useMemo(() => geometryFromTerritory(territory), [territory]);

  useEffect(
    () => () => {
      geometry?.dispose();
    },
    [geometry]
  );

  if (!geometry) return null;
  const selected = selectedTerritoryId === territory.id;

  return (
    <mesh
      geometry={geometry}
      renderOrder={6}
      onPointerDown={(event) => {
        event.stopPropagation();
        selectTerritory(territory.id);
      }}
    >
      <meshStandardMaterial
        color={territory.color}
        transparent
        opacity={selected ? 0.93 : 0.78}
        emissive={selected ? territory.color : "#000000"}
        emissiveIntensity={selected ? 0.32 : 0}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

function TerritoryDraft() {
  const points = useGameStore((state) => state.territoryDraft);

  const geometry = useMemo(() => {
    const positions: number[] = [];

    for (let i = 1; i < points.length; i += 1) {
      positions.push(...latLonToXYZ(points[i - 1][0], points[i - 1][1], GLOBE_RADIUS + 0.055));
      positions.push(...latLonToXYZ(points[i][0], points[i][1], GLOBE_RADIUS + 0.055));
    }

    const result = new THREE.BufferGeometry();
    result.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );
    return result;
  }, [points]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <group>
      <lineSegments geometry={geometry} renderOrder={9}>
        <lineBasicMaterial color="#ffffff" />
      </lineSegments>

      {points.map((point, index) => (
        <mesh
          key={index}
          position={latLonToXYZ(point[0], point[1], GLOBE_RADIUS + 0.063)}
        >
          <sphereGeometry args={[0.018, 8, 8]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
    </group>
  );
}

function Territories() {
  const territories = useGameStore((state) => state.territories);

  return (
    <group>
      {territories.map((territory) => (
        <TerritoryMesh key={territory.id} territory={territory} />
      ))}
      <TerritoryDraft />
    </group>
  );
}

function NpcUnits() {
  const npcs = useGameStore((state) => state.npcs);
  const factions = useGameStore((state) => state.factions);

  const colors = useMemo(
    () => new Map(factions.map((faction) => [faction.id, faction.color])),
    [factions]
  );

  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);

  return (
    <group>
      {npcs
        .filter((npc) => npc.state !== "dead")
        .slice(0, 700)
        .map((npc) => {
          const xyz = latLonToXYZ(npc.lat, npc.lon, GLOBE_RADIUS + 0.105);
          const normal = new THREE.Vector3(...xyz).normalize();
          const quaternion = new THREE.Quaternion().setFromUnitVectors(up, normal);
          const color = colors.get(npc.factionId) ?? "#ffffff";
          const fighting = npc.state === "fighting";

          return (
            <group
              key={npc.id}
              position={xyz}
              quaternion={quaternion}
              scale={fighting ? 1.22 : 1}
            >
              <mesh>
                <capsuleGeometry args={[0.011, 0.026, 4, 8]} />
                <meshStandardMaterial
                  color={color}
                  emissive={fighting ? "#ff5a5f" : "#000000"}
                  emissiveIntensity={fighting ? 0.9 : 0}
                />
              </mesh>
              {fighting && (
                <mesh position={[0, 0.032, 0]}>
                  <sphereGeometry args={[0.008, 6, 6]} />
                  <meshBasicMaterial color="#ffd166" />
                </mesh>
              )}
            </group>
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
          <meshStandardMaterial
            color={object.color}
            emissive={object.color}
            emissiveIntensity={0.35}
          />
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

function SceneObjects() {
  const objects = useGameStore((state) => state.objects);

  return (
    <group>
      {objects
        .filter((object) => object.kind === "king")
        .map((object) => (
          <group
            key={object.id}
            position={object.position}
            rotation={object.rotation}
            scale={object.scale}
          >
            <ObjectVisual object={object} />
          </group>
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
      <ambientLight intensity={1.02} />
      <directionalLight
        position={[4, 6, 5]}
        intensity={2.4}
        castShadow
      />
      <pointLight position={[-5, -1, -4]} intensity={0.72} color="#5c8dff" />
      <Stars
        radius={70}
        depth={30}
        count={1800}
        factor={2.5}
        saturation={0}
        fade
        speed={0.4}
      />

      <group>
        {worldMode === "earth" ? (
          <EarthGlobe />
        ) : (
          <ProceduralGlobe seed={seed} mode={worldMode} />
        )}

        {worldMode === "earth" && <CountryMarkers />}
        {worldMode === "earth" && <StateMarkers />}
        <Territories />
        <NpcUnits />
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
  return (
    <Canvas
      shadows
      dpr={[1, 1.6]}
      camera={{
        position: [0, 1.6, 5.7],
        fov: 46,
        near: 0.05,
        far: 120
      }}
    >
      <WorldScene />
    </Canvas>
  );
}


const FLAT_W = 1000;
const FLAT_H = 500;

function flatProject(lat: number, lon: number): [number, number] {
  return [((lon + 180) / 360) * FLAT_W, ((90 - lat) / 180) * FLAT_H];
}

function flatRingPath(ring: number[][]) {
  if (!ring.length) return "";
  const lons = ring.map((point) => point[0]);
  const unwrap = Math.max(...lons) - Math.min(...lons) > 180;

  return (
    ring
      .map(([lon, lat], index) => {
        const fixedLon = unwrap && lon < 0 ? lon + 360 : lon;
        const x = ((fixedLon + 180) / 360) * FLAT_W;
        const y = ((90 - lat) / 180) * FLAT_H;
        return `${index ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ") + " Z"
  );
}

function flatFeaturePaths(item: GeoFeature) {
  const shape = item.geometry;
  if (!shape) return [] as string[];
  const polygonPath = (polygon: number[][][]) =>
    polygon.map(flatRingPath).join(" ");

  return shape.type === "Polygon"
    ? [polygonPath(shape.coordinates as number[][][])]
    : (shape.coordinates as number[][][][]).map(polygonPath);
}

function flatTerrainColor(
  lat: number,
  lon: number,
  seed: number,
  sandbox: boolean
) {
  const value =
    Math.sin((lon + seed * 0.01) * 0.075) +
    Math.cos((lat - seed * 0.008) * 0.11) +
    Math.sin((lon + lat) * 0.19 + seed * 0.003) * 0.55;

  if (value < -0.5) return sandbox ? "#2196d3" : "#185577";
  if (value < -0.12) return "#e0c16a";
  if (value < 0.65) return sandbox ? "#5dbb4b" : "#4b8150";
  if (value < 1.15) return "#7d846f";
  return "#e8edf2";
}

export function Map2D() {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{
    clientX: number;
    clientY: number;
    centerX: number;
    centerY: number;
  } | null>(null);
  const movedRef = useRef(false);

  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState({ x: FLAT_W / 2, y: FLAT_H / 2 });

  const worldMode = useGameStore((state) => state.worldMode);
  const seed = useGameStore((state) => state.seed);
  const factions = useGameStore((state) => state.factions);
  const npcs = useGameStore((state) => state.npcs);
  const garrisons = useGameStore((state) => state.garrisons);
  const warsState = useGameStore((state) => state.wars);
  const incidents = useGameStore((state) => state.incidents);
  const territories = useGameStore((state) => state.territories);
  const draft = useGameStore((state) => state.territoryDraft);
  const tool = useGameStore((state) => state.tool);
  const selectedFactionId = useGameStore((state) => state.selectedFactionId);
  const supportedFactionId = useGameStore((state) => state.supportedFactionId);
  const selectFaction = useGameStore((state) => state.selectFaction);
  const selectTerritory = useGameStore((state) => state.selectTerritory);
  const addTerritoryPoint = useGameStore((state) => state.addTerritoryPoint);

  const features = useMemo(countryFeatures, []);

  const viewW = FLAT_W / zoom;
  const viewH = FLAT_H / zoom;
  const viewX = Math.max(0, Math.min(FLAT_W - viewW, center.x - viewW / 2));
  const viewY = Math.max(0, Math.min(FLAT_H - viewH, center.y - viewH / 2));

  const clampCenter = (x: number, y: number, nextZoom = zoom) => {
    const w = FLAT_W / nextZoom;
    const h = FLAT_H / nextZoom;
    return {
      x: Math.max(w / 2, Math.min(FLAT_W - w / 2, x)),
      y: Math.max(h / 2, Math.min(FLAT_H - h / 2, y))
    };
  };

  const updateZoom = (value: number) => {
    const next = Math.max(1, Math.min(8, value));
    setZoom(next);
    setCenter((current) => clampCenter(current.x, current.y, next));
  };

  const byNumeric = useMemo(() => {
    const map = new Map<string, string>();
    factions.forEach((faction) => {
      if (faction.numericCode) {
        map.set(String(Number(faction.numericCode)), faction.id);
      }
    });
    return map;
  }, [factions]);

  const byId = useMemo(
    () => new Map(factions.map((faction) => [faction.id, faction])),
    [factions]
  );

  const wars = useMemo(() => {
    const seen = new Set<string>();
    const result: Array<[string, string]> = [];

    factions.forEach((faction) => {
      Object.entries(faction.relations).forEach(([otherId, relation]) => {
        if (relation !== "war") return;
        const key = [faction.id, otherId].sort().join(":");
        if (seen.has(key)) return;
        seen.add(key);
        result.push([faction.id, otherId]);
      });
    });

    return result;
  }, [factions]);

  const terrain = useMemo(() => {
    if (worldMode === "earth") return [];
    const cells: Array<{ x: number; y: number; fill: string }> = [];
    for (let y = 0; y < 27; y += 1) {
      for (let x = 0; x < 54; x += 1) {
        const lon = (x / 54) * 360 - 180;
        const lat = 90 - (y / 27) * 180;
        cells.push({
          x: (x / 54) * FLAT_W,
          y: (y / 27) * FLAT_H,
          fill: flatTerrainColor(lat, lon, seed, worldMode === "sandbox")
        });
      }
    }
    return cells;
  }, [seed, worldMode]);

  const screenToMap = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;

    return {
      x: viewX + ((clientX - rect.left) / rect.width) * viewW,
      y: viewY + ((clientY - rect.top) / rect.height) * viewH
    };
  };

  const addPoint = (clientX: number, clientY: number) => {
    const point = screenToMap(clientX, clientY);
    if (!point) return;
    addTerritoryPoint([
      90 - (point.y / FLAT_H) * 180,
      (point.x / FLAT_W) * 360 - 180
    ]);
  };

  const createNationFromPointer = (clientX: number, clientY: number) => {
    const point = screenToMap(clientX, clientY);
    if (!point) return;
    createNationAt(
      [
        90 - (point.y / FLAT_H) * 180,
        (point.x / FLAT_W) * 360 - 180
      ],
      nationPlacementSize,
      nationPlacementName,
      nationPlacementColor
    );
  };

  const visible = (x: number, y: number, padding = 18) =>
    x >= viewX - padding &&
    x <= viewX + viewW + padding &&
    y >= viewY - padding &&
    y <= viewY + viewH + padding;

  const formatCompact = (value: number) =>
    new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 1
    }).format(Math.round(value));

  const armyMarkers = useMemo(() => {
    const result: Array<{
      id: string;
      factionId: string;
      x: number;
      y: number;
      size: number;
      big: boolean;
      label: string;
      emoji: string;
      color: string;
      fighting: boolean;
    }> = [];

    for (const faction of factions) {
      if (faction.army <= 0) continue;
      const targetId = Object.entries(faction.relations).find(
        ([, relation]) => relation === "war"
      )?.[0];
      const target = targetId ? byId.get(targetId) : undefined;
      const atWar = Boolean(target);

      if (
        zoom < 1.8 &&
        !atWar &&
        faction.id !== selectedFactionId &&
        faction.id !== supportedFactionId
      ) {
        continue;
      }

      let lat = faction.lat;
      let lon = faction.lon;
      if (target) {
        let dLon = target.lon - faction.lon;
        if (dLon > 180) dLon -= 360;
        if (dLon < -180) dLon += 360;
        const advance = zoom >= 4 ? 0.48 : 0.34;
        lat = faction.lat + (target.lat - faction.lat) * advance;
        lon = ((faction.lon + dLon * advance + 540) % 360) - 180;
      }

      const [baseX, baseY] = flatProject(lat, lon);
      const groupCount =
        zoom < 2.2
          ? 1
          : Math.max(1, Math.min(10, Math.ceil(faction.army / 75_000)));
      const groupSize = faction.army / groupCount;

      for (let index = 0; index < groupCount; index += 1) {
        const angle = (index / Math.max(1, groupCount)) * Math.PI * 2;
        const spread = groupCount === 1 ? 0 : Math.min(14, 3 + zoom * 1.4);
        result.push({
          id: `${faction.id}-army-${index}`,
          factionId: faction.id,
          x: baseX + Math.cos(angle) * spread,
          y: baseY + Math.sin(angle) * spread,
          size: groupSize,
          big: index === 0,
          label: formatCompact(groupSize),
          emoji: faction.emoji,
          color: faction.color,
          fighting: atWar
        });
      }
    }

    return result;
  }, [
    byId,
    factions,
    selectedFactionId,
    supportedFactionId,
    zoom
  ]);

  const fleetMarkers = useMemo(() => {
    return factions.flatMap((faction) => {
      const targetId = Object.entries(faction.relations).find(
        ([, relation]) => relation === "war"
      )?.[0];
      const target = targetId ? byId.get(targetId) : undefined;
      const navy = faction.military?.navy ?? 0;
      if (!target || navy < 1_000) return [];

      let dLon = target.lon - faction.lon;
      if (dLon > 180) dLon -= 360;
      if (dLon < -180) dLon += 360;
      const lat = faction.lat + (target.lat - faction.lat) * 0.22 - 2;
      const lon = ((faction.lon + dLon * 0.22 + 540) % 360) - 180;
      const [x, y] = flatProject(lat, lon);

      return [{
        id: `${faction.id}-fleet`,
        factionId: faction.id,
        x,
        y,
        navy,
        emoji: faction.emoji
      }];
    });
  }, [byId, factions]);

  return (
    <div className="map2d-shell">
      <svg
        ref={svgRef}
        className={tool === "territory" ? "map2d drawing" : "map2d"}
        viewBox={`${viewX} ${viewY} ${viewW} ${viewH}`}
        preserveAspectRatio="xMidYMid meet"
        onWheel={(event) => {
          event.preventDefault();
          updateZoom(zoom * (event.deltaY > 0 ? 0.88 : 1.14));
        }}
        onPointerDown={(event) => {
          if (tool === "territory") {
            addPoint(event.clientX, event.clientY);
            return;
          }
          if (tool === "nation") {
            createNationFromPointer(event.clientX, event.clientY);
            return;
          }

          movedRef.current = false;
          dragRef.current = {
            clientX: event.clientX,
            clientY: event.clientY,
            centerX: center.x,
            centerY: center.y
          };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          const svg = svgRef.current;
          if (!drag || !svg || tool === "territory") return;

          const rect = svg.getBoundingClientRect();
          const dx = ((event.clientX - drag.clientX) / rect.width) * viewW;
          const dy = ((event.clientY - drag.clientY) / rect.height) * viewH;
          if (Math.abs(dx) + Math.abs(dy) > 2) movedRef.current = true;
          setCenter(clampCenter(drag.centerX - dx, drag.centerY - dy));
        }}
        onPointerUp={(event) => {
          dragRef.current = null;
          try {
            event.currentTarget.releasePointerCapture(event.pointerId);
          } catch {
            // Pointer capture may already be released by the browser.
          }
        }}
        onPointerCancel={() => {
          dragRef.current = null;
        }}
      >
        <rect width={FLAT_W} height={FLAT_H} fill="#123d5a" />

        {worldMode === "earth"
          ? features.map((item, featureIndex) => {
              const numeric = item.id == null ? "" : String(Number(item.id));
              const factionId = byNumeric.get(numeric);
              const faction = factionId ? byId.get(factionId) : undefined;
              if (!faction) return null;

              const controller = faction.controlledBy
                ? byId.get(faction.controlledBy)
                : faction;
              const selected = selectedFactionId === faction.id;
              const supported = supportedFactionId === faction.id;

              return (
                <g key={`${numeric}-${featureIndex}`}>
                  {flatFeaturePaths(item).flatMap((path, pathIndex) =>
                    [0, -FLAT_W].map((shift) => (
                      <path
                        key={`${pathIndex}-${shift}`}
                        d={path}
                        transform={shift ? `translate(${shift} 0)` : undefined}
                        fill={controller?.color ?? faction.color}
                        fillOpacity={selected ? 1 : 0.84}
                        fillRule="evenodd"
                        stroke={
                          supported
                            ? "#ffd166"
                            : selected
                              ? "#ffffff"
                              : "#172331"
                        }
                        strokeWidth={(supported ? 2.5 : selected ? 1.8 : 0.65) / zoom}
                        vectorEffect="non-scaling-stroke"
                        onPointerDown={(event) => {
                          if (tool === "territory") {
                            event.stopPropagation();
                            addPoint(event.clientX, event.clientY);
                          } else if (tool === "nation") {
                            event.stopPropagation();
                            createNationFromPointer(event.clientX, event.clientY);
                          }
                        }}
                        onClick={() => {
                          if (
                            tool !== "territory" &&
                            tool !== "nation" &&
                            !movedRef.current
                          ) {
                            selectFaction(faction.id);
                          }
                        }}
                      />
                    ))
                  )}
                </g>
              );
            })
          : terrain.map((cell, index) => (
              <rect
                key={index}
                x={cell.x}
                y={cell.y}
                width={FLAT_W / 54 + 1}
                height={FLAT_H / 27 + 1}
                fill={cell.fill}
              />
            ))}

        {wars.map(([aId, bId]) => {
          const a = byId.get(aId);
          const b = byId.get(bId);
          if (!a || !b) return null;
          const [x1, y1] = flatProject(a.lat, a.lon);
          let [x2, y2] = flatProject(b.lat, b.lon);
          if (Math.abs(x2 - x1) > FLAT_W / 2) {
            x2 += x2 > x1 ? -FLAT_W : FLAT_W;
          }

          return (
            <line
              key={`${aId}-${bId}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              className="war-line"
              vectorEffect="non-scaling-stroke"
            />
          );
        })}

        {territories.map((territory) => {
          if (territory.points.length < 3) return null;
          const path =
            territory.points
              .map(([lat, lon], index) => {
                const [x, y] = flatProject(lat, lon);
                return `${index ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
              })
              .join(" ") + " Z";

          return (
            <path
              key={territory.id}
              d={path}
              fill={territory.color}
              fillOpacity={0.8}
              stroke="#ffffff"
              strokeWidth={0.8 / zoom}
              vectorEffect="non-scaling-stroke"
              onPointerDown={(event) => {
                if (tool !== "territory") return;
                event.stopPropagation();
                addPoint(event.clientX, event.clientY);
              }}
              onClick={() => {
                if (tool !== "territory" && !movedRef.current) {
                  selectTerritory(territory.id);
                }
              }}
            />
          );
        })}

        {draft.length > 0 && (
          <polyline
            points={draft
              .map(([lat, lon]) => flatProject(lat, lon).join(","))
              .join(" ")}
            fill="none"
            stroke="#ffffff"
            strokeWidth={2 / zoom}
            vectorEffect="non-scaling-stroke"
          />
        )}

        {zoom >= 2.2 &&
          factions.map((faction) => {
            const [x, y] = flatProject(faction.lat, faction.lon);
            if (!visible(x, y)) return null;
            return (
              <g
                key={`${faction.id}-capital`}
                className="city-marker capital-marker"
                onClick={() => selectFaction(faction.id)}
              >
                <circle
                  cx={x}
                  cy={y}
                  r={Math.max(1.2, 3 / zoom)}
                  fill="#f6d365"
                  stroke="#111820"
                  strokeWidth={0.8 / zoom}
                />
                {zoom >= 3.2 && (
                  <text
                    x={x + 4 / zoom}
                    y={y - 3 / zoom}
                    fontSize={Math.max(3, 8 / zoom)}
                    fill="#f4f7fb"
                  >
                    {faction.capital ?? faction.name}
                  </text>
                )}
              </g>
            );
          })}

        {zoom >= 4 &&
          factions.flatMap((faction) => {
            const [x, y] = flatProject(faction.lat, faction.lon);
            if (!visible(x, y, 35)) return [];
            const count = Math.min(8, Math.max(0, (faction.cityCount ?? 1) - 1));
            return Array.from({ length: count }, (_, index) => {
              const angle =
                deterministicCityAngle(faction.id, index) * Math.PI * 2;
              const radius = 6 + (index % 4) * 4;
              return (
                <circle
                  key={`${faction.id}-city-${index}`}
                  cx={x + Math.cos(angle) * radius}
                  cy={y + Math.sin(angle) * radius}
                  r={1.1}
                  fill="#dbe7f3"
                  opacity={0.85}
                />
              );
            });
          })}

        {zoom >= 6 &&
          factions.flatMap((faction) => {
            const [x, y] = flatProject(faction.lat, faction.lon);
            if (!visible(x, y, 45)) return [];
            const count = Math.min(14, Math.max(0, faction.townCount ?? 0));
            return Array.from({ length: count }, (_, index) => {
              const angle =
                deterministicCityAngle(faction.id + "-town", index) * Math.PI * 2;
              const radius = 10 + (index % 7) * 3.6;
              return (
                <rect
                  key={`${faction.id}-town-${index}`}
                  x={x + Math.cos(angle) * radius - 0.55}
                  y={y + Math.sin(angle) * radius - 0.55}
                  width={1.1}
                  height={1.1}
                  rx={0.2}
                  fill="#a9bbc9"
                  opacity={0.72}
                />
              );
            });
          })}

        {armyMarkers
          .filter((marker) => visible(marker.x, marker.y, 30))
          .map((marker) => (
            <g
              key={marker.id}
              className={marker.fighting ? "army-flag fighting" : "army-flag"}
              onClick={() => selectFaction(marker.factionId)}
            >
              <circle
                cx={marker.x}
                cy={marker.y}
                r={(marker.big ? 8 : 5.4) / Math.sqrt(zoom)}
                fill="rgba(7, 13, 20, .86)"
                stroke={
                  marker.factionId === supportedFactionId
                    ? "#ffd166"
                    : marker.color
                }
                strokeWidth={1.5 / Math.sqrt(zoom)}
                vectorEffect="non-scaling-stroke"
              />
              <text
                x={marker.x}
                y={marker.y + 2.2 / Math.sqrt(zoom)}
                textAnchor="middle"
                fontSize={(marker.big ? 8.5 : 6.4) / Math.sqrt(zoom)}
              >
                {marker.emoji}
              </text>
              {marker.big && (
                <text
                  x={marker.x}
                  y={marker.y + 14 / Math.sqrt(zoom)}
                  textAnchor="middle"
                  fontSize={6.2 / Math.sqrt(zoom)}
                  fill="#ffffff"
                  className="army-size-label"
                >
                  {marker.label}
                </text>
              )}
            </g>
          ))}

        {fleetMarkers
          .filter((fleet) => visible(fleet.x, fleet.y, 25))
          .map((fleet) => (
            <g
              key={fleet.id}
              className="fleet-marker"
              onClick={() => selectFaction(fleet.factionId)}
            >
              <circle
                cx={fleet.x}
                cy={fleet.y}
                r={6.2 / Math.sqrt(zoom)}
                fill="#0b2940"
                stroke="#60b9e8"
                strokeWidth={1.2 / Math.sqrt(zoom)}
              />
              <text
                x={fleet.x}
                y={fleet.y + 2 / Math.sqrt(zoom)}
                textAnchor="middle"
                fontSize={7 / Math.sqrt(zoom)}
              >
                ⚓
              </text>
              {zoom >= 2.3 && (
                <text
                  x={fleet.x}
                  y={fleet.y + 12 / Math.sqrt(zoom)}
                  textAnchor="middle"
                  fontSize={5.5 / Math.sqrt(zoom)}
                  fill="#93d9ff"
                >
                  {formatCompact(fleet.navy)}
                </text>
              )}
            </g>
          ))}

        {zoom >= 5 &&
          npcs
            .filter((npc) => npc.state !== "dead")
            .filter((npc) => {
              const [x, y] = flatProject(npc.lat, npc.lon);
              return visible(x, y, 10);
            })
            .slice(0, 900)
            .map((npc) => {
              const faction = byId.get(npc.factionId);
              const [x, y] = flatProject(npc.lat, npc.lon);
              const fighting = npc.state === "fighting";

              return (
                <g key={npc.id}>
                  <circle
                    cx={x}
                    cy={y}
                    r={fighting ? 1.8 : 1.25}
                    fill={faction?.color ?? "#ffffff"}
                    stroke={
                      fighting
                        ? "#ff3f4b"
                        : supportedFactionId === npc.factionId
                          ? "#ffd166"
                          : "#071019"
                    }
                    strokeWidth={0.55}
                  />
                  {fighting && (
                    <circle
                      cx={x}
                      cy={y}
                      r={3.2}
                      fill="none"
                      stroke="#ff6b6b"
                      strokeWidth={0.55}
                      className="battle-pulse"
                    />
                  )}
                </g>
              );
            })}
      </svg>

      <div className="map2d-hud">
        <strong>2D Strategy World</strong>
        <span>
          {tool === "territory"
            ? "Tap points to draw a territory."
            : zoom < 2.2
              ? "Strategic LOD: armies are grouped under national flags."
              : zoom < 5
                ? "Operational LOD: armies split into regiments and cities appear."
                : "Close LOD: tracked people and local battles are visible."}
        </span>
      </div>

      <div className="map-zoom-control">
        <button
          aria-label="Zoom out"
          onClick={() => updateZoom(zoom / 1.35)}
        >
          −
        </button>
        <label>
          <span>Zoom {zoom.toFixed(1)}×</span>
          <input
            type="range"
            min={1}
            max={8}
            step={0.1}
            value={zoom}
            onChange={(event) => updateZoom(Number(event.target.value))}
          />
        </label>
        <button
          aria-label="Zoom in"
          onClick={() => updateZoom(zoom * 1.35)}
        >
          +
        </button>
      </div>
    </div>
  );
}

function deterministicCityAngle(id: string, index: number) {
  let hash = index * 131 + 17;
  for (let i = 0; i < id.length; i += 1) {
    hash = Math.imul(hash ^ id.charCodeAt(i), 16777619);
  }
  return ((hash >>> 0) % 10_000) / 10_000;
}
