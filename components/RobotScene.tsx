import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { RobotState, InteractionState } from '../types';

interface RobotProps {
  state: RobotState;
  interactionState: InteractionState;
}

const RobotModel: React.FC<RobotProps> = ({ state, interactionState }) => {
    const groupRef = useRef<THREE.Group>(null);
    const headRef = useRef<THREE.Group>(null);
    const torsoRef = useRef<THREE.Mesh>(null);
    const leftEyeRef = useRef<THREE.Mesh>(null);
    const rightEyeRef = useRef<THREE.Mesh>(null);
    const mouthRef = useRef<THREE.Mesh>(null);
    const leftArmRef = useRef<THREE.Group>(null);
    const rightArmRef = useRef<THREE.Group>(null);

    // Blinking state
    const blinkState = useRef({ nextBlink: 0, isBlinking: false });

    const eyeColor = useMemo(() => {
        switch (state) {
            case RobotState.LISTENING: return '#03dac6'; // Teal for listening
            case RobotState.THINKING: return '#6200ee'; // Purple for thinking
            case RobotState.SPEAKING: return '#f50057'; // Pink for speaking
            default: return '#03dac6'; // Default to teal
        }
    }, [state]);

    useFrame(({ clock }, delta) => {
        const time = clock.getElapsedTime();
        const refs = [groupRef, headRef, torsoRef, leftEyeRef, rightEyeRef, leftArmRef, rightArmRef, mouthRef];
        if (refs.some(ref => !ref.current)) return;

        // --- Damping factor for smooth transitions ---
        const dampFactor = delta * 8;

        // --- Body Bobbing and Breathing ---
        groupRef.current!.position.y = THREE.MathUtils.damp(groupRef.current!.position.y, Math.sin(time * 1.5) * 0.05, 4, delta);
        const breath = Math.sin(time * 0.8) * 0.01 + 1;
        torsoRef.current!.scale.set(1, breath, 1);

        // --- Define animation targets ---
        let headTargetX = 0, headTargetY = 0, headTargetZ = 0;
        let leftArmTargetX = 0, leftArmTargetZ = 0;
        let rightArmTargetX = 0, rightArmTargetZ = 0;
        let eyeIntensity = 1;
        
        // --- Base animations from RobotState ---
        switch (state) {
            case RobotState.IDLE:
                // More complex, organic head movement
                headTargetY = Math.sin(time * 0.5) * 0.2 + Math.cos(time * 0.7) * 0.1;
                headTargetZ = Math.sin(time * 0.4) * 0.05;
                // Subtle arm drift
                leftArmTargetZ = Math.sin(time * 0.4) * 0.1;
                rightArmTargetZ = -Math.sin(time * 0.45) * 0.1;
                break;
            case RobotState.LISTENING:
                // Leans head in slightly
                headTargetX = 0.25;
                headTargetY = 0.1;
                headTargetZ = Math.sin(time * 2.5) * 0.08;
                break;
            case RobotState.THINKING:
                // "Thinking" pose: head tilt, one arm to "chin"
                headTargetX = 0.3;
                headTargetY = -0.4;
                headTargetZ = Math.cos(time * 0.8) * 0.1;
                rightArmTargetX = -1.4;
                rightArmTargetZ = -0.4;
                leftArmTargetX = 0.2; // Other arm slightly back
                eyeIntensity = 1 + Math.sin(time * 3) * 0.5; // Pulsating eyes
                break;
            case RobotState.SPEAKING:
                // Expressive speaking animations
                headTargetX = 0.1 + Math.abs(Math.sin(time * 12)) * 0.1; // Nodding motion
                headTargetZ = Math.sin(time * 9) * 0.05;
                // Gesticulating arms
                leftArmTargetX = -0.2 + Math.sin(time * 8) * 0.1;
                leftArmTargetZ = 0.1 + Math.sin(time * 8) * 0.15;
                rightArmTargetX = -0.2 + Math.cos(time * 7) * 0.1;
                rightArmTargetZ = -0.1 + Math.cos(time * 7) * 0.15;
                break;
        }

        // --- Overriding animations from InteractionState ---
        switch (interactionState) {
            case InteractionState.USER_TYPING:
                // Looks up attentively
                headTargetX = -0.2;
                headTargetY = 0.3;
                break;
            case InteractionState.CONFIRMATION:
                // A quick, sharp nod
                headTargetX = 0.6;
                headTargetY = 0;
                headTargetZ = 0;
                break;
            case InteractionState.ANALYSIS_COMPLETE:
                // Excited "ta-da!" presentation gesture
                headTargetX = Math.sin(time * 8) * 0.1;
                leftArmTargetX = -0.8;
                leftArmTargetZ = 1.2;
                rightArmTargetX = -0.8;
                rightArmTargetZ = -1.2;
                eyeIntensity = 2; // Bright flash for emphasis
                break;
        }

        // --- Smooth Interpolation (DAMP) for natural movement ---
        headRef.current!.rotation.x = THREE.MathUtils.damp(headRef.current!.rotation.x, headTargetX, 4, delta);
        headRef.current!.rotation.y = THREE.MathUtils.damp(headRef.current!.rotation.y, headTargetY, 4, delta);
        headRef.current!.rotation.z = THREE.MathUtils.damp(headRef.current!.rotation.z, headTargetZ, 4, delta);
        
        leftArmRef.current!.rotation.x = THREE.MathUtils.damp(leftArmRef.current!.rotation.x, leftArmTargetX, 4, delta);
        leftArmRef.current!.rotation.z = THREE.MathUtils.damp(leftArmRef.current!.rotation.z, leftArmTargetZ, 4, delta);
        
        rightArmRef.current!.rotation.x = THREE.MathUtils.damp(rightArmRef.current!.rotation.x, rightArmTargetX, 4, delta);
        rightArmRef.current!.rotation.z = THREE.MathUtils.damp(rightArmRef.current!.rotation.z, rightArmTargetZ, 4, delta);
        
        // --- Eye and Mouth Animation ---
        
        // Blinking
        if (time > blinkState.current.nextBlink && state !== RobotState.SPEAKING) {
            blinkState.current.isBlinking = true;
            blinkState.current.nextBlink = time + Math.random() * 4 + 2; // Blink every 2-6 seconds
        }
        if (blinkState.current.isBlinking) {
            leftEyeRef.current!.scale.y = Math.max(0.01, leftEyeRef.current!.scale.y - 0.2);
            rightEyeRef.current!.scale.y = Math.max(0.01, rightEyeRef.current!.scale.y - 0.2);
            if (leftEyeRef.current!.scale.y <= 0.01) {
                blinkState.current.isBlinking = false;
            }
        } else {
            leftEyeRef.current!.scale.y = Math.min(1, leftEyeRef.current!.scale.y + 0.2);
            rightEyeRef.current!.scale.y = Math.min(1, rightEyeRef.current!.scale.y + 0.2);
        }

        // Apply dynamic eye intensity
        const leftEyeMaterial = leftEyeRef.current!.material as THREE.MeshStandardMaterial;
        const rightEyeMaterial = rightEyeRef.current!.material as THREE.MeshStandardMaterial;
        leftEyeMaterial.emissiveIntensity = THREE.MathUtils.damp(leftEyeMaterial.emissiveIntensity, eyeIntensity, 8, delta);
        rightEyeMaterial.emissiveIntensity = THREE.MathUtils.damp(rightEyeMaterial.emissiveIntensity, eyeIntensity, 8, delta);

        // Speaking
        if (state === RobotState.SPEAKING) {
             // More realistic lip-sync simulation
            const mouthOpenScale = Math.max(0.05, (Math.sin(time * 25) + Math.sin(time * 18)) / 4 + 0.3);
            mouthRef.current!.scale.y = mouthOpenScale;
            (mouthRef.current!.material as THREE.MeshStandardMaterial).emissiveIntensity = mouthOpenScale * 1.5;

        } else {
            mouthRef.current!.scale.y = THREE.MathUtils.damp(mouthRef.current!.scale.y, 0.05, 4, delta);
            const currentMouthIntensity = (mouthRef.current!.material as THREE.MeshStandardMaterial).emissiveIntensity;
            (mouthRef.current!.material as THREE.MeshStandardMaterial).emissiveIntensity = THREE.MathUtils.damp(currentMouthIntensity, 0, 4, delta);
        }
    });

    return (
        <group ref={groupRef}>
            {/* Torso */}
            <mesh ref={torsoRef} position={[0, 0.4, 0]}>
                <cylinderGeometry args={[0.3, 0.45, 1, 32]} />
                <meshStandardMaterial color="#424242" roughness={0.3} metalness={0.8} />
            </mesh>

            {/* Shoulders */}
            <mesh position={[-0.45, 0.75, 0]}>
                <sphereGeometry args={[0.15]} />
                <meshStandardMaterial color="#303030" roughness={0.3} metalness={0.8} />
            </mesh>
            <mesh position={[0.45, 0.75, 0]}>
                <sphereGeometry args={[0.15]} />
                <meshStandardMaterial color="#303030" roughness={0.3} metalness={0.8} />
            </mesh>

            {/* Left Arm */}
            <group ref={leftArmRef} position={[-0.45, 0.75, 0]}>
                <mesh position={[0, -0.4, 0]}>
                    <cylinderGeometry args={[0.08, 0.08, 0.8, 16]} />
                    <meshStandardMaterial color="#303030" roughness={0.3} metalness={0.8} />
                </mesh>
            </group>

            {/* Right Arm */}
            <group ref={rightArmRef} position={[0.45, 0.75, 0]}>
                 <mesh position={[0, -0.4, 0]}>
                    <cylinderGeometry args={[0.08, 0.08, 0.8, 16]} />
                    <meshStandardMaterial color="#303030" roughness={0.3} metalness={0.8} />
                </mesh>
            </group>

            {/* Head */}
            <group ref={headRef} position={[0, 1.25, 0]}>
                <mesh>
                    <sphereGeometry args={[0.4, 32, 16]} />
                    <meshStandardMaterial color="#303030" roughness={0.3} metalness={0.8} />
                </mesh>

                {/* Eyes */}
                <mesh ref={leftEyeRef} position={[-0.15, 0.1, 0.35]}>
                    <circleGeometry args={[0.08, 32]} />
                    <meshStandardMaterial color={eyeColor} emissive={eyeColor} emissiveIntensity={1} toneMapped={false} />
                </mesh>
                <mesh ref={rightEyeRef} position={[0.15, 0.1, 0.35]}>
                    <circleGeometry args={[0.08, 32]} />
                    <meshStandardMaterial color={eyeColor} emissive={eyeColor} emissiveIntensity={1} toneMapped={false} />
                </mesh>
                
                {/* Mouth */}
                <mesh ref={mouthRef} position={[0, -0.1, 0.36]} scale-y={0.05}>
                    <planeGeometry args={[0.2, 0.05]} />
                    <meshStandardMaterial color={eyeColor} emissive={eyeColor} emissiveIntensity={0} toneMapped={false} />
                </mesh>
            </group>

            {/* Neck */}
            <mesh position={[0, 0.9, 0]}>
                <cylinderGeometry args={[0.15, 0.15, 0.1]} />
                <meshStandardMaterial color="#212121" roughness={0.1} metalness={0.9} />
            </mesh>
        </group>
    );
};


const RobotScene: React.FC<RobotProps> = ({ state, interactionState }) => {
  return (
    <div className="w-full h-full bg-black rounded-lg overflow-hidden">
        <Canvas camera={{ position: [0, 1, 3], fov: 50 }}>
            <ambientLight intensity={0.5} />
            <pointLight position={[5, 5, 5]} intensity={150} />
            <pointLight position={[-5, -5, 5]} intensity={100} color="#6200ee" />
            <spotLight position={[0, 5, -5]} angle={0.3} penumbra={0.2} intensity={200} castShadow />
            <RobotModel state={state} interactionState={interactionState} />
            <OrbitControls enableZoom={false} enablePan={false} minPolarAngle={Math.PI / 3} maxPolarAngle={Math.PI / 1.8} target={[0, 0.8, 0]}/>
        </Canvas>
    </div>
  );
};

export default RobotScene;