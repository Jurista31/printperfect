import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, RotateCcw, ZoomIn, ZoomOut, Move3d, X, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Minimal STL parser (binary + ASCII) — no external dep needed
function parseSTL(buffer) {
  const text = new TextDecoder().decode(new Uint8Array(buffer, 0, 80));
  if (text.startsWith('solid') && !isBinarySTL(buffer)) {
    return parseASCII(new TextDecoder().decode(buffer));
  }
  return parseBinary(buffer);
}

function isBinarySTL(buffer) {
  const view = new DataView(buffer);
  const triangles = view.getUint32(80, true);
  return buffer.byteLength === 84 + triangles * 50;
}

function parseBinary(buffer) {
  const view = new DataView(buffer);
  const triangles = view.getUint32(80, true);
  const positions = new Float32Array(triangles * 9);
  const normals = new Float32Array(triangles * 9);
  let offset = 84;
  for (let i = 0; i < triangles; i++) {
    const nx = view.getFloat32(offset, true);
    const ny = view.getFloat32(offset + 4, true);
    const nz = view.getFloat32(offset + 8, true);
    offset += 12;
    for (let v = 0; v < 3; v++) {
      const pi = (i * 3 + v) * 3;
      positions[pi] = view.getFloat32(offset, true);
      positions[pi + 1] = view.getFloat32(offset + 4, true);
      positions[pi + 2] = view.getFloat32(offset + 8, true);
      normals[pi] = nx; normals[pi + 1] = ny; normals[pi + 2] = nz;
      offset += 12;
    }
    offset += 2; // attribute byte count
  }
  return { positions, normals };
}

function parseASCII(text) {
  const posArr = [], norArr = [];
  const normalRe = /facet\s+normal\s+([\d.eE+\-]+)\s+([\d.eE+\-]+)\s+([\d.eE+\-]+)/g;
  const vertexRe = /vertex\s+([\d.eE+\-]+)\s+([\d.eE+\-]+)\s+([\d.eE+\-]+)/g;
  let nm, vm;
  while ((nm = normalRe.exec(text)) !== null) {
    const nx = parseFloat(nm[1]), ny = parseFloat(nm[2]), nz = parseFloat(nm[3]);
    for (let v = 0; v < 3; v++) {
      vm = vertexRe.exec(text);
      if (vm) {
        posArr.push(parseFloat(vm[1]), parseFloat(vm[2]), parseFloat(vm[3]));
        norArr.push(nx, ny, nz);
      }
    }
  }
  return { positions: new Float32Array(posArr), normals: new Float32Array(norArr) };
}

export default function STLViewer({ onStlLoaded, onStlRemoved, compact = false }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const meshRef = useRef(null);
  const animFrameRef = useRef(null);
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const rotation = useRef({ x: 0.3, y: 0.3 });
  const zoom = useRef(1);

  const [fileName, setFileName] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const initScene = useCallback(() => {
    if (!mountRef.current || rendererRef.current) return; // prevent double-init
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.01, 1000);
    camera.position.set(0, 0, 3);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights
    const ambient = new THREE.AmbientLight(0x334155, 1.2);
    scene.add(ambient);
    const dir1 = new THREE.DirectionalLight(0x67e8f9, 1.5);
    dir1.position.set(1, 2, 3);
    scene.add(dir1);
    const dir2 = new THREE.DirectionalLight(0x818cf8, 0.8);
    dir2.position.set(-2, -1, -2);
    scene.add(dir2);

    // Grid
    const grid = new THREE.GridHelper(4, 20, 0x1e293b, 0x1e293b);
    grid.position.y = -1;
    scene.add(grid);

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      if (meshRef.current && !isDragging.current) {
        meshRef.current.rotation.y += 0.003;
      }
      renderer.render(scene, camera);
    };
    animate();
  }, []);

  const loadGeometry = useCallback(({ positions, normals }) => {
    if (!sceneRef.current) return;

    if (meshRef.current) {
      sceneRef.current.remove(meshRef.current);
      meshRef.current.geometry.dispose();
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geo.computeBoundingBox();
    geo.computeBoundingSphere();

    // Center and scale
    const box = new THREE.Box3().setFromBufferAttribute(geo.attributes.position);
    const center = new THREE.Vector3();
    box.getCenter(center);
    geo.translate(-center.x, -center.y, -center.z);
    const size = box.getSize(new THREE.Vector3()).length();
    const scale = 2.5 / size;

    const mat = new THREE.MeshPhongMaterial({
      color: 0x06b6d4,
      specular: 0x334155,
      shininess: 60,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.92,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.scale.setScalar(scale);
    meshRef.current = mesh;
    sceneRef.current.add(mesh);
    rotation.current = { x: 0.3, y: 0.3 };
    zoom.current = 1;
    if (cameraRef.current) cameraRef.current.position.z = 3;
  }, []);

  useEffect(() => {
    initScene();
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      rendererRef.current?.dispose();
      if (mountRef.current && rendererRef.current?.domElement) {
        mountRef.current.removeChild(rendererRef.current.domElement);
      }
    };
  }, [initScene]);

  // Resize
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      rendererRef.current.setSize(w, h);
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
    });
    if (mountRef.current) observer.observe(mountRef.current);
    return () => observer.disconnect();
  }, []);

  // Mouse / touch controls
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const onDown = (e) => {
      isDragging.current = true;
      const pos = e.touches ? e.touches[0] : e;
      lastMouse.current = { x: pos.clientX, y: pos.clientY };
    };
    const onMove = (e) => {
      if (!isDragging.current || !meshRef.current) return;
      const pos = e.touches ? e.touches[0] : e;
      const dx = pos.clientX - lastMouse.current.x;
      const dy = pos.clientY - lastMouse.current.y;
      meshRef.current.rotation.y += dx * 0.01;
      meshRef.current.rotation.x += dy * 0.01;
      lastMouse.current = { x: pos.clientX, y: pos.clientY };
    };
    const onUp = () => { isDragging.current = false; };
    const onWheel = (e) => {
      if (!cameraRef.current) return;
      cameraRef.current.position.z = Math.max(0.5, Math.min(8, cameraRef.current.position.z + e.deltaY * 0.005));
    };

    el.addEventListener('mousedown', onDown);
    el.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    el.addEventListener('touchstart', onDown, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: true });
    el.addEventListener('touchend', onUp);
    el.addEventListener('wheel', onWheel, { passive: true });

    return () => {
      el.removeEventListener('mousedown', onDown);
      el.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      el.removeEventListener('touchstart', onDown);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onUp);
      el.removeEventListener('wheel', onWheel);
    };
  }, []);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      const geo = parseSTL(buffer);
      loadGeometry(geo);
      setFileName(file.name);
      onStlLoaded?.(file);
    } catch (err) {
      setError('Could not parse STL file. Make sure it\'s a valid binary or ASCII STL.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = () => {
    if (meshRef.current && sceneRef.current) {
      sceneRef.current.remove(meshRef.current);
      meshRef.current.geometry.dispose();
      meshRef.current = null;
    }
    setFileName(null);
    onStlRemoved?.();
  };

  const handleReset = () => {
    if (meshRef.current) {
      meshRef.current.rotation.set(0, 0, 0);
    }
    if (cameraRef.current) cameraRef.current.position.z = 3;
  };

  const viewerHeight = expanded ? 'h-80' : compact ? 'h-44' : 'h-56';

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <Move3d className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-medium text-white">3D Model Reference</span>
          {fileName && (
            <span className="text-xs text-slate-400 truncate max-w-32">{fileName}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {fileName && (
            <>
              <Button size="icon" variant="ghost" onClick={handleReset} className="h-7 w-7 text-slate-400 hover:text-white">
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => setExpanded(!expanded)} className="h-7 w-7 text-slate-400 hover:text-white">
                {expanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </Button>
              <Button size="icon" variant="ghost" onClick={handleRemove} className="h-7 w-7 text-slate-400 hover:text-red-400">
                <X className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Viewer / Upload area */}
      <div className={cn('relative', viewerHeight)}>
        {/* Three.js mount */}
        <div ref={mountRef} className="absolute inset-0" />

        {/* Upload overlay (shown when no file) */}
        <AnimatePresence>
          {!fileName && !loading && (
            <motion.label
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              htmlFor="stl-upload"
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 cursor-pointer bg-slate-900/80 hover:bg-slate-900/60 transition-colors group"
            >
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center group-hover:border-cyan-400/60 transition-colors">
                <Upload className="w-6 h-6 text-cyan-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-white">Upload STL Model</p>
                <p className="text-xs text-slate-400 mt-1">Compare print against original geometry</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-400">
                .stl files only
              </span>
            </motion.label>
          )}
        </AnimatePresence>

        {/* Loading */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80">
            <div className="w-8 h-8 border-2 border-slate-600 border-t-cyan-400 rounded-full animate-spin" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 p-4">
            <p className="text-sm text-red-400 text-center">{error}</p>
          </div>
        )}

        {/* Drag hint */}
        {fileName && (
          <div className="absolute bottom-2 left-0 right-0 flex justify-center pointer-events-none">
            <span className="text-xs text-slate-500 bg-slate-900/70 px-2 py-1 rounded-full">
              Drag to rotate · Scroll to zoom
            </span>
          </div>
        )}
      </div>

      <input
        id="stl-upload"
        type="file"
        accept=".stl"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}