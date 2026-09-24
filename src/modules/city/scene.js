import {
  BoxGeometry,
  CanvasTexture,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshLambertMaterial,
  Object3D,
  PCFShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Raycaster,
  RepeatWrapping,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';

/*
 * A small procedural toy city with one "hero" building whose floors can lift away
 * and whose middle floor is fully furnished, so the camera can travel
 * City → Building → Floor → Room, exactly like ZoomCity's zoom levels.
 */

const PITCH = 16; // block + road
const PAD = 12; // block size
const ROAD = 4;
const FH = 3; // floor height of the hero building
const HERO_FLOORS = 4;
const TARGET_FLOOR = 1;
const BASE_Y = 0.25; // top of the block pads

const PALETTE = ['#ffd7a8', '#ffb4a2', '#b5e2fa', '#cdb4db', '#ffe29a', '#a8e6cf', '#f4f1de', '#ffc6d9'];
const ROOF_COLORS = ['#ff6b4a', '#e76f51', '#5b6fb5', '#3b4163'];
const NAMES = [
  'Maple House', 'Harbor Flats', 'Cedar Court', 'Juniper Tower', 'Olive Row', 'Sunset Lofts', 'Palm Heights',
  'Fig Street Homes', 'Linden Place', 'Birch Apartments', 'Quince Villas', 'Poplar Point', 'Willow Terrace',
  'Hazel Residences', 'Aspen Block', 'Rowan Tower', 'Magnolia Flats', 'Laurel House', 'Sage Court', 'Elm Studios',
];

const THEMES = {
  day: { sky: '#a9dcff', fog: '#d6eeff', hemiSky: '#ffffff', hemiGround: '#a5cf95', hemi: 1.15, sun: '#fff1d6', sunI: 1.9, glow: 0, ground: '#9ad17f', road: '#4b5270' },
  night: { sky: '#0f1840', fog: '#1a2552', hemiSky: '#7d8ce0', hemiGround: '#1d2a3a', hemi: 0.55, sun: '#9fb2ff', sunI: 0.45, glow: 1, ground: '#3f6b4d', road: '#2a3050' },
};

let seed = 7;
const rnd = () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

function windowTextures() {
  const size = 128; // one tile = 4×4 world units
  const cell = size / 4;
  const make = (emissive) => {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    g.fillStyle = emissive ? '#000' : '#fff';
    g.fillRect(0, 0, size, size);
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const lit = emissive ? rnd() > 0.45 : true;
        if (!lit) continue;
        g.fillStyle = emissive ? '#fff' : '#9cc6e6';
        g.fillRect(x * cell + 8, y * cell + 7, cell - 16, cell - 13);
      }
    }
    const t = new CanvasTexture(c);
    t.wrapS = t.wrapT = RepeatWrapping;
    t.colorSpace = SRGBColorSpace;
    return t;
  };
  return { map: make(false), emissive: make(true) };
}

function roadTexture(repeat) {
  const s = 256;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.fillRect(0, 0, s, s);
  g.fillStyle = '#e7e9f2';
  for (let i = 0; i < s; i += 32) {
    g.fillRect(i + 4, 0, 16, 3);
    g.fillRect(i + 4, s - 3, 16, 3);
    g.fillRect(0, i + 4, 3, 16);
    g.fillRect(s - 3, i + 4, 3, 16);
  }
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.offset.set(-ROAD / 2 / PITCH, -ROAD / 2 / PITCH);
  t.colorSpace = SRGBColorSpace;
  return t;
}

/** Scale a box's UVs so the window texture keeps a constant size on every facade. */
function facadeUVs(geo, w, h, d, uOffset) {
  const uv = geo.attributes.uv;
  for (let f = 0; f < 6; f++) {
    for (let v = 0; v < 4; v++) {
      const i = f * 4 + v;
      const u0 = uv.getX(i);
      const v0 = uv.getY(i);
      if (f === 2 || f === 3) {
        uv.setXY(i, 0.01, 0.01); // roof/bottom: plain facade pixel
      } else {
        const across = f < 2 ? d : w;
        uv.setXY(i, u0 * (across / 4) + uOffset, v0 * (h / 4));
      }
    }
  }
  uv.needsUpdate = true;
}

export function createCity(canvas) {
  const small = window.innerWidth < 768;
  const renderer = new WebGLRenderer({ canvas, antialias: !small, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 1.75));
  renderer.shadowMap.enabled = !small;
  renderer.shadowMap.type = PCFShadowMap;
  renderer.outputColorSpace = SRGBColorSpace;

  const scene = new Scene();
  scene.background = new Color(THEMES.day.sky);
  scene.fog = new Fog(THEMES.day.fog, 130, 340);
  const camera = new PerspectiveCamera(32, 1, 0.1, 600);

  const hemi = new HemisphereLight(THEMES.day.hemiSky, THEMES.day.hemiGround, THEMES.day.hemi);
  const sun = new DirectionalLight(THEMES.day.sun, THEMES.day.sunI);
  sun.position.set(60, 90, 40);
  sun.castShadow = !small;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 1, far: 260 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.05;
  scene.add(hemi, sun);

  const B = small ? 2 : 3; // blocks from -B..B
  const span = (2 * B + 1) * PITCH + ROAD;
  const tex = windowTextures();
  const materials = { facades: [], glows: [] };

  // ground + road plane
  const ground = new Mesh(new PlaneGeometry(900, 900), new MeshLambertMaterial({ color: THEMES.day.ground }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  const roadMat = new MeshLambertMaterial({ color: THEMES.day.road, map: roadTexture(span / PITCH) });
  const road = new Mesh(new PlaneGeometry(span, span), roadMat);
  road.rotation.x = -Math.PI / 2;
  road.position.y = 0.02;
  road.receiveShadow = true;
  scene.add(ground, road);

  const padMat = new MeshLambertMaterial({ color: '#efe6d6' });
  const padGeo = new BoxGeometry(PAD, 0.25, PAD);
  const facadeMats = PALETTE.map((color) => {
    const m = new MeshLambertMaterial({ color, map: tex.map, emissiveMap: tex.emissive, emissive: '#ffcf70', emissiveIntensity: 0 });
    materials.facades.push(m);
    return m;
  });
  const roofMats = ROOF_COLORS.map((color) => new MeshLambertMaterial({ color }));
  const flatRoofMat = new MeshLambertMaterial({ color: '#dcd3c4' });
  const detailMat = new MeshLambertMaterial({ color: '#9aa1b5' });

  const buildings = []; // pickable meshes
  const layout = { blocks: [], hero: [0, 0], parks: [] };
  const treeSpots = [];

  for (let bx = -B; bx <= B; bx++) {
    for (let bz = -B; bz <= B; bz++) {
      const cx = bx * PITCH;
      const cz = bz * PITCH;
      const pad = new Mesh(padGeo, padMat);
      pad.position.set(cx, 0.125, cz);
      pad.receiveShadow = true;
      scene.add(pad);
      layout.blocks.push([cx, cz]);
      if (bx === 0 && bz === 0) {
        treeSpots.push([cx - 5, cz + 5], [cx + 5, cz - 5], [cx - 5, cz - 5], [cx + 5.2, cz + 5.2]);
        continue;
      }
      const dist = Math.hypot(bx, bz);
      for (const [ox, oz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) {
        const lx = cx + ox;
        const lz = cz + oz;
        if (rnd() < 0.14) {
          layout.parks.push([lx, lz]);
          for (let t = 0; t < 3; t++) treeSpots.push([lx + (rnd() - 0.5) * 3.4, lz + (rnd() - 0.5) * 3.4]);
          continue;
        }
        const downtown = Math.max(0, 1 - dist / (B + 0.6));
        const kind = rnd() < 0.2 + downtown * 0.55 ? (rnd() < downtown ? 'tower' : 'flats') : 'house';
        const w = kind === 'house' ? 3 + rnd() * 1.2 : 3.4 + rnd();
        const d = kind === 'house' ? 3 + rnd() * 1.2 : 3.4 + rnd();
        const h = kind === 'house' ? 2 + Math.round(rnd()) : kind === 'flats' ? 4 + Math.round(rnd() * 4) : 8 + Math.round(rnd() * 9);
        const geo = new BoxGeometry(w, h, d);
        facadeUVs(geo, w, h, d, Math.floor(rnd() * 4) * 0.25);
        const mesh = new Mesh(geo, pick(facadeMats));
        mesh.position.set(lx, BASE_Y + h / 2, lz);
        mesh.castShadow = mesh.receiveShadow = true;
        const floors = Math.max(1, Math.round(h / 2.2));
        mesh.userData = {
          name: pick(NAMES),
          kind: kind === 'house' ? 'House' : kind === 'flats' ? 'Apartments' : 'Tower',
          floors,
          residents: kind === 'house' ? 2 + Math.floor(rnd() * 4) : floors * (4 + Math.floor(rnd() * 5)),
          monthly: Math.round((floors * (90 + rnd() * 80)) / 10) * 10,
          deco: 0.2 + rnd() * 0.75,
        };
        scene.add(mesh);
        buildings.push(mesh);
        if (kind === 'house') {
          const roof = new Mesh(new ConeGeometry(Math.max(w, d) * 0.78, 1.6, 4), pick(roofMats));
          roof.rotation.y = Math.PI / 4;
          roof.position.set(lx, BASE_Y + h + 0.8, lz);
          roof.castShadow = true;
          scene.add(roof);
        } else {
          const cap = new Mesh(new BoxGeometry(w + 0.2, 0.25, d + 0.2), flatRoofMat);
          cap.position.set(lx, BASE_Y + h + 0.12, lz);
          cap.castShadow = true;
          scene.add(cap);
          const ac = new Mesh(new BoxGeometry(1, 0.6, 0.8), detailMat);
          ac.position.set(lx + (rnd() - 0.5) * (w - 1.4), BASE_Y + h + 0.55, lz + (rnd() - 0.5) * (d - 1.2));
          ac.castShadow = true;
          scene.add(ac);
        }
      }
    }
  }

  // trees (instanced)
  for (let i = 0; i < (small ? 30 : 70); i++) {
    const bx = Math.round((rnd() - 0.5) * 2 * B);
    const bz = Math.round((rnd() - 0.5) * 2 * B);
    if (bx === 0 && bz === 0) continue;
    const side = rnd() < 0.5;
    const along = (rnd() - 0.5) * (PAD - 1.4);
    const edge = (rnd() < 0.5 ? -1 : 1) * (PAD / 2 - 0.55);
    treeSpots.push([bx * PITCH + (side ? along : edge), bz * PITCH + (side ? edge : along)]);
  }
  const dummy = new Object3D();
  const trunks = new InstancedMesh(new CylinderGeometry(0.14, 0.18, 1, 6), new MeshLambertMaterial({ color: '#8a5a3b' }), treeSpots.length);
  const crowns = new InstancedMesh(new IcosahedronGeometry(0.95, 0), new MeshLambertMaterial({ color: '#37b872', flatShading: true }), treeSpots.length);
  const crownColors = ['#37b872', '#2fa463', '#5cc98a', '#48b06a'].map((c) => new Color(c));
  treeSpots.forEach(([x, z], i) => {
    const s = 0.8 + rnd() * 0.5;
    dummy.position.set(x, BASE_Y + 0.5 * s, z);
    dummy.scale.set(s, s, s);
    dummy.rotation.set(0, rnd() * 3, 0);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);
    dummy.position.y = BASE_Y + 1.5 * s;
    dummy.updateMatrix();
    crowns.setMatrixAt(i, dummy.matrix);
    crowns.setColorAt(i, crownColors[i % crownColors.length]);
  });
  trunks.castShadow = crowns.castShadow = true;
  scene.add(trunks, crowns);

  // street lamps at intersections (bulbs glow at night)
  const roadsAt = [];
  for (let k = -B - 1; k <= B; k++) roadsAt.push((k + 0.5) * PITCH);
  const lampCount = roadsAt.length * roadsAt.length;
  const bulbMat = new MeshLambertMaterial({ color: '#fff4d6', emissive: '#ffd36b', emissiveIntensity: 0 });
  materials.glows.push(bulbMat);
  const poles = new InstancedMesh(new CylinderGeometry(0.06, 0.08, 2.4, 5), detailMat, lampCount);
  const bulbs = new InstancedMesh(new SphereGeometry(0.22, 8, 6), bulbMat, lampCount);
  let li = 0;
  roadsAt.forEach((x) =>
    roadsAt.forEach((z) => {
      dummy.scale.set(1, 1, 1);
      dummy.rotation.set(0, 0, 0);
      dummy.position.set(x + ROAD / 2 + 0.3, 1.2, z + ROAD / 2 + 0.3);
      dummy.updateMatrix();
      poles.setMatrixAt(li, dummy.matrix);
      dummy.position.y = 2.45;
      dummy.updateMatrix();
      bulbs.setMatrixAt(li, dummy.matrix);
      li++;
    }),
  );
  scene.add(poles, bulbs);

  // traffic
  const carCount = small ? 14 : 30;
  const cars = [];
  const carBodies = new InstancedMesh(new BoxGeometry(1.6, 0.55, 0.85), new MeshLambertMaterial({ color: '#ffffff' }), carCount);
  const carTops = new InstancedMesh(new BoxGeometry(0.85, 0.42, 0.75), new MeshLambertMaterial({ color: '#eaf6ff' }), carCount);
  const carColors = ['#ff6b4a', '#ffd23f', '#5bb6ff', '#8e7cff', '#37b872', '#ffffff', '#3b4163'].map((c) => new Color(c));
  const extent = (B + 0.5) * PITCH + ROAD / 2;
  for (let i = 0; i < carCount; i++) {
    const axis = i % 2 ? 'x' : 'z';
    const dir = rnd() < 0.5 ? 1 : -1;
    cars.push({ axis, dir, lane: pick(roadsAt) + dir * 0.95, t: (rnd() * 2 - 1) * extent, speed: 5 + rnd() * 5 });
    carBodies.setColorAt(i, carColors[i % carColors.length]);
  }
  carBodies.castShadow = true;
  scene.add(carBodies, carTops);
  const updateCars = (dt) => {
    cars.forEach((c, i) => {
      c.t += c.dir * c.speed * dt;
      if (c.t > extent) c.t = -extent;
      if (c.t < -extent) c.t = extent;
      const x = c.axis === 'x' ? c.t : c.lane;
      const z = c.axis === 'x' ? c.lane : c.t;
      dummy.scale.set(1, 1, 1);
      dummy.rotation.set(0, c.axis === 'x' ? 0 : Math.PI / 2, 0);
      dummy.position.set(x, 0.42, z);
      dummy.updateMatrix();
      carBodies.setMatrixAt(i, dummy.matrix);
      dummy.position.y = 0.85;
      dummy.updateMatrix();
      carTops.setMatrixAt(i, dummy.matrix);
    });
    carBodies.instanceMatrix.needsUpdate = true;
    carTops.instanceMatrix.needsUpdate = true;
  };
  updateCars(0);

  // clouds
  const cloudMat = new MeshLambertMaterial({ color: '#ffffff', flatShading: true, transparent: true, opacity: 0.95 });
  const clouds = [];
  for (let i = 0; i < 7; i++) {
    const g = new Group();
    for (let p = 0; p < 4; p++) {
      const puff = new Mesh(new IcosahedronGeometry(2 + rnd() * 2.2, 0), cloudMat);
      puff.position.set(p * 2.6 - 4, rnd() * 1.2, (rnd() - 0.5) * 2);
      g.add(puff);
    }
    g.position.set((rnd() - 0.5) * 200, 34 + rnd() * 14, (rnd() - 0.5) * 160);
    g.userData.speed = 1 + rnd() * 1.5;
    scene.add(g);
    clouds.push(g);
  }

  /* ───────────── Hero building ───────────── */
  const hero = new Group();
  scene.add(hero);
  const heroMats = { cut: [], upper: [], windows: [] };
  const lambert = (color, opts = {}) => new MeshLambertMaterial({ color, ...opts });
  const box = (w, h, d, mat, x, y, z, parent, shadow = true) => {
    const m = new Mesh(new BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = shadow;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  const W = 8;
  const D = 8;
  const T = 0.22;
  const upper = new Group();
  hero.add(upper);
  const heroPick = [];

  for (let f = 0; f < HERO_FLOORS; f++) {
    const isTarget = f === TARGET_FLOOR;
    const isUpper = f > TARGET_FLOOR;
    const g = new Group();
    g.position.y = BASE_Y + f * FH;
    (isUpper ? upper : hero).add(g);

    const slabMat = lambert('#e9dfcf');
    const wallMat = lambert('#ffcf9f');
    const cutMat = isTarget ? lambert('#ffcf9f') : wallMat;
    const winMat = lambert('#bfe6ff', { emissive: '#ffcf70', emissiveIntensity: 0 });
    const cutWinMat = isTarget ? lambert('#bfe6ff', { emissive: '#ffcf70', emissiveIntensity: 0 }) : winMat;
    heroMats.windows.push(winMat);
    if (isTarget) {
      heroMats.cut.push(cutMat, cutWinMat);
      heroMats.windows.push(cutWinMat);
    }
    if (isUpper) heroMats.upper.push(slabMat, wallMat, winMat);

    box(W, 0.3, D, slabMat, 0, 0.15, 0, g);
    // back (-z) and left (-x) walls stay; front (+z) and right (+x) are the cutaway shell
    const back = box(W, FH, T, wallMat, 0, FH / 2, -D / 2 + T / 2, g);
    const left = box(T, FH, D, wallMat, -W / 2 + T / 2, FH / 2, 0, g);
    const front = box(W, FH, T, cutMat, 0, FH / 2, D / 2 - T / 2, g);
    const right = box(T, FH, D, cutMat, W / 2 - T / 2, FH / 2, 0, g);
    heroPick.push(back, left, front, right);
    // windows
    for (const xw of [-2, 2]) {
      box(1.5, 1.2, 0.08, winMat, xw, 1.75, -D / 2 - 0.02, g, false);
      box(1.5, 1.2, 0.08, cutWinMat, xw, 1.75, D / 2 + 0.02, g, false);
      box(0.08, 1.2, 1.5, winMat, -W / 2 - 0.02, 1.75, xw, g, false);
      box(0.08, 1.2, 1.5, cutWinMat, W / 2 + 0.02, 1.75, xw, g, false);
    }
    if (f === 0) box(1.3, 2.2, 0.1, lambert('#3b4163'), 0, 1.25, D / 2 + 0.03, g);
  }

  // roof + rooftop garden
  const roof = new Group();
  roof.position.y = BASE_Y + HERO_FLOORS * FH;
  upper.add(roof);
  const roofMat = lambert('#3b4163');
  const soilMat = lambert('#8a5a3b');
  const leafMat = lambert('#37b872', { flatShading: true });
  heroMats.upper.push(roofMat, soilMat, leafMat);
  box(W + 0.4, 0.35, D + 0.4, roofMat, 0, 0.17, 0, roof);
  box(3, 0.4, 1.4, soilMat, -1.6, 0.55, -2.2, roof);
  box(1.4, 0.4, 3, soilMat, 2.3, 0.55, 1.2, roof);
  [[-2.6, -2.2], [-0.6, -2.2], [2.3, 0.4], [2.3, 2.2]].forEach(([x, z]) => {
    const b = new Mesh(new IcosahedronGeometry(0.55, 0), leafMat);
    b.position.set(x, 1.1, z);
    b.castShadow = true;
    roof.add(b);
  });

  // target floor interior
  const room = new Group();
  room.position.y = BASE_Y + TARGET_FLOOR * FH + 0.3;
  hero.add(room);
  const inner = lambert('#f6efe4');
  box(T, FH - 0.3, 5.6, inner, 1.2, (FH - 0.3) / 2, -1.2, room);
  box(T, FH - 0.3, 1.2, inner, 1.2, (FH - 0.3) / 2, 3.4, room);
  box(4.9, 0.03, 7.6, lambert('#f3d9b1'), -1.35, 0.02, 0, room, false); // wood floor
  box(2.8, 0.04, 2, lambert('#ff9f7a'), -1.5, 0.05, 1.4, room, false); // rug
  // bed
  box(2.1, 0.45, 3, lambert('#8a5a3b'), -2.6, 0.25, -2.3, room);
  box(2, 0.25, 2.85, lambert('#ffffff'), -2.6, 0.6, -2.3, room);
  box(2.04, 0.3, 1.7, lambert('#5bb6ff'), -2.6, 0.64, -1.6, room);
  box(1.5, 0.22, 0.5, lambert('#fff7e8'), -2.6, 0.84, -3.35, room);
  box(2.1, 1.3, 0.15, lambert('#6b4430'), -2.6, 0.65, -3.72, room);
  // nightstand + lamp
  box(0.6, 0.6, 0.6, lambert('#c79a6b'), -1.05, 0.3, -3.4, room);
  box(0.12, 0.5, 0.12, lambert('#3b4163'), -1.05, 0.85, -3.4, room);
  const shadeMat = lambert('#ffd23f', { emissive: '#ffb020', emissiveIntensity: 0 });
  const shade = new Mesh(new ConeGeometry(0.32, 0.38, 12, 1, true), shadeMat);
  shade.position.set(-1.05, 1.25, -3.4);
  room.add(shade);
  const lampLight = new PointLight('#ffcf70', 0, 9, 1.6);
  lampLight.position.set(-1.05, 1.35, -3.2);
  room.add(lampLight);
  // sofa
  const sofaMat = lambert('#8e7cff');
  box(2.4, 0.45, 0.95, sofaMat, -1.5, 0.25, 3.25, room);
  box(2.4, 0.75, 0.25, sofaMat, -1.5, 0.6, 3.62, room);
  box(0.25, 0.6, 0.95, sofaMat, -2.6, 0.45, 3.25, room);
  box(0.25, 0.6, 0.95, sofaMat, -0.4, 0.45, 3.25, room);
  // coffee table
  box(1.2, 0.35, 0.6, lambert('#c79a6b'), -1.5, 0.2, 1.7, room);
  box(1.35, 0.07, 0.75, lambert('#e8c89e'), -1.5, 0.4, 1.7, room);
  // bookshelf with books
  box(0.45, 2.1, 1.7, lambert('#6b4430'), -3.55, 1.05, 0.6, room);
  ['#ff6b4a', '#ffd23f', '#5bb6ff', '#37b872', '#8e7cff'].forEach((c, i) => {
    box(0.3, 0.42, 0.18, lambert(c), -3.45, 0.5 + (i % 3) * 0.62, -0.05 + i * 0.3, room, false);
  });
  // plant
  box(0.45, 0.5, 0.45, lambert('#ff6b4a'), 0.6, 0.25, -3.4, room);
  const fol = new Mesh(new IcosahedronGeometry(0.55, 0), lambert('#37b872', { flatShading: true }));
  fol.position.set(0.6, 1, -3.4);
  room.add(fol);
  // wall art on the partition
  box(0.05, 0.9, 1.3, lambert('#ffd23f'), 1.07, 1.6, -1.6, room, false);
  box(0.06, 0.6, 0.9, lambert('#5bb6ff'), 1.06, 1.6, -1.6, room, false);
  // kitchen side
  box(2.5, 0.9, 0.7, lambert('#f4f1de'), 2.6, 0.45, -3.4, room);
  box(2.55, 0.08, 0.75, lambert('#3b4163'), 2.6, 0.93, -3.4, room);
  box(0.8, 1.9, 0.7, lambert('#dfe5ef'), 3.4, 0.95, -1.3, room);
  const table = new Mesh(new CylinderGeometry(0.55, 0.55, 0.08, 16), lambert('#e8c89e'));
  table.position.set(2.6, 0.75, 1.2);
  room.add(table);
  box(0.1, 0.7, 0.1, lambert('#6b4430'), 2.6, 0.36, 1.2, room);
  box(0.45, 0.5, 0.45, lambert('#ff9f7a'), 1.85, 0.25, 1.2, room);
  box(0.45, 0.5, 0.45, lambert('#ff9f7a'), 3.35, 0.25, 1.2, room);

  [...heroMats.cut, ...heroMats.upper].forEach((m) => (m.transparent = true));
  materials.glows.push(...heroMats.windows);
  const heroInfo = { name: 'Your first building', kind: 'Apartments', floors: HERO_FLOORS, residents: 11, monthly: 740, deco: 0.62 };
  heroPick.forEach((m) => (m.userData = heroInfo));
  buildings.push(...heroPick);

  /* ───────────── Camera, theme, render ───────────── */
  const cam = { px: 46, py: 52, pz: 58, tx: 0, ty: 2, tz: 0, fov: 32, cut: 0, lift: 0, lamp: 0 };
  const intro = { x: 0, y: 0, z: 0 };
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  const lookTarget = new Vector3();
  const upperMeshes = [];
  upper.traverse((o) => o.isMesh && upperMeshes.push(o));
  const cutMeshes = [];
  hero.traverse((o) => o.isMesh && heroMats.cut.includes(o.material) && cutMeshes.push(o));

  const themeState = { t: document.documentElement.dataset.theme === 'night' ? 1 : 0 };
  const cA = new Color();
  const cB = new Color();
  const mixHex = (a, b, t) => cA.set(a).lerp(cB.set(b), t);
  const applyTheme = () => {
    const t = themeState.t;
    const d = THEMES.day;
    const n = THEMES.night;
    scene.background.copy(mixHex(d.sky, n.sky, t));
    scene.fog.color.copy(mixHex(d.fog, n.fog, t));
    hemi.color.copy(mixHex(d.hemiSky, n.hemiSky, t));
    hemi.groundColor.copy(mixHex(d.hemiGround, n.hemiGround, t));
    hemi.intensity = d.hemi + (n.hemi - d.hemi) * t;
    sun.color.copy(mixHex(d.sun, n.sun, t));
    sun.intensity = d.sunI + (n.sunI - d.sunI) * t;
    ground.material.color.copy(mixHex(d.ground, n.ground, t));
    roadMat.color.copy(mixHex(d.road, n.road, t));
    materials.facades.forEach((m) => (m.emissiveIntensity = t * 0.9));
    materials.glows.forEach((m) => (m.emissiveIntensity = t * 1.1));
    cloudMat.opacity = 0.95 - t * 0.8;
  };
  applyTheme();

  const applyCam = (time) => {
    const cityWeight = Math.max(0, 1 - cam.cut * 1.2) * Math.max(0, 1 - (58 - cam.pz) / 30);
    const orbit = Math.sin(time * 0.08) * 0.1 * cityWeight;
    const px = cam.px + intro.x;
    const pz = cam.pz + intro.z;
    const cos = Math.cos(orbit);
    const sin = Math.sin(orbit);
    pointer.sx += (pointer.x - pointer.sx) * 0.05;
    pointer.sy += (pointer.y - pointer.sy) * 0.05;
    const par = 0.6 + cityWeight * 2.4;
    camera.position.set(px * cos - pz * sin + pointer.sx * par, cam.py + intro.y + pointer.sy * par * 0.6, px * sin + pz * cos);
    lookTarget.set(cam.tx, cam.ty, cam.tz);
    camera.lookAt(lookTarget);
    if (camera.fov !== cam.fov) {
      camera.fov = cam.fov;
      camera.updateProjectionMatrix();
    }
    // cutaway + lifting floors
    const cutOpacity = 1 - cam.cut;
    heroMats.cut.forEach((m) => (m.opacity = cutOpacity));
    cutMeshes.forEach((m) => (m.visible = cutOpacity > 0.02));
    upper.position.y = cam.lift * 14;
    const upOpacity = 1 - cam.lift;
    heroMats.upper.forEach((m) => (m.opacity = upOpacity));
    upperMeshes.forEach((m) => {
      m.visible = upOpacity > 0.02;
      m.castShadow = upOpacity > 0.9;
    });
    lampLight.intensity = cam.lamp * 7;
    shadeMat.emissiveIntensity = cam.lamp * 1.2;
  };

  const resize = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener('resize', resize);

  let elapsed = 0;
  const frame = (dt) => {
    elapsed += dt;
    updateCars(dt);
    clouds.forEach((c) => {
      c.position.x += c.userData.speed * dt;
      if (c.position.x > 120) c.position.x = -120;
    });
    applyCam(elapsed);
    renderer.render(scene, camera);
  };

  // picking for the City-level "inspect" card
  const raycaster = new Raycaster();
  const ndc = new Vector2();
  let highlighted = null;
  const pick3d = (clientX, clientY) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(buildings, false)[0];
    return hit ? hit.object : null;
  };
  const highlight = (mesh) => {
    if (highlighted === mesh) return;
    if (highlighted && highlighted.userData._mat) {
      highlighted.material.dispose();
      highlighted.material = highlighted.userData._mat;
      highlighted.userData._mat = null;
    }
    highlighted = mesh;
    if (mesh && !heroPick.includes(mesh)) {
      mesh.userData._mat = mesh.material;
      const m = mesh.material.clone();
      m.emissive = new Color('#ffb020');
      m.emissiveMap = null;
      m.emissiveIntensity = 0.35;
      mesh.material = m;
    }
  };

  return {
    cam,
    intro,
    pointer,
    layout,
    frame,
    applyTheme,
    themeState,
    pick: (x, y) => {
      const mesh = pick3d(x, y);
      highlight(mesh);
      return mesh ? mesh.userData : null;
    },
    clearPick: () => highlight(null),
    render: () => {
      applyCam(elapsed);
      renderer.render(scene, camera);
    },
  };
}
