// Selection affordance in the scene: a thin gold survey frame on the ground around
// the selected footprint, with corner ticks. Unlit, below the bloom threshold and
// never glowing; it reads as a site-plan annotation rather than a hologram.
import * as T from 'three';

export const FRAME_COLOR = 0xd4a843;

export function frameSegments(f, { offset = 4, band = 1.2, tick = 6 } = {}) {
  const hw = f.w / 2 + offset, hd = f.d / 2 + offset;
  // [centerX, centerZ, sizeX, sizeZ] relative to the facility centre.
  const edges = [
    [0, -hd, hw * 2 + band, band], [0, hd, hw * 2 + band, band],
    [-hw, 0, band, hd * 2 + band], [hw, 0, band, hd * 2 + band],
  ];
  const ticks = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    ticks.push([sx * (hw + tick / 2 + band), sz * hd, tick, band]);
    ticks.push([sx * hw, sz * (hd + tick / 2 + band), band, tick]);
  }
  return [...edges, ...ticks];
}

export function createSelectionFrame() {
  const root = new T.Group();
  root.name = 'experience-selection-frame';
  root.visible = false;
  const material = new T.MeshBasicMaterial({ color: FRAME_COLOR, transparent: true, opacity: .92, depthWrite: false, toneMapped: false });
  const geometry = new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  let meshes = [];
  return {
    object: root,
    show(f) {
      for (const mesh of meshes) root.remove(mesh);
      meshes = frameSegments(f).map(([x, z, sx, sz]) => {
        const mesh = new T.Mesh(geometry, material);
        mesh.position.set(x, 0, z); mesh.scale.set(sx, 1, sz);
        mesh.renderOrder = 2; mesh.raycast = () => {};
        root.add(mesh);
        return mesh;
      });
      root.position.set(f.x, .55, f.z);
      root.visible = true;
    },
    hide() { root.visible = false; },
  };
}
