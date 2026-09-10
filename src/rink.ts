import * as THREE from 'three';
import type { ExpoWebGLRenderingContext } from 'expo-gl';
import { Game, Point, GOAL_CORNERS, NET_Z, NET_HEIGHT, NET_HALF_WIDTH } from './game';

const C = { ice: 0xdceef0, teal: 0x18dcb6, red: 0xef4d65, ink: 0x10293c, gold: 0xffcf5a };

export function frameRink(camera: THREE.OrthographicCamera, width: number, height: number, game: Game) {
  const aspect = width / height;
  const follow = Math.max(-5, Math.min(1, game.puck.z * 0.22));
  camera.position.set(Math.sin(game.motion * 57) * game.impact * 0.16, 31, 27 + follow);
  camera.lookAt(0, 0, follow - 2);
  camera.zoom = 1 + game.impact * 0.10 + (game.phase === 'SUCCESS' ? Math.min(game.terminalTime, 0.8) * 0.12 : 0);
  camera.updateMatrixWorld();
  // Fit the whole cage (including its back/top), puck, and skaters below the
  // status overlay. Shift framing first; widen only when both ends need room.
  const bounds = [
    // Both end boards must be visible before drawing: changing the camera in
    // response to the preview would move the swipe's anchored projection.
    ...[-11.3, 11.3].flatMap(x => [-23, 23].map(z => new THREE.Vector3(x, 1.1, z))),
    ...[-3.2, 3.2].flatMap(x => [-20.1, NET_Z + 0.1].flatMap(z => [0, NET_HEIGHT + 0.2].map(y => new THREE.Vector3(x, y, z)))),
    new THREE.Vector3(game.puck.x, 0.2 + (game.puck.height ?? 0), game.puck.z),
    ...[...game.attackers, ...game.defenders].flatMap(p => [0, 2.4].map(y => new THREE.Vector3(p.x, y, p.z))),
  ].map(p => p.applyMatrix4(camera.matrixWorldInverse));
  const minY = Math.min(...bounds.map(p => p.y)), maxY = Math.max(...bounds.map(p => p.y));
  const topPadding = Math.min(48, height * 0.18), bottomPadding = Math.min(24, height * 0.08);
  const usable = 1 - (topPadding + bottomPadding) / height;
  const halfHeight = Math.max(Math.max(11.8 / aspect, 18) / camera.zoom, (maxY - minY) / (2 * usable));
  const lowerCenter = maxY - halfHeight + 2 * halfHeight * topPadding / height;
  const upperCenter = minY + halfHeight - 2 * halfHeight * bottomPadding / height;
  const center = Math.max(lowerCenter, Math.min(upperCenter, 0));
  camera.left = -halfHeight * aspect * camera.zoom;
  camera.right = halfHeight * aspect * camera.zoom;
  camera.top = center + halfHeight * camera.zoom;
  camera.bottom = center - halfHeight * camera.zoom;
  camera.updateProjectionMatrix();
}

export class Rink {
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-14, 14, 24, -24, 0.1, 150);
  private renderer: THREE.WebGLRenderer;
  private players: THREE.Group[] = [];
  private goalie: THREE.Group;
  private glove: THREE.Group;
  private gloveArm: THREE.Mesh;
  private corners: THREE.Mesh[] = [];
  private puck: THREE.Mesh;
  private halo: THREE.Mesh;
  private targets: THREE.Mesh[] = [];
  private preview: THREE.Mesh[] = [];
  private trail: THREE.Mesh[] = [];
  private particles: THREE.Mesh[] = [];
  private net = new THREE.Group();
  private spray: THREE.Mesh[] = [];
  private ray = new THREE.Raycaster();
  private plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.14);
  private goalPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -NET_Z);
  private width = 1;
  private height = 1;

  constructor(private gl: ExpoWebGLRenderingContext) {
    // Keep Three pinned to r162: Expo's native context can satisfy the WebGL1
    // instanceof check even when it exposes WebGL2 methods. r163+ rejects it.
    // A TypeScript cast cannot change those runtime capabilities/prototypes.
    // GLView supplies the context; Three needs only a canvas facade.
    const canvas = {
      width: gl.drawingBufferWidth, height: gl.drawingBufferHeight,
      clientWidth: gl.drawingBufferWidth, clientHeight: gl.drawingBufferHeight,
      style: {}, addEventListener() {}, removeEventListener() {},
      setAttribute() {}, getContext: () => gl,
    } as unknown as HTMLCanvasElement;
    this.renderer = new THREE.WebGLRenderer({ canvas, context: gl, antialias: true, alpha: false });
    this.renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight, false);
    this.renderer.setClearColor(0x071624);
    this.scene.add(new THREE.HemisphereLight(0xe6fbff, 0x304555, 2.1));
    const light = new THREE.DirectionalLight(0xffffff, 2.5);
    light.position.set(-8, 20, 10);
    this.scene.add(light);
    this.buildIce();
    this.players = [0, 1, 2, 3, 4].map(i => this.player(i < 3 ? C.teal : C.red));
    this.goalie = this.player(C.gold, true);
    this.glove = this.catchingGlove();
    this.scene.add(this.glove);
    this.gloveArm = this.box(0.22, 0.22, 1, 0, 1, -17.85, C.gold);
    this.puck = this.mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.16, 16), C.ink);
    this.scene.add(this.puck);
    this.halo = this.ring(0.65, 0.83, C.gold);
    this.targets = Array.from({ length: 3 }, () => this.ring(1.05, 1.16, C.teal));
    // Fixed pools: no mesh allocation/disposal in the animation loop.
    const segmentGeometry = new THREE.BoxGeometry(1, 1, 1);
    this.preview = Array.from({ length: 512 }, () => {
      const m = this.mesh(segmentGeometry, C.gold, true); m.visible = false; this.scene.add(m); return m;
    });
    const dot = new THREE.SphereGeometry(1, 7, 5);
    this.trail = Array.from({ length: 28 }, () => { const m = this.mesh(dot, C.teal, true); this.scene.add(m); return m; });
    this.particles = Array.from({ length: 20 }, () => { const m = this.mesh(new THREE.BoxGeometry(0.16, 0.16, 0.4), C.gold, true); this.scene.add(m); return m; });
    this.spray = Array.from({ length: 30 }, () => { const m = this.mesh(dot, 0xffffff, true); this.scene.add(m); return m; });
  }

  private mesh(geometry: THREE.BufferGeometry, color: number, unlit = false) {
    return new THREE.Mesh(geometry, unlit ? new THREE.MeshBasicMaterial({ color }) : new THREE.MeshStandardMaterial({ color, roughness: 0.75 }));
  }

  private box(w: number, h: number, d: number, x: number, y: number, z: number, color: number, parent: THREE.Object3D = this.scene) {
    const m = this.mesh(new THREE.BoxGeometry(w, h, d), color);
    m.position.set(x, y, z); parent.add(m); return m;
  }

  private ring(inner: number, outer: number, color: number, x = 0, z = 0) {
    const m = this.mesh(new THREE.RingGeometry(inner, outer, 48), color, true);
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.04, z); this.scene.add(m); return m;
  }

  private tube(a: THREE.Vector3, b: THREE.Vector3, radius: number, color: number, parent: THREE.Object3D) {
    const tube = this.mesh(new THREE.CylinderGeometry(radius, radius, a.distanceTo(b), 10), color);
    tube.position.copy(a).lerp(b, 0.5);
    tube.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    parent.add(tube); return tube;
  }

  private catchingGlove() {
    const group = new THREE.Group(), shape = new THREE.Shape();
    shape.moveTo(-0.38, -0.55); shape.quadraticCurveTo(-0.95, -0.05, -0.6, 0.55);
    shape.quadraticCurveTo(-0.2, 0.98, 0.44, 0.64); shape.quadraticCurveTo(0.82, 0.38, 0.53, -0.04);
    shape.quadraticCurveTo(0.92, -0.18, 0.57, -0.57); shape.lineTo(0.05, -0.72); shape.closePath();
    group.add(this.mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.18, bevelEnabled: true, bevelSize: 0.07, bevelThickness: 0.07, bevelSegments: 2, steps: 1, curveSegments: 8 }), 0xf1eee4));
    const pocket = this.mesh(new THREE.CircleGeometry(0.45, 16), 0x394958);
    pocket.position.set(-0.08, 0.18, 0.265); pocket.scale.y = 1.16; group.add(pocket);
    const rim = this.mesh(new THREE.TorusGeometry(0.46, 0.065, 6, 16), 0xcbbd9d);
    rim.position.copy(pocket.position); rim.position.z += 0.015; rim.scale.y = 1.16; group.add(rim);
    for (const offset of [-0.24, -0.08, 0.08, 0.24]) {
      const extent = Math.sqrt(0.43 ** 2 - offset ** 2);
      this.tube(new THREE.Vector3(-0.08 + offset, 0.18 - extent, 0.29), new THREE.Vector3(-0.08 + offset, 0.18 + extent, 0.29), 0.014, 0xb9aa89, group);
      this.tube(new THREE.Vector3(-0.08 - extent, 0.18 + offset, 0.3), new THREE.Vector3(-0.08 + extent, 0.18 + offset, 0.3), 0.014, 0xb9aa89, group);
    }
    this.box(0.5, 0.25, 0.36, 0.03, -0.58, 0.1, C.gold, group);
    return group;
  }

  private blocker(parent: THREE.Group) {
    const shape = new THREE.Shape();
    shape.moveTo(-0.42, -0.55); shape.lineTo(0.42, -0.55); shape.lineTo(0.42, 0.46);
    shape.quadraticCurveTo(0.4, 0.66, 0.18, 0.68); shape.lineTo(-0.3, 0.62);
    shape.quadraticCurveTo(-0.48, 0.57, -0.42, 0.35); shape.closePath();
    const group = new THREE.Group(); group.position.set(0.9, 1.08, -0.58); group.rotation.z = -0.16;
    group.add(this.mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.2, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.06, bevelSegments: 2, curveSegments: 5 }), 0xf1eee4));
    this.box(0.7, 0.12, 0.025, 0, 0.26, -0.075, C.gold, group);
    this.box(0.7, 0.05, 0.025, 0, 0.05, -0.075, C.ink, group);
    this.box(0.43, 0.42, 0.34, 0, -0.15, 0.32, 0xcbbd9d, group);
    parent.add(group);
  }

  private buildIce() {
    this.box(23, 0.6, 46, 0, -0.34, 0, C.ice);
    for (const x of [-11.3, 11.3]) {
      this.box(0.5, 1.1, 46, x, 0.5, 0, 0xf3f7f8);
      this.box(0.55, 0.18, 46, x, 1.06, 0, 0x32677c);
      this.box(0.56, 0.16, 46, x, 0.08, 0, C.gold);
      this.box(1.7, 0.7, 45, x * 1.12, -0.15, 0, 0x153448);
    }
    for (const z of [-23, 23]) this.box(23, 1.1, 0.4, 0, 0.5, z, 0xf3f7f8);
    for (const z of [-7, 7]) this.box(22, 0.012, 0.22, 0, 0.01, z, 0x5597c5);
    for (const z of [-18, 0, 18]) this.box(22, 0.012, 0.12, 0, 0.015, z, 0xe98697);
    this.ring(2.7, 2.78, 0x75a6b9);
    for (const x of [-6, 6]) for (const z of [-12, 12]) {
      this.ring(2.25, 2.31, 0xd58f9d, x, z);
      this.ring(0, 0.14, 0xd58f9d, x, z);
    }
    const crease = this.mesh(new THREE.CircleGeometry(3.2, 48, 0, Math.PI), 0xa5d6e5, true);
    crease.rotation.x = -Math.PI / 2; crease.rotation.z = Math.PI;
    crease.position.set(0, 0.025, -18); this.scene.add(crease);
    // Exaggerated upright goal face: top and bottom corners are real targets.
    const front = (x: number, y: number) => new THREE.Vector3(x * NET_HALF_WIDTH, y * NET_HEIGHT, NET_Z);
    const back = (x: number, y: number) => new THREE.Vector3(x * 2.65, y * 3.7, -20);
    for (const side of [-1, 1]) {
      this.tube(front(side, 0), front(side, 1), 0.095, C.red, this.net);
      this.tube(front(side, 0), back(side, 0), 0.07, C.red, this.net);
      this.tube(front(side, 1), back(side, 1), 0.055, 0xe5e9e2, this.net);
      this.tube(back(side, 0), back(side, 1), 0.055, 0xe5e9e2, this.net);
    }
    this.tube(front(-1, 1), front(1, 1), 0.095, C.red, this.net);
    this.tube(back(-1, 0), back(1, 0), 0.075, C.red, this.net);
    this.tube(back(-1, 1), back(1, 1), 0.055, 0xe5e9e2, this.net);
    const threads: number[] = [];
    const line = (a: THREE.Vector3, b: THREE.Vector3) => threads.push(...a.toArray(), ...b.toArray());
    for (let i = 0; i <= 16; i++) {
      const x = -1 + i / 8;
      line(back(x, 0), back(x, 1)); line(front(x, 1), back(x, 1));
    }
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      line(back(-1, t), back(1, t));
      for (const side of [-1, 1]) line(front(side, t), back(side, t));
    }
    for (let i = 1; i < 7; i++) {
      const t = i / 7;
      line(front(-1, 1).lerp(back(-1, 1), t), front(1, 1).lerp(back(1, 1), t));
      for (const side of [-1, 1]) line(front(side, 0).lerp(back(side, 0), t), front(side, 1).lerp(back(side, 1), t));
    }
    const mesh = new THREE.BufferGeometry(); mesh.setAttribute('position', new THREE.Float32BufferAttribute(threads, 3));
    this.net.add(new THREE.LineSegments(mesh, new THREE.LineBasicMaterial({ color: 0x91aab4, transparent: true, opacity: 0.7 })));
    this.scene.add(this.net);
    this.corners = GOAL_CORNERS.map(p => {
      const ring = this.ring(0.46, 0.6, C.gold);
      ring.rotation.x = 0;
      ring.position.set(p.x, p.height + 0.14, NET_Z + 0.35);
      return ring;
    });
  }

  private player(color: number, keeper = false) {
    const group = new THREE.Group();
    this.box(keeper ? 1.25 : 0.85, 0.85, 0.6, 0, 1.18, 0, color, group);
    this.box(0.87, 0.12, 0.62, 0, 0.93, 0, 0xffffff, group);
    const head = this.mesh(new THREE.SphereGeometry(0.35, 12, 10), C.ink);
    head.position.set(0, 1.95, 0); group.add(head);
    this.box(0.5, 0.16, 0.15, 0, 1.88, -0.3, 0xa9d5de, group);
    for (const x of [-0.3, 0.3]) {
      const leg = this.box(keeper ? 0.5 : 0.27, 0.63, keeper ? 0.45 : 0.27, x, 0.48, 0, keeper ? 0xf1eee4 : C.ink, group);
      leg.name = 'leg';
      this.box(0.21, 0.13, 0.65, x, 0.1, -0.1, C.ink, group);
    }
    for (const x of [-0.65, 0.65]) this.box(0.3, 0.6, 0.3, x, 1.05, -0.14, color, group);
    if (keeper) this.blocker(group);
    const stick = this.box(0.075, 1.2, 0.075, 0.8, 0.57, -0.35, 0x435967, group); stick.rotation.x = -0.5;
    this.box(0.6, 0.09, 0.13, 0.6, 0.1, -0.7, C.ink, group);
    const shadow = this.mesh(new THREE.CircleGeometry(0.75, 20), 0x95b9c5, true);
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.035; group.add(shadow);
    this.scene.add(group); return group;
  }

  resize(width: number, height: number) {
    this.width = width; this.height = height;
  }

  screenPoint(point: Point) {
    const p = new THREE.Vector3(point.x, 0.14 + (point.height ?? 0), point.z).project(this.camera);
    return { x: (p.x + 1) * this.width / 2, y: (1 - p.y) * this.height / 2 };
  }

  icePoint(x: number, y: number): Point | null {
    this.ray.setFromCamera(new THREE.Vector2(x / this.width * 2 - 1, 1 - y / this.height * 2), this.camera);
    const hit = this.ray.ray.intersectPlane(this.plane, new THREE.Vector3());
    return hit ? { x: hit.x, z: hit.z } : null;
  }

  aimPoint(x: number, y: number): Point | null {
    this.ray.setFromCamera(new THREE.Vector2(x / this.width * 2 - 1, 1 - y / this.height * 2), this.camera);
    const face = this.ray.ray.intersectPlane(this.goalPlane, new THREE.Vector3());
    if (face && Math.abs(face.x) <= NET_HALF_WIDTH + 0.8 && face.y >= 0.14 && face.y <= NET_HEIGHT + 2) {
      const p = { x: face.x, z: NET_Z, height: face.y - 0.14 };
      // Small magnetic corner targets remain easy to hit on a phone.
      const corner = GOAL_CORNERS.find(c => Math.hypot(c.x - p.x, c.height - p.height) < 0.65);
      return corner ? { x: corner.x, z: corner.z, height: corner.height } : p;
    }
    return this.icePoint(x, y);
  }

  render(game: Game) {
    frameRink(this.camera, this.width, this.height, game);
    [...game.attackers, ...game.defenders].forEach((p, i) => {
      const model = this.players[i];
      model.position.set(p.x, 0, p.z);
      const skating = !(i >= 3 && game.actionPower === 'freeze') && (game.phase === 'AUTO_PLAY' || game.phase === 'REBOUND' || (game.phase === 'EXECUTING_ACTION' && (i >= 3 || (game.intent.kind === 'pass' && i !== game.intent.target))));
      (model.children[0] as THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>).material.color.setHex(i < 3 ? C.teal : game.actionPower === 'freeze' ? 0x69dfff : C.red);
      model.rotation.z = skating ? Math.sin(game.motion * 13 + i) * 0.09 : 0;
      model.rotation.y = i >= 3 ? Math.PI : -0.1;
      if (game.phase === 'SUCCESS' && i < 3) model.position.y = Math.abs(Math.sin(game.motion * 10 + i)) * 1.2;
      if (game.phase === 'FAIL' && i === game.carrier) model.rotation.z = -Math.min(1.2, game.elapsed * 0.4);
      model.children.filter(child => child.name === 'leg').forEach((leg, j) => { leg.rotation.x = skating ? Math.sin(game.motion * 14 + j * Math.PI) * 0.4 : 0; });
    });
    this.goalie.position.set(game.goalie.x, 0, game.goalie.z);
    this.goalie.rotation.y = Math.PI;
    this.goalie.rotation.z = -game.goalieVelocity * 0.055;
    this.goalie.rotation.x = game.phase === 'SUCCESS' ? -Math.min(1.35, game.terminalTime * (game.actionPower === 'fire' ? 6 : 2)) : game.phase === 'REBOUND' ? -0.35 : 0;
    if (game.phase === 'SUCCESS' && game.actionPower === 'fire') this.goalie.position.z -= Math.min(1.4, game.terminalTime * 4);
    this.net.position.z = game.phase === 'SUCCESS' ? Math.sin(game.terminalTime * 48) * Math.exp(-game.terminalTime * 3) * (game.actionPower === 'fire' ? 0.65 : 0.35) : 0;
    const cover = game.goalieGlove;
    this.glove.position.set(cover.x, (cover.height ?? 0) + 0.14, cover.z);
    this.glove.rotation.x = -0.25;
    this.glove.rotation.z = -game.goalieVelocity * 0.025;
    const shoulder = new THREE.Vector3(game.goalie.x, 1.4, game.goalie.z);
    this.gloveArm.position.copy(shoulder).lerp(this.glove.position, 0.5);
    this.gloveArm.scale.z = shoulder.distanceTo(this.glove.position);
    this.gloveArm.lookAt(this.glove.position);
    this.corners.forEach((marker, i) => {
      marker.visible = game.paused || game.phase === 'EXECUTING_ACTION';
      (marker.material as THREE.MeshBasicMaterial).color.setHex(game.cornerCovered(GOAL_CORNERS[i]) ? C.red : C.gold);
    });
    this.puck.position.set(game.puck.x, 0.17 + (game.puck.height ?? 0) + (game.phase === 'REBOUND' ? Math.abs(Math.sin(game.motion * 8)) * 0.5 : 0), game.puck.z);
    this.halo.visible = game.paused;
    this.halo.position.set(game.puck.x, 0.08, game.puck.z);
    this.targets.forEach((m, i) => {
      m.visible = game.paused && i !== game.carrier;
      m.position.set(game.attackers[i].x, 0.065, game.attackers[i].z);
    });
    this.preview.forEach((m, i) => {
      const a = game.preview[i], b = game.preview[i + 1];
      m.visible = !!a && !!b;
      if (!a || !b) return;
      const dx = b.x - a.x, dz = b.z - a.z, dy = (b.height ?? 0) - (a.height ?? 0);
      m.position.set((a.x + b.x) / 2, 0.16 + ((a.height ?? 0) + (b.height ?? 0)) / 2, (a.z + b.z) / 2);
      m.scale.set(0.12, 0.06, Math.hypot(dx, dy, dz) + 0.08);
      m.lookAt(b.x, 0.16 + (b.height ?? 0), b.z);
      (m.material as THREE.MeshBasicMaterial).color.setHex(game.intent.kind === 'pass' ? C.teal : game.intent.kind === 'shot' ? C.gold : 0xf18ca0);
    });
    this.trail.forEach((m, i) => {
      const p = game.trail[i]; m.visible = !!p && !game.paused;
      if (p) { m.position.set(p.x, 0.15 + (p.height ?? 0), p.z); m.scale.setScalar((0.04 + i / 28 * 0.23) * (game.actionPower === 'fire' ? 3 : 1)); }
      (m.material as THREE.MeshBasicMaterial).color.setHex(game.actionPower === 'fire' ? (i % 2 ? 0xff5722 : C.gold) : game.actionPower === 'curve' ? 0xc180ff : C.teal);
    });
    this.particles.forEach((m, i) => {
      m.visible = game.impact > 0.1 && !game.paused;
      const age = 1 - Math.min(1, game.impact), angle = i * 2.399;
      m.position.set(game.puck.x + Math.cos(angle) * age * 4, 0.2 + Math.sin(age * Math.PI) * (1 + i % 3), game.puck.z + Math.sin(angle) * age * 4);
      m.rotation.set(age * 6, angle, age * 3);
      m.scale.setScalar(game.impact);
    });
    this.spray.forEach((m, i) => {
      const skater = Math.floor(i / 6), p = [...game.attackers, ...game.defenders][skater];
      const age = (game.motion * 2 + (i % 6) / 6) % 1;
      m.visible = !game.paused && !game.terminal && !(skater >= 3 && game.actionPower === 'freeze');
      m.position.set(p.x + Math.sin(i * 2.4) * age * 0.7, 0.08 + Math.sin(age * Math.PI) * 0.35, p.z + age * 1.5);
      m.scale.setScalar((1 - age) * 0.12);
    });
    this.renderer.render(this.scene, this.camera);
    this.gl.endFrameEXP();
  }

  dispose() {
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    this.scene.traverse(object => {
      if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
        geometries.add(object.geometry);
        (Array.isArray(object.material) ? object.material : [object.material]).forEach(m => materials.add(m));
      }
    });
    geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose());
    this.renderer.dispose();
  }
}
