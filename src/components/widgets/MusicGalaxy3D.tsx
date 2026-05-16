import { Suspense, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { GalaxyNode } from "@/lib/spotify/types";

interface GalaxyProps {
  nodes: GalaxyNode[];
}

export function MusicGalaxy3D({ nodes }: GalaxyProps) {
  const [hovered, setHovered] = useState<GalaxyNode | null>(null);

  return (
    <div className="relative h-[520px] w-full overflow-hidden rounded-b-2xl">
      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Spinning up the galaxy…
          </div>
        }
      >
        <Canvas
          camera={{ position: [0, 0, 18], fov: 55 }}
          dpr={[1, 1.6]}
          gl={{ antialias: true, alpha: true }}
        >
          <color attach="background" args={["#0b0b0b"]} />
          <fog attach="fog" args={["#0b0b0b", 16, 38]} />
          <ambientLight intensity={0.35} />
          <pointLight position={[10, 10, 10]} intensity={0.4} color="#1DB954" />
          <Stars />
          <NodeCloud nodes={nodes} onHover={setHovered} />
          <OrbitControls
            enablePan={false}
            enableZoom={true}
            autoRotate
            autoRotateSpeed={0.35}
            minDistance={10}
            maxDistance={32}
          />
        </Canvas>
      </Suspense>

      {/* Hover tooltip */}
      <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full border border-white/10 bg-background/70 px-4 py-1.5 text-xs text-muted-foreground backdrop-blur">
        Drag to orbit · scroll to zoom · hover stars to inspect
      </div>
      {hovered && (
        <div className="pointer-events-none absolute bottom-4 left-4 max-w-xs rounded-xl border border-primary/30 bg-background/85 px-4 py-3 backdrop-blur-md">
          <div className="text-[10px] uppercase tracking-[0.18em] text-primary">
            {hovered.artist}
          </div>
          <div className="mt-0.5 font-display text-sm font-medium text-foreground">
            {hovered.name}
          </div>
        </div>
      )}
    </div>
  );
}

function Stars() {
  // A static back-layer of dim stars.
  const positions = useMemo(() => {
    const arr = new Float32Array(800 * 3);
    for (let i = 0; i < 800; i++) {
      const r = 24 + Math.random() * 12;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.cos(phi);
      arr[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    return arr;
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        color="#ffffff"
        transparent
        opacity={0.4}
        sizeAttenuation
      />
    </points>
  );
}

function NodeCloud({
  nodes,
  onHover,
}: {
  nodes: GalaxyNode[];
  onHover: (n: GalaxyNode | null) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_state, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.04;
  });

  return (
    <group ref={groupRef}>
      {nodes.map((node) => (
        <Star key={node.id} node={node} onHover={onHover} />
      ))}
    </group>
  );
}

function Star({
  node,
  onHover,
}: {
  node: GalaxyNode;
  onHover: (n: GalaxyNode | null) => void;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const color = useMemo(
    () => new THREE.Color().setHSL(node.hue / 360, 0.7, 0.55),
    [node.hue],
  );

  return (
    <mesh
      ref={ref}
      position={[node.x, node.y, node.z]}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover(node);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        onHover(null);
        document.body.style.cursor = "auto";
      }}
    >
      <sphereGeometry args={[node.size, 12, 12]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.6 + node.brightness * 1.4}
        toneMapped={false}
      />
    </mesh>
  );
}
