import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { Html, OrbitControls, Stars, TransformControls } from "@react-three/drei";
import { feature } from "topojson-client";
import worldAtlas from "world-atlas/countries-110m.json";
import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
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

  if (!selected || tool === "select" || tool === "territory") return group;

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
  const selectObject = useGameStore((state) => state.selectObject);

  return (
    <Canvas
      onPointerMissed={() => selectObject(null)}
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
