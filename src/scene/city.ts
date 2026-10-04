import * as THREE from 'three';
import { facadeMaterial } from './materials';
import { flatGeometry, mergedMesh, ribbon, seeded, volumeGeometry } from './geometry';
import type { CityData } from '../types';

export function buildCity(data: CityData, night: { value: number }) {
  const world=new THREE.Group();
  const [minX,minZ,maxX,maxZ]=data.bounds;
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(maxX-minX,maxZ-minZ),new THREE.MeshStandardMaterial({color:'#ced7dc',roughness:.93}));
  ground.rotation.x=-Math.PI/2;ground.position.set((minX+maxX)/2,-.6,(minZ+maxZ)/2);ground.receiveShadow=true;world.add(ground);
  const snow=new THREE.MeshStandardMaterial({color:'#e4e9eb',roughness:.95});
  const mats={
    water:new THREE.MeshStandardMaterial({color:'#8eabbc',roughness:.4,metalness:.26}),
    park:new THREE.MeshStandardMaterial({color:'#bdc9ca',roughness:.94}),
    square:new THREE.MeshStandardMaterial({color:'#c1c4bf',roughness:.86}),
    icepark:new THREE.MeshStandardMaterial({color:'#d5e4e8',roughness:.72}),
  };
  mats.water.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vIcePosition;');
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvIcePosition=(modelMatrix*vec4(position,1.0)).xyz;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vIcePosition;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      vec2 p=vIcePosition.xz;
      float frost=sin(p.x*.006+sin(p.y*.004))*sin(p.y*.005+p.x*.002);
      float streak=pow(abs(sin(p.x*.037+p.y*.011+sin(p.y*.013))),24.0);
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.69,.78,.83),smoothstep(.05,.8,frost)*.28+streak*.07);
    `);
  };
  for(const kind of ['park','square','icepark','water'] as const) {
    const mesh=mergedMesh(data.surfaces.filter(s=>s.kind===kind).map(s=>flatGeometry(s,kind==='water'?.02:kind==='park'?-.15:.1)),mats[kind]);
    if(mesh){mesh.receiveShadow=true;world.add(mesh);}
  }
  const roadMat=new THREE.MeshStandardMaterial({color:'#8b959c',roughness:.92,side:THREE.DoubleSide});
  const pathMat=new THREE.MeshStandardMaterial({color:'#a8b1b5',roughness:.9,side:THREE.DoubleSide});
  const centralMat=new THREE.MeshStandardMaterial({color:'#baa88c',roughness:.88,side:THREE.DoubleSide});
  const widths:Record<string,number>={motorway:22,trunk:20,primary:16,secondary:12,tertiary:10,residential:7,service:4,footway:2,path:1.8,pedestrian:9,steps:2,cycleway:2.5};
  for(const group of ['road','path','central']) {
    const roads=data.roads.filter(r=> group==='central'?r.name==='中央大街':group==='path'?r.name!=='中央大街'&&['footway','path','steps','cycleway','pedestrian'].includes(r.kind):r.name!=='中央大街'&&!['footway','path','steps','cycleway','pedestrian'].includes(r.kind));
    const mesh=mergedMesh(roads.map(r=>ribbon(r.points,r.name==='中央大街'?18:widths[r.kind]||6,r.bridge?12:.16)),group==='central'?centralMat:group==='path'?pathMat:roadMat);
    if(mesh){mesh.receiveShadow=true;world.add(mesh);}
  }
  const wallMats=['#a6a9a5','#b6a996','#9da8b1','#ac9282'].map(c=>facadeMaterial(c,night));
  const chunks=new Map<string,typeof data.buildings>();
  for(const b of data.buildings) {
    if(['1112348116','338438411'].includes(b.id))continue; // Wheel and memorial colonnade have independent models.
    const key=`${Math.floor(b.center[0]/700)}:${Math.floor(b.center[1]/700)}`;
    const list=chunks.get(key)||[];list.push(b);chunks.set(key,list);
  }
  for(const [key,bs] of chunks) {
    const chunk=new THREE.Group();chunk.name='buildings-'+key;
    for(let i=0;i<wallMats.length;i++) {
      const mesh=mergedMesh(bs.filter(b=>Math.floor(seeded(b.id)*4)===i&&!['冰雪秀场','东售票大厅','南售票大厅','餐饮馆','冰山馆','室内冰雪馆','亲子游乐馆'].includes(b.name)).map(b=>volumeGeometry(b,b.height)),wallMats[i]);
      if(mesh){mesh.castShadow=true;mesh.receiveShadow=true;chunk.add(mesh);}
    }
    const roof=mergedMesh(bs.map(b=>flatGeometry(b,b.height+.25)),snow);
    if(roof){roof.receiveShadow=true;chunk.add(roof);}
    world.add(chunk);
  }
  const halls=data.buildings.filter(b=>['冰雪秀场','东售票大厅','南售票大厅','餐饮馆','冰山馆','室内冰雪馆','亲子游乐馆'].includes(b.name));
  const hallMesh=mergedMesh(halls.map(b=>volumeGeometry(b,b.height)),new THREE.MeshStandardMaterial({color:'#a6bdc6',roughness:.55,metalness:.18}));
  if(hallMesh){hallMesh.castShadow=true;hallMesh.receiveShadow=true;world.add(hallMesh);}
  return {world, wallMats};
}
