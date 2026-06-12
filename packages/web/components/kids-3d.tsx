"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Float, RoundedBox } from "@react-three/drei";
import { useRef } from "react";
import type { Group, Mesh } from "three";

const CANDY = {
  coral: "#FF7A66",
  sky: "#4DABF7",
  mint: "#3FD0A8",
  grape: "#9775FA",
  sunshine: "#FFC53D",
} as const;

function Block({
  position,
  color,
  scale = 1,
  spin = 1,
}: {
  position: [number, number, number];
  color: string;
  scale?: number;
  spin?: number;
}) {
  const ref = useRef<Mesh>(null);
  useFrame((_, dt) => {
    if (!ref.current) return;
    ref.current.rotation.x += dt * 0.4 * spin;
    ref.current.rotation.y += dt * 0.6 * spin;
  });
  return (
    <Float speed={2.4} rotationIntensity={0.5} floatIntensity={1.3}>
      <RoundedBox
        ref={ref}
        args={[1, 1, 1]}
        radius={0.16}
        smoothness={4}
        position={position}
        scale={scale}
      >
        <meshStandardMaterial color={color} roughness={0.35} metalness={0.05} />
      </RoundedBox>
    </Float>
  );
}

function Ball({
  position,
  color,
  radius = 0.6,
}: {
  position: [number, number, number];
  color: string;
  radius?: number;
}) {
  return (
    <Float speed={3} rotationIntensity={0.4} floatIntensity={2}>
      <mesh position={position}>
        <sphereGeometry args={[radius, 32, 32]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.05} />
      </mesh>
    </Float>
  );
}

function Toys() {
  const group = useRef<Group>(null);
  useFrame((_, dt) => {
    if (group.current) group.current.rotation.y += dt * 0.25;
  });
  return (
    <group ref={group}>
      <Block position={[-1.5, 0.3, 0]} color={CANDY.coral} />
      <Block position={[0, 1.2, -0.6]} color={CANDY.sky} scale={0.8} spin={-1} />
      <Block position={[1.5, -0.1, 0.2]} color={CANDY.mint} />
      <Block position={[0.2, 0.1, 1.1]} color={CANDY.grape} scale={0.7} spin={1.4} />
      <Ball position={[0.3, -1.2, 0.5]} color={CANDY.sunshine} />
    </group>
  );
}

/** Transparent canvas of floating, spinning kindergarten toys (three.js). */
export function KidsToys3D() {
  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 42 }}
      gl={{ alpha: true, antialias: true }}
      dpr={[1, 2]}
    >
      <ambientLight intensity={0.9} />
      <directionalLight position={[4, 6, 5]} intensity={1.4} />
      <directionalLight position={[-4, -2, -3]} intensity={0.4} color="#9775FA" />
      <Toys />
    </Canvas>
  );
}
