import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Footprint, Point } from '../types';

export function shapeFrom(poly: Footprint): THREE.Shape {
  const ring = (ps: Point[]) => new THREE.Path(ps.map(([x, z]) => new THREE.Vector2(x, -z)));
  const shape = new THREE.Shape(poly.outer.map(([x, z]) => new THREE.Vector2(x, -z)));
  shape.holes = poly.holes.map(ring);
  return shape;
}
export function flatGeometry(poly: Footprint, y: number): THREE.BufferGeometry {
  const geometry = new THREE.ShapeGeometry(shapeFrom(poly));
  geometry.rotateX(-Math.PI / 2); geometry.translate(0, y, 0);
  return geometry;
}
export function volumeGeometry(poly: Footprint, height: number, bottom = 0): THREE.BufferGeometry {
  const g = new THREE.ExtrudeGeometry(shapeFrom(poly), { depth: height, bevelEnabled: false, steps: 1, curveSegments: 1 });
  g.rotateX(-Math.PI / 2); g.translate(0, bottom, 0); g.clearGroups();
  return g;
}
export function mergedMesh(geometries: THREE.BufferGeometry[], material: THREE.Material): THREE.Mesh | null {
  if (!geometries.length) return null;
  // Extrude geometry is non-indexed; harmonize before merging with roofs/boxes.
  const gs = geometries.map(g => g.index ? g.toNonIndexed() : g);
  const merged = mergeGeometries(gs, false);
  gs.forEach(g => g.dispose());
  geometries.forEach(g => { if (g.index) g.dispose(); });
  if (!merged) throw new Error('无法合并城市几何体');
  merged.computeBoundingSphere();
  return new THREE.Mesh(merged, material);
}
export function ribbon(ps: Point[], width: number, y: number): THREE.BufferGeometry {
  const positions: number[] = []; const normals: number[] = []; const uv: number[] = [];
  let distance = 0;
  for (let i = 1; i < ps.length; i++) {
    const [ax,az] = ps[i-1], [bx,bz] = ps[i];
    const length = Math.hypot(bx-ax,bz-az); if (length < .01) continue;
    const nx = -(bz-az)/length*width/2, nz = (bx-ax)/length*width/2;
    const a=[ax+nx,y,az+nz], b=[bx+nx,y,bz+nz], c=[bx-nx,y,bz-nz], d=[ax-nx,y,az-nz];
    positions.push(...a,...b,...c,...a,...c,...d);
    for(let k=0;k<6;k++) normals.push(0,1,0);
    uv.push(0,distance,0,distance+length,1,distance+length,0,distance,1,distance+length,1,distance);
    distance+=length;
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2)); return g;
}
export function seeded(id: string): number {
  let h = 2166136261; for (const c of id) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967295;
}
export function pointInside(p: Point, ring: Point[]): boolean {
  let inside = false;
  for (let i=0,j=ring.length-1;i<ring.length;j=i++) {
    const a=ring[i], b=ring[j];
    if ((a[1]>p[1]) !== (b[1]>p[1]) && p[0] < (b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0]) inside=!inside;
  }
  return inside;
}
