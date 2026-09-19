"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export interface RadarBlip {
  id: string;
  angleDeg: number;
  severity: "opportunity" | "watch" | "critical";
  active?: boolean;
}

/** Read a space-separated CSS var (e.g. "27 58 102") as a THREE.Color. */
function cssColor(varName: string, fallback: number): THREE.Color {
  if (typeof window === "undefined") return new THREE.Color(fallback);
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  const parts = raw.split(/\s+/).map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return new THREE.Color(fallback);
  return new THREE.Color(parts[0] / 255, parts[1] / 255, parts[2] / 255);
}

interface RadarProps {
  blips: RadarBlip[];
  onSelect?: (id: string) => void;
  celebrate?: boolean; // outcome ripple when an offer succeeds
}

const SEVERITY_FALLBACK: Record<RadarBlip["severity"], number> = {
  opportunity: 0x00d4ff,
  watch: 0xffb547,
  critical: 0xff5d7a,
};
const SEVERITY_VAR: Record<RadarBlip["severity"], string> = {
  opportunity: "--accent-rgb",
  watch: "--warning-rgb",
  critical: "--negative-rgb",
};
const SEVERITY_HEIGHT: Record<RadarBlip["severity"], number> = {
  opportunity: 0.34,
  watch: 0.22,
  critical: 0.46,
};

function polar(angleDeg: number, radius: number): [number, number] {
  const a = (angleDeg * Math.PI) / 180;
  return [Math.cos(a) * radius, Math.sin(a) * radius];
}

export default function Radar({ blips, onSelect, celebrate }: RadarProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pingRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const rebuildRef = useRef<((list: RadarBlip[]) => void) | null>(null);
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;
  const severityRef = useRef<Record<RadarBlip["severity"], number>>({ ...SEVERITY_FALLBACK });

  // ── scene setup (mount only) ───────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const wrapEl: HTMLDivElement = wrap;
    const canvasEl: HTMLCanvasElement = canvas;

    const renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 50);
    camera.position.set(0, 1.7, 2.55);
    camera.lookAt(0, 0, 0);

    // Fit the disc to the container: pull the camera in when the box is wide
    // so the radar fills the frame instead of letterboxing.
    function fitCamera() {
      const aspect = Math.max(0.5, wrapEl.clientWidth / Math.max(1, wrapEl.clientHeight));
      const halfVFov = (42 / 2) * (Math.PI / 180);
      const halfHFov = Math.atan(Math.tan(halfVFov) * aspect);
      const zFit = 1.12 / Math.tan(halfHFov); // 1.12 = disc radius + margin
      camera.position.z = Math.min(2.6, Math.max(1.85, zFit));
    }

    const disposables: Array<THREE.BufferGeometry | THREE.Material> = [];

    // severity colors follow the active theme (re-read on ThemeSwitcher events)
    function readSeverityColors() {
      for (const sev of ["opportunity", "watch", "critical"] as const) {
        severityRef.current[sev] = cssColor(SEVERITY_VAR[sev], SEVERITY_FALLBACK[sev]).getHex();
      }
    }
    readSeverityColors();
    const onThemeChange = () => {
      readSeverityColors();
      rebuildRef.current?.(blipsRef.current);
    };
    window.addEventListener("radaar-theme", onThemeChange);

    // radar floor: rings + spokes + glass disc — colors from the active theme
    const grid = new THREE.Group();
    const ringMat = new THREE.LineBasicMaterial({
      color: cssColor("--grid-line", 0x1b3a66),
      transparent: true,
      opacity: 0.75,
    });
    disposables.push(ringMat);
    for (const r of [0.25, 0.5, 0.75, 1.0]) {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 128; i++) {
        const a = (i / 128) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      disposables.push(geo);
      grid.add(new THREE.Line(geo, ringMat));
    }
    const spokeMat = new THREE.LineBasicMaterial({
      color: cssColor("--grid-spoke", 0x14294a),
      transparent: true,
      opacity: 0.6,
    });
    disposables.push(spokeMat);
    for (let s = 0; s < 12; s++) {
      const [x, z] = polar((s / 12) * 360, 1.0);
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(x, 0, z),
      ]);
      disposables.push(geo);
      grid.add(new THREE.Line(geo, spokeMat));
    }
    const floorGeo = new THREE.CircleGeometry(1.0, 64);
    const floorMat = new THREE.MeshBasicMaterial({
      color: cssColor("--floor", 0x0a1a33),
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    });
    disposables.push(floorGeo, floorMat);
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    grid.add(floor);
    scene.add(grid);

    // sweep: translucent trailing arc + bright leading edge
    const sweep = new THREE.Group();
    const arcGeo = new THREE.CircleGeometry(1.0, 64, Math.PI / 2 - 0.55, 0.55);
    const arcMat = new THREE.MeshBasicMaterial({
      color: cssColor("--sweep", 0x00b9f5),
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    disposables.push(arcGeo, arcMat);
    const arc = new THREE.Mesh(arcGeo, arcMat);
    arc.rotation.x = -Math.PI / 2;
    sweep.add(arc);
    const edgeGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.002, 0),
      new THREE.Vector3(1, 0.002, 0),
    ]);
    const edgeMat = new THREE.LineBasicMaterial({
      color: cssColor("--sweep-edge", 0x00d4ff),
      transparent: true,
      opacity: 0.9,
    });
    disposables.push(edgeGeo, edgeMat);
    sweep.add(new THREE.Line(edgeGeo, edgeMat));
    scene.add(sweep);

    // outcome ripple (green celebration ring)
    const rippleGeo = new THREE.RingGeometry(0.6, 0.66, 64);
    const rippleMat = new THREE.MeshBasicMaterial({
      color: 0x22e5a0,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    disposables.push(rippleGeo, rippleMat);
    const ripple = new THREE.Mesh(rippleGeo, rippleMat);
    ripple.rotation.x = -Math.PI / 2;
    scene.add(ripple);

    // blips
    const blipGroup = new THREE.Group();
    scene.add(blipGroup);
    const blipTips = new Map<string, THREE.Mesh>();

    function buildBlips(list: RadarBlip[]) {
      for (const child of [...blipGroup.children]) {
        blipGroup.remove(child);
        const m = child as THREE.Mesh;
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      }
      blipTips.clear();
      for (const b of list) {
        const color = severityRef.current[b.severity] ?? SEVERITY_FALLBACK[b.severity];
        const h = SEVERITY_HEIGHT[b.severity];
        const [x, z] = polar(b.angleDeg, 0.72);
        const pillarGeo = new THREE.BoxGeometry(0.012, h, 0.012);
        const pillarMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35 });
        const pillar = new THREE.Mesh(pillarGeo, pillarMat);
        pillar.position.set(x, h / 2, z);
        const tipGeo = new THREE.SphereGeometry(0.028, 16, 16);
        const tipMat = new THREE.MeshBasicMaterial({ color, transparent: true });
        const tip = new THREE.Mesh(tipGeo, tipMat);
        tip.position.set(x, h + 0.02, z);
        blipGroup.add(pillar, tip);
        blipTips.set(b.id, tip);
      }
    }
    rebuildRef.current = buildBlips;
    buildBlips(blips);

    // resize + parallax
    function resize() {
      const w = wrapEl.clientWidth;
      const h = wrapEl.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      fitCamera();
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrapEl);
    const mouse = { x: 0, y: 0 };
    function onMouse(e: MouseEvent) {
      const r = wrapEl.getBoundingClientRect();
      mouse.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
      mouse.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
    }
    wrapEl.addEventListener("mousemove", onMouse);

    // animation loop
    const clock = new THREE.Clock();
    let sweepAngle = 0;
    let raf = 0;
    const project = new THREE.Vector3();

    function animate() {
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;
      sweepAngle = (sweepAngle - dt * 0.9) % (Math.PI * 2);
      sweep.rotation.y = sweepAngle;

      camera.position.x += (mouse.x * 0.22 - camera.position.x) * 0.04;
      camera.position.y += (1.7 + mouse.y * -0.12 - camera.position.y) * 0.04;
      camera.lookAt(0, 0, 0);

      let i = 0;
      for (const [, tip] of blipTips) {
        (tip.material as THREE.MeshBasicMaterial).opacity = 0.55 + 0.45 * Math.sin(t * 3 + i * 1.7);
        i++;
      }

      const rMat = ripple.material as THREE.MeshBasicMaterial;
      if (celebrateRef.current) {
        const phase = (t % 2.2) / 2.2;
        const s = 0.4 + phase * 1.8;
        ripple.scale.set(s, s, 1);
        rMat.opacity = 0.7 * (1 - phase);
      } else if (rMat.opacity > 0) {
        rMat.opacity = Math.max(0, rMat.opacity - dt * 2);
      }

      // sync DOM pings to 3D tips
      for (const [id, tip] of blipTips) {
        const el = pingRefs.current.get(id);
        if (!el) continue;
        project.copy(tip.position).project(camera);
        el.style.left = `${((project.x + 1) / 2) * 100}%`;
        el.style.top = `${((-project.y + 1) / 2) * 100}%`;
      }

      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    }
    raf = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      wrap.removeEventListener("mousemove", onMouse);
      window.removeEventListener("radaar-theme", onThemeChange);
      rebuildRef.current = null;
      for (const d of disposables) d.dispose();
      renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // celebrate via ref so the loop reads the latest value without re-mounting
  const celebrateRef = useRef(celebrate);
  celebrateRef.current = celebrate;
  const blipsRef = useRef(blips);
  blipsRef.current = blips;

  // rebuild blips when the set changes
  useEffect(() => {
    rebuildRef.current?.(blips);
  }, [blips]);

  const colorHex = (c: number) => `#${c.toString(16).padStart(6, "0")}`;

  return (
    <div ref={wrapRef} className="relative h-full w-full select-none">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* DOM pings — positioned from 3D tips each frame, clickable */}
      <div className="pointer-events-none absolute inset-0">
        {blips.map((b) => (
          <div
            key={b.id}
            ref={(el) => {
              if (el) pingRefs.current.set(b.id, el);
              else pingRefs.current.delete(b.id);
            }}
            className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: "50%", top: "50%", color: colorHex(severityRef.current[b.severity] ?? SEVERITY_FALLBACK[b.severity]) }}
          >
            <button
              aria-label={`Select insight ${b.id}`}
              onClick={() => selectRef.current?.(b.id)}
              className="group relative flex h-7 w-7 cursor-pointer items-center justify-center"
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: "currentColor" }} />
              {b.active && (
                <>
                  <span className="ping-ring" />
                  <span className="ping-ring ping-ring-delay-1" />
                </>
              )}
            </button>
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.3em] text-slate-500">
        growth radar · live
      </div>
    </div>
  );
}
