"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Float, RoundedBox } from "@react-three/drei";
import { useRef } from "react";
import type { Group, Mesh } from "three";

const C = {
  coral: "#FF7A66",
  sky: "#4DABF7",
  mint: "#3FD0A8",
  grape: "#9775FA",
  sunshine: "#FFC53D",
  bubblegum: "#FF8FB1",
  paper: "#FFFFFF",
  wood: "#F2C49B",
  ink: "#1C2540",
} as const;

type Vec3 = [number, number, number];

/** A rounded alphabet block that tumbles slowly. */
function Block({
  position,
  color,
  scale = 1,
  spin = 1,
}: {
  position: Vec3;
  color: string;
  scale?: number;
  spin?: number;
}) {
  const ref = useRef<Mesh>(null);
  useFrame((_, dt) => {
    if (!ref.current) return;
    ref.current.rotation.x += dt * 0.4 * spin;
    ref.current.rotation.y += dt * 0.55 * spin;
  });
  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1.2}>
      <RoundedBox
        ref={ref}
        args={[1, 1, 1]}
        radius={0.16}
        smoothness={4}
        position={position}
        scale={scale}
      >
        <meshStandardMaterial color={color} roughness={0.45} />
      </RoundedBox>
    </Float>
  );
}

/** An open storybook. */
function Book({
  position,
  cover = C.coral,
  scale = 1,
}: {
  position: Vec3;
  cover?: string;
  scale?: number;
}) {
  const ref = useRef<Group>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.3;
  });
  return (
    <Float speed={1.6} rotationIntensity={0.4} floatIntensity={1.4}>
      <group ref={ref} position={position} scale={scale} rotation={[0.5, 0, 0]}>
        <mesh position={[-0.5, -0.07, 0]} rotation={[0, 0, 0.14]}>
          <boxGeometry args={[1.05, 0.07, 1.5]} />
          <meshStandardMaterial color={cover} roughness={0.5} />
        </mesh>
        <mesh position={[0.5, -0.07, 0]} rotation={[0, 0, -0.14]}>
          <boxGeometry args={[1.05, 0.07, 1.5]} />
          <meshStandardMaterial color={cover} roughness={0.5} />
        </mesh>
        <mesh position={[-0.5, 0, 0]} rotation={[0, 0, 0.14]}>
          <boxGeometry args={[0.96, 0.05, 1.4]} />
          <meshStandardMaterial color={C.paper} roughness={0.7} />
        </mesh>
        <mesh position={[0.5, 0, 0]} rotation={[0, 0, -0.14]}>
          <boxGeometry args={[0.96, 0.05, 1.4]} />
          <meshStandardMaterial color={C.paper} roughness={0.7} />
        </mesh>
      </group>
    </Float>
  );
}

/** A striped playground ball. */
function Ball({ position, scale = 1 }: { position: Vec3; scale?: number }) {
  return (
    <Float speed={2.6} rotationIntensity={0.6} floatIntensity={1.8}>
      <group position={position} scale={scale}>
        <mesh>
          <sphereGeometry args={[0.55, 32, 32]} />
          <meshStandardMaterial color={C.sky} roughness={0.3} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.55, 0.07, 16, 48]} />
          <meshStandardMaterial color={C.paper} />
        </mesh>
        <mesh>
          <torusGeometry args={[0.55, 0.07, 16, 48]} />
          <meshStandardMaterial color={C.paper} />
        </mesh>
      </group>
    </Float>
  );
}

/** A spinning pencil. */
function Pencil({ position, scale = 1 }: { position: Vec3; scale?: number }) {
  const ref = useRef<Group>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.z += dt * 0.4;
  });
  return (
    <Float speed={2.2} rotationIntensity={0.3} floatIntensity={1.6}>
      <group ref={ref} position={position} scale={scale} rotation={[0, 0, Math.PI / 5]}>
        <mesh>
          <cylinderGeometry args={[0.13, 0.13, 1.3, 16]} />
          <meshStandardMaterial color={C.sunshine} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.74, 0]}>
          <cylinderGeometry args={[0.13, 0.13, 0.18, 16]} />
          <meshStandardMaterial color={C.bubblegum} />
        </mesh>
        <mesh position={[0, -0.78, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.13, 0.3, 16]} />
          <meshStandardMaterial color={C.wood} />
        </mesh>
        <mesh position={[0, -0.96, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.05, 0.12, 16]} />
          <meshStandardMaterial color={C.ink} />
        </mesh>
      </group>
    </Float>
  );
}

/** A floating balloon on a string. */
function Balloon({
  position,
  color,
  scale = 1,
}: {
  position: Vec3;
  color: string;
  scale?: number;
}) {
  return (
    <Float speed={3} rotationIntensity={0.3} floatIntensity={2.2}>
      <group position={position} scale={scale}>
        <mesh position={[0, 0.4, 0]}>
          <sphereGeometry args={[0.42, 24, 24]} />
          <meshStandardMaterial color={color} roughness={0.25} />
        </mesh>
        <mesh position={[0, -0.02, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.1, 0.16, 12]} />
          <meshStandardMaterial color={color} />
        </mesh>
        <mesh position={[0, -0.5, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.9, 6]} />
          <meshStandardMaterial color="#B9C2D0" />
        </mesh>
      </group>
    </Float>
  );
}

function Scene() {
  const group = useRef<Group>(null);
  useFrame((_, dt) => {
    if (group.current) group.current.rotation.y += dt * 0.18;
  });
  return (
    <group ref={group} position={[0, -0.1, 0]}>
      <Book position={[-1.7, 0.4, 0]} cover={C.coral} />
      <Block position={[0, 1.35, -0.4]} color={C.sky} scale={0.7} spin={-1} />
      <Block position={[1.7, 0.5, 0.2]} color={C.mint} scale={0.9} />
      <Ball position={[1.4, -0.9, 0.6]} scale={0.9} />
      <Pencil position={[-1.4, -0.9, 0.4]} scale={0.9} />
      <Balloon position={[0.5, -0.1, 1.1]} color={C.grape} scale={0.9} />
      <Block position={[-0.2, -0.3, 0.3]} color={C.sunshine} scale={0.6} spin={1.3} />
    </group>
  );
}

/** Transparent canvas of floating kindergarten toys & books (three.js). */
export function KidsToys3D() {
  return (
    <Canvas
      camera={{ position: [0, 0.4, 7], fov: 40 }}
      gl={{ alpha: true, antialias: true }}
      dpr={[1, 2]}
    >
      <ambientLight intensity={0.8} />
      <hemisphereLight args={["#ffffff", "#cfe6ff", 0.6]} />
      <directionalLight position={[5, 7, 5]} intensity={1.4} />
      <directionalLight position={[-5, -2, -4]} intensity={0.4} color={C.grape} />
      <Scene />
      <ContactShadows
        position={[0, -2.2, 0]}
        opacity={0.22}
        scale={12}
        blur={2.6}
        far={4}
        color={C.ink}
      />
    </Canvas>
  );
}
