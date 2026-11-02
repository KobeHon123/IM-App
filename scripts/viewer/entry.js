/*
 * Source of the 3D Lab preview page. It is bundled with three.js by scripts/build-3d-viewer.mjs into
 * lib/3d-lab/viewerHtml.generated.ts and shown inside a WebView (native) or an <iframe> (web).
 *
 * Messages in  (window.__lab.handle(obj)):
 *   { type: 'mesh', positions: <base64 Float32>, normals: <base64 Int8>, theme }
 *   { type: 'reset' }
 *   { type: 'theme', theme }
 * Messages out (ReactNativeWebView.postMessage / parent.postMessage, JSON string):
 *   { type: 'ready' } | { type: 'rendered' } | { type: 'error', code, message }
 */
import {
  AmbientLight,
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  GridHelper,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  Sphere,
  TOUCH,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const post = (payload) => {
  const text = JSON.stringify(payload);
  if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) window.ReactNativeWebView.postMessage(text);
  else if (window.parent && window.parent !== window) window.parent.postMessage(text, '*');
};

const decodeBase64 = (b64) => {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return bytes;
};

let renderer;
try {
  renderer = new WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
} catch (error) {
  post({ type: 'error', code: 'no-webgl', message: String(error && error.message ? error.message : error) });
}

if (renderer) {
  const container = document.getElementById('stage');
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  container.appendChild(renderer.domElement);

  const scene = new Scene();
  const camera = new PerspectiveCamera(35, 1, 0.5, 5000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.12;
  controls.screenSpacePanning = true;
  controls.rotateSpeed = 0.9;
  controls.touches = { ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN };

  scene.add(new HemisphereLight(0xffffff, 0x8a94a3, 0.85));
  scene.add(new AmbientLight(0xffffff, 0.15));
  const key = new DirectionalLight(0xffffff, 1.6);
  key.position.set(120, 260, 180);
  scene.add(key);
  const fill = new DirectionalLight(0xdfe8ff, 0.55);
  fill.position.set(-200, 80, -120);
  scene.add(fill);

  const material = new MeshStandardMaterial({ color: 0xa9b8c9, roughness: 0.55, metalness: 0.05 });
  let part = null;
  let grid = null;
  let fitted = false;
  const sphere = new Sphere();
  const home = { position: new Vector3(), target: new Vector3() };
  let dirty = true;

  const applyTheme = (theme) => {
    if (!theme) return;
    if (theme.background) scene.background = new Color(theme.background);
    if (theme.part) material.color = new Color(theme.part);
    if (grid && theme.grid) {
      const colors = Array.isArray(grid.material) ? grid.material : [grid.material];
      colors.forEach((m) => { m.color = new Color(theme.grid); m.opacity = 0.5; m.transparent = true; });
    }
    dirty = true;
  };

  const resize = () => {
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    dirty = true;
  };

  const applyLimits = () => {
    const radius = Math.max(sphere.radius, 5);
    controls.minDistance = radius * 0.25;
    controls.maxDistance = radius * 12;
    camera.near = Math.max(radius / 200, 0.1);
    camera.far = radius * 40;
    camera.updateProjectionMatrix();
  };

  // keep the user's viewing direction, but follow the part when its size or position changes
  const refit = (previousCenter, previousRadius) => {
    const ratio = sphere.radius / previousRadius;
    const shift = sphere.center.clone().sub(previousCenter);
    camera.position.add(shift);
    controls.target.add(shift);
    const offset = camera.position.clone().sub(controls.target).multiplyScalar(ratio);
    camera.position.copy(controls.target).add(offset);
    applyLimits();
    controls.update();
    dirty = true;
  };

  const frame = () => {
    const radius = Math.max(sphere.radius, 5);
    const fov = (camera.fov * Math.PI) / 180;
    const fitHeight = radius / Math.sin(fov / 2);
    const fitWidth = fitHeight / Math.min(camera.aspect, 1.4);
    const distance = Math.max(fitHeight, Math.min(fitWidth, fitHeight * 1.8)) * 1.05;
    const dir = new Vector3(0.75, 0.62, 1.0).normalize();
    home.target.copy(sphere.center);
    home.position.copy(sphere.center).addScaledVector(dir, distance);
    camera.position.copy(home.position);
    controls.target.copy(home.target);
    applyLimits();
    controls.update();
    dirty = true;
  };

  const setMesh = (msg) => {
    const positions = new Float32Array(decodeBase64(msg.positions).buffer);
    const normals = new Int8Array(decodeBase64(msg.normals).buffer);
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new BufferAttribute(normals, 3, true));
    geometry.computeBoundingBox();

    const previousCenter = sphere.center.clone();
    const previousRadius = sphere.radius;
    if (part) {
      scene.remove(part);
      part.geometry.dispose();
    }
    part = new Mesh(geometry, material);
    // part coordinates: axis along Y, outer surface towards +Z  ->  Y-up scene: (x, y, z) -> (x, z, -y)
    part.rotation.x = -Math.PI / 2;
    scene.add(part);
    part.updateMatrixWorld(true);

    const box = geometry.boundingBox.clone().applyMatrix4(part.matrixWorld);
    box.getBoundingSphere(sphere);

    if (grid) {
      scene.remove(grid);
      grid.geometry.dispose();
    }
    const extent = Math.max(box.max.x - box.min.x, box.max.z - box.min.z, 20);
    const cell = extent > 150 ? 20 : 10;
    const size = Math.ceil((extent * 1.8) / cell) * cell;
    grid = new GridHelper(size, size / cell, 0x8a94a3, 0x8a94a3);
    grid.position.set(sphere.center.x, box.min.y - 0.05, sphere.center.z);
    scene.add(grid);

    applyTheme(msg.theme);
    if (!fitted) {
      frame();
      fitted = true;
    } else if (previousRadius > 0 && Math.abs(sphere.radius / previousRadius - 1) > 0.03) {
      refit(previousCenter, previousRadius);
    }
    dirty = true;
    post({ type: 'rendered' });
  };

  window.__lab = {
    handle(msg) {
      try {
        if (!msg) return;
        if (msg.type === 'mesh') setMesh(msg);
        else if (msg.type === 'reset') {
          if (part) frame();
        } else if (msg.type === 'theme') applyTheme(msg.theme);
      } catch (error) {
        post({ type: 'error', code: 'viewer', message: String(error && error.message ? error.message : error) });
      }
    },
  };
  window.addEventListener('message', (event) => {
    if (typeof event.data !== 'string') return;
    try {
      window.__lab.handle(JSON.parse(event.data));
    } catch (error) {
      /* not ours */
    }
  });

  window.addEventListener('resize', resize);
  controls.addEventListener('change', () => { dirty = true; });
  renderer.domElement.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    post({ type: 'error', code: 'context-lost', message: 'The graphics context was lost' });
  });

  const loop = () => {
    requestAnimationFrame(loop);
    const moved = controls.update();
    if (dirty || moved) {
      renderer.render(scene, camera);
      dirty = false;
    }
  };
  resize();
  scene.background = new Color(0xeef1f5);
  loop();
  post({ type: 'ready' });
}
