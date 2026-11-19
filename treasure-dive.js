/* Standalone treasure survey with desktop, VR, and AR input. */
(async () => {
'use strict';
const T = window.THREE;
const byId = id => document.getElementById(id);
const status = byId('status'), count = byId('count'), replay = byId('replay');
const vr = byId('vr'), ar = byId('ar');
let renderer;
try {
  renderer = new T.WebGLRenderer({ alpha: true, antialias: true });
} catch {
  status.textContent = 'This dive needs WebGL. You can return to the expedition map above.';
  replay.disabled = true;
  return;
}
document.body.append(renderer.domElement);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType('local');

const scene = new T.Scene();
const camera = new T.PerspectiveCamera(62, 1, 0.04, 50);
scene.add(new T.HemisphereLight(0xaeefff, 0x385865, 2.1));
const key = new T.DirectionalLight(0xffdfab, 2.5);
key.position.set(3, 5, 4);
scene.add(key);

const reef = new T.Group();
scene.add(reef);
const picture = new T.TextureLoader().load('assets/bg_coral_crown_bay.webp');
picture.colorSpace = T.SRGBColorSpace;
const backdrop = new T.Mesh(new T.SphereGeometry(18, 48, 24), new T.MeshBasicMaterial({
  map: picture, color: 0x779aa7, side: T.BackSide
}));
scene.add(backdrop);

const base = new T.Mesh(new T.CylinderGeometry(1.35, 1.45, 0.14, 48), new T.MeshStandardMaterial({
  color: 0x164b50, roughness: 0.85
}));
base.position.set(0, -0.65, -0.18);
reef.add(base);

const colors = [0xad5be4, 0x239974, 0x387dd8, 0xf2e4db, 0xdca34e, 0x26babe];
const shapes = [
  new T.IcosahedronGeometry(0.16), new T.BoxGeometry(0.22, 0.27, 0.21),
  new T.OctahedronGeometry(0.18), new T.SphereGeometry(0.14, 22, 16),
  new T.TorusGeometry(0.1, 0.045, 10, 22), new T.DodecahedronGeometry(0.15)
];
const relics = colors.map((color, i) => {
  const mesh = new T.Mesh(shapes[i], new T.MeshStandardMaterial({
    color, roughness: 0.35, metalness: 0.3, emissive: color, emissiveIntensity: 0.09
  }));
  mesh.position.set((i % 3 - 1) * 0.63, i < 3 ? 0.22 : -0.28, i < 3 ? -0.24 : 0.05);
  mesh.userData.height = mesh.position.y;
  reef.add(mesh);
  return mesh;
});

function panel(y, width, height, action) {
  const canvas = document.createElement('canvas');
  canvas.width = 768; canvas.height = 192;
  const ctx = canvas.getContext('2d');
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  const mesh = new T.Mesh(new T.PlaneGeometry(width, height), new T.MeshBasicMaterial({ map: texture }));
  mesh.position.set(0, y, 0.15);
  mesh.userData.action = action;
  reef.add(mesh);
  return {
    mesh,
    write(text) {
      ctx.fillStyle = '#082c37';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#e6b955';
      ctx.lineWidth = 9;
      ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
      ctx.fillStyle = '#fff0c6';
      ctx.font = 'bold 48px Georgia';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, canvas.width / 2, canvas.height / 2, canvas.width - 60);
      texture.needsUpdate = true;
    }
  };
}
const heading = panel(0.69, 1.9, 0.30);
const exit = panel(-0.89, 0.78, 0.23, () => session?.end().catch(() => {}));
exit.write('Exit XR');
exit.mesh.visible = false;

let session = null, placed = true, launchPending = false, collected = 0;
const ray = new T.Raycaster(), origin = new T.Vector3(), direction = new T.Vector3();
const forward = new T.Vector3(), rotation = new T.Quaternion();
const pointer = new T.Vector2();
function refreshCount() {
  const label = 'Relics recovered ' + collected + ' / ' + relics.length;
  count.textContent = collected === relics.length ? label + ' · Dive complete!' : label;
  heading.write(collected === relics.length ? 'Dive complete!' : label);
}
function reset() {
  collected = 0;
  relics.forEach(mesh => { mesh.visible = true; });
  refreshCount();
}
reset();
replay.addEventListener('click', reset);
function select() {
  if (!placed) return;
  const targets = relics.filter(mesh => mesh.visible);
  if (exit.mesh.visible) targets.push(exit.mesh);
  const hit = ray.intersectObjects(targets, false)[0]?.object;
  if (!hit) return;
  if (hit.userData.action) { hit.userData.action(); return; }
  hit.visible = false;
  collected++;
  refreshCount();
}
renderer.domElement.addEventListener('pointerup', event => {
  if (session) return;
  const bounds = renderer.domElement.getBoundingClientRect();
  pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1,
    1 - (event.clientY - bounds.top) / bounds.height * 2);
  ray.setFromCamera(pointer, camera);
  select();
});

for (let i = 0; i < 2; i++) {
  const controller = renderer.xr.getController(i);
  const line = new T.Line(new T.BufferGeometry().setFromPoints([
    new T.Vector3(0, 0, -0.08), new T.Vector3(0, 0, -3)
  ]), new T.LineBasicMaterial({ color: 0x8ce7dd, transparent: true, opacity: 0.62 }));
  line.visible = false;
  controller.add(line);
  scene.add(controller);
  controller.addEventListener('connected', event => {
    line.visible = event.data.targetRayMode === 'tracked-pointer';
  });
  controller.addEventListener('disconnected', () => { line.visible = false; });
  controller.addEventListener('select', () => {
    controller.getWorldPosition(origin);
    controller.getWorldQuaternion(rotation);
    ray.set(origin, direction.set(0, 0, -1).applyQuaternion(rotation));
    select();
  });
}

function preview() {
  reef.position.set(0, -0.13, -Math.max(3.2, 1.65 / (innerWidth / innerHeight)));
  reef.rotation.y = 0;
  reef.visible = true;
  backdrop.visible = true;
  exit.mesh.visible = false;
  placed = true;
}
function resize() {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  if (!session) preview();
}
preview();
resize();
addEventListener('resize', resize);
renderer.setAnimationLoop((time, frame) => {
  if (session && !placed && frame) {
    const reference = renderer.xr.getReferenceSpace();
    const pose = reference && frame.getViewerPose(reference);
    if (pose) {
      const { position, orientation } = pose.transform;
      forward.set(0, 0, -1).applyQuaternion(orientation);
      forward.y = 0;
      if (forward.lengthSq() < 0.001) forward.set(0, 0, -1);
      forward.normalize();
      reef.position.set(position.x + forward.x * 2.1, position.y - 0.12, position.z + forward.z * 2.1);
      reef.rotation.y = Math.atan2(-forward.x, -forward.z);
      reef.visible = true;
      placed = true;
    }
  }
  relics.forEach((mesh, i) => {
    mesh.rotation.y = time * 0.0007 + i;
    mesh.position.y = mesh.userData.height + Math.sin(time * 0.002 + i) * 0.04;
  });
  renderer.render(scene, camera);
});

const supports = async name => {
  try { return !!(await navigator.xr?.isSessionSupported(name)); } catch { return false; }
};
const [hasVR, hasAR] = await Promise.all([supports('immersive-vr'), supports('immersive-ar')]);
function buttons() {
  vr.disabled = !hasVR || launchPending || !!session;
  ar.disabled = !hasAR || launchPending || !!session;
}
buttons();
status.textContent = hasVR || hasAR
  ? 'Choose an available immersive mode, or play on this screen.'
  : 'Immersive AR and VR are unavailable in this browser. The on-screen dive is ready to play.';
async function enter(name) {
  if (session || launchPending) return;
  launchPending = true;
  buttons();
  let requested;
  try {
    requested = await navigator.xr.requestSession(name);
    session = requested;
    requested.addEventListener('end', () => {
      session = null;
      preview(); resize(); buttons();
      status.textContent = 'Dive ended. You can rejoin or continue on this screen.';
    }, { once: true });
    placed = false;
    reef.visible = false;
    backdrop.visible = name === 'immersive-vr';
    exit.mesh.visible = true;
    await renderer.xr.setSession(requested);
  } catch {
    if (requested) await requested.end().catch(() => {});
    session = null;
    preview(); resize();
    status.textContent = 'Could not start this immersive mode. Check device permissions or play on this screen.';
  } finally {
    launchPending = false;
    buttons();
  }
}
vr.addEventListener('click', () => enter('immersive-vr'));
ar.addEventListener('click', () => enter('immersive-ar'));
})();
