
import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

interface Rose3DProps {
  scrollProgress?: number; // 0 to 1
}

const Rose3D: React.FC<Rose3DProps> = ({ scrollProgress = 0 }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const roseGroupRef = useRef<THREE.Group>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const butterfliesRef = useRef<THREE.Group[]>([]);

  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xffffff, 0.015);

    const camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 1000);
    cameraRef.current = camera;
    camera.position.set(0, 4, 14);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    mountRef.current.appendChild(renderer.domElement);

    // Cinematic Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const topLight = new THREE.DirectionalLight(0xffffff, 2.5);
    topLight.position.set(5, 10, 5);
    scene.add(topLight);

    const backLight = new THREE.PointLight(0xff3366, 20, 50);
    backLight.position.set(-5, 5, -5);
    scene.add(backLight);

    const roseGroup = new THREE.Group();
    roseGroupRef.current = roseGroup;

    // --- Elegant Petal System ---
    const petalMat = new THREE.MeshPhysicalMaterial({
      color: 0x990000,
      roughness: 0.6,
      metalness: 0.1,
      clearcoat: 0.2,
      side: THREE.DoubleSide,
      sheen: 1,
      sheenColor: 0xff0000,
      sheenRoughness: 0.4
    });

    for (let i = 0; i < 90; i++) {
      const layer = Math.floor(i / 12);
      const angle = (i % 12) * (Math.PI * 2 / 12) + (layer * 0.45);
      const radius = 0.2 + (layer * 0.45);
      const size = 2.4 - (layer * 0.15);
      
      const petalGeo = new THREE.SphereGeometry(size, 32, 32, 0, Math.PI / 1.4);
      petalGeo.scale(1, 1.5, 0.25);
      const petal = new THREE.Mesh(petalGeo, petalMat);
      
      petal.rotation.z = angle;
      petal.rotation.x = 0.5 + (layer * 0.4);
      petal.position.x = Math.cos(angle) * radius * 0.25;
      petal.position.z = Math.sin(angle) * radius * 0.25;
      petal.position.y = layer * 0.15;
      
      roseGroup.add(petal);
    }

    // High Detail Stem
    const stemGeo = new THREE.CylinderGeometry(0.08, 0.12, 40, 16);
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x1a2e1a, roughness: 0.9 });
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.y = -20;
    roseGroup.add(stem);

    // --- Three Detailed Leaves ---
    const createLeaf = (y: number, rotation: number, scale: number) => {
      const leafShape = new THREE.Shape();
      leafShape.moveTo(0, 0);
      leafShape.bezierCurveTo(0.5, 0.5, 1, 1, 0, 2.5);
      leafShape.bezierCurveTo(-1, 1, -0.5, 0.5, 0, 0);

      const leafGeo = new THREE.ShapeGeometry(leafShape);
      const leafMat = new THREE.MeshPhysicalMaterial({
        color: 0x2d5a27,
        side: THREE.DoubleSide,
        roughness: 0.7,
        sheen: 0.5,
        sheenColor: 0x3e7a36
      });

      const leaf = new THREE.Mesh(leafGeo, leafMat);
      leaf.scale.set(scale, scale, scale);
      leaf.position.y = y;
      leaf.rotation.z = rotation;
      leaf.rotation.x = -0.5;
      return leaf;
    };

    const leaf1 = createLeaf(-2, Math.PI / 4, 1.2);
    const leaf2 = createLeaf(-5, -Math.PI / 3, 1.0);
    const leaf3 = createLeaf(-8, Math.PI / 6, 0.8);
    
    roseGroup.add(leaf1);
    roseGroup.add(leaf2);
    roseGroup.add(leaf3);

    scene.add(roseGroup);

    // --- Cinematic Butterflies & Trail ---
    const createButterfly = (color: number) => {
      const group = new THREE.Group();
      const wingShape = new THREE.Shape();
      wingShape.moveTo(0, 0);
      wingShape.bezierCurveTo(0.6, 0.6, 1.2, 0.3, 0.9, -0.6);
      wingShape.bezierCurveTo(0.7, -1.2, 0, -0.3, 0, 0);

      const wingMat = new THREE.MeshPhongMaterial({ 
        color, 
        side: THREE.DoubleSide, 
        transparent: true, 
        opacity: 0.9,
        shininess: 150,
        specular: 0xffffff
      });

      const leftWing = new THREE.Mesh(new THREE.ShapeGeometry(wingShape), wingMat);
      leftWing.scale.set(0.6, 0.6, 0.6);
      group.add(leftWing);

      const rightWing = leftWing.clone();
      rightWing.rotation.y = Math.PI;
      group.add(rightWing);

      group.userData = { 
        phase: Math.random() * Math.PI * 2,
        speed: 0.015 + Math.random() * 0.04,
        leftWing, rightWing,
        orbitX: (Math.random() - 0.5) * 18,
        orbitY: (Math.random() - 0.5) * 15,
        orbitZ: (Math.random() - 0.5) * 12
      };
      return group;
    };

    const colors = [0xff1493, 0xff69b4, 0xffffff, 0xffd700];
    for (let i = 0; i < 15; i++) {
      const b = createButterfly(colors[i % colors.length]);
      butterfliesRef.current.push(b);
      scene.add(b);
    }

    // Stardust Trails
    const partCount = 400;
    const partGeo = new THREE.BufferGeometry();
    const partPos = new Float32Array(partCount * 3);
    for(let i=0; i<partCount*3; i++) partPos[i] = (Math.random()-0.5)*30;
    partGeo.setAttribute('position', new THREE.BufferAttribute(partPos, 3));
    const partMat = new THREE.PointsMaterial({ color: 0xffd700, size: 0.05, transparent: true, opacity: 0.6 });
    const points = new THREE.Points(partGeo, partMat);
    scene.add(points);

    const animate = () => {
      requestAnimationFrame(animate);
      const time = Date.now() * 0.001;
      
      roseGroup.rotation.y += 0.0015;
      roseGroup.position.y = Math.sin(time * 0.4) * 0.15;

      butterfliesRef.current.forEach((b) => {
        const d = b.userData;
        const flap = Math.sin(time * 18) * 0.85;
        d.leftWing.rotation.y = flap;
        d.rightWing.rotation.y = -flap;

        b.position.x = d.orbitX + Math.sin(time * d.speed + d.phase) * 7;
        b.position.y = d.orbitY + Math.cos(time * d.speed * 1.1 + d.phase) * 6;
        b.position.z = d.orbitZ + Math.sin(time * d.speed * 0.9 + d.phase) * 5;
        
        b.lookAt(
          b.position.x + Math.cos(time * d.speed),
          b.position.y + Math.sin(time * d.speed),
          b.position.z
        );
      });

      points.rotation.y += 0.001;
      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      const w = mountRef.current?.clientWidth || width;
      const h = mountRef.current?.clientHeight || height;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => {
    if (!cameraRef.current) return;
    const targetY = 4 - (scrollProgress * 28);
    const targetZ = 14 + (scrollProgress * 6);
    cameraRef.current.position.y += (targetY - cameraRef.current.position.y) * 0.04;
    cameraRef.current.position.z += (targetZ - cameraRef.current.position.z) * 0.04;
    cameraRef.current.lookAt(0, -scrollProgress * 18, 0);
  }, [scrollProgress]);

  return <div ref={mountRef} className="w-full h-full fixed inset-0 z-0 pointer-events-none opacity-90" />;
};

export default Rose3D;
