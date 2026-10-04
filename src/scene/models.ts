import * as THREE from 'three';
import { mergedMesh, pointInside, seeded } from './geometry';
import { brickTexture, iceMaterial } from './materials';
import type { CityData, Point } from '../types';

const snow=new THREE.MeshStandardMaterial({color:'#e6e9e9',roughness:.94});
const stone=new THREE.MeshStandardMaterial({color:'#d1c5b0',roughness:.8});
const green=new THREE.MeshStandardMaterial({color:'#3c635b',metalness:.35,roughness:.55});
const gold=new THREE.MeshStandardMaterial({color:'#d4a852',metalness:.62,roughness:.32});
const dark=new THREE.MeshStandardMaterial({color:'#243f42',roughness:.72});

export class ModelBuilder {
  parts = new Map<THREE.Material, THREE.BufferGeometry[]>();
  add(g: THREE.BufferGeometry,m: THREE.Material,x=0,y=0,z=0,ry=0) {
    g.rotateY(ry);g.translate(x,y,z);
    const list=this.parts.get(m)||[];list.push(g);this.parts.set(m,list);
  }
  box(w:number,h:number,d:number,m:THREE.Material,x=0,y=0,z=0,ry=0) {this.add(new THREE.BoxGeometry(w,h,d),m,x,y+h/2,z,ry);}
  cylinder(r:number,h:number,m:THREE.Material,x=0,y=0,z=0,top=r,segments=24) {this.add(new THREE.CylinderGeometry(top,r,h,segments),m,x,y+h/2,z);}
  finish() {const group=new THREE.Group(); for(const [m,gs] of this.parts){const mesh=mergedMesh(gs,m);if(mesh){mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);}}return group;}
}

function cross(b:ModelBuilder,x:number,y:number,z:number,size=1) {
  b.box(.28*size,4*size,.28*size,gold,x,y,z);b.box(2.2*size,.26*size,.3*size,gold,x,y+2.6*size,z);
  b.box(1.2*size,.22*size,.28*size,gold,x,y+3.35*size,z);
}
function onion(b:ModelBuilder,x:number,y:number,z:number,r:number,h:number) {
  const ps=[new THREE.Vector2(.85*r,0),new THREE.Vector2(.94*r,.12*h),new THREE.Vector2(r,.28*h),new THREE.Vector2(.97*r,.4*h),new THREE.Vector2(.82*r,.59*h),new THREE.Vector2(.55*r,.76*h),new THREE.Vector2(.23*r,.93*h),new THREE.Vector2(.04*r,h)];
  b.add(new THREE.LatheGeometry(ps,40),green,x,y,z);
  for(let i=0;i<12;i++) {
    const angle=i/12*Math.PI*2;const curve=new THREE.CatmullRomCurve3(ps.map(p=>new THREE.Vector3(p.x*Math.cos(angle),p.y,p.x*Math.sin(angle))));
    b.add(new THREE.TubeGeometry(curve,16,.08,4,false),gold,x,y,z);
  }
  cross(b,x,y+h,z,.65);
}
function arch(b:ModelBuilder,x:number,y:number,z:number,w:number,h:number,m:THREE.Material,rotation=0) {
  const s=new THREE.Shape();s.moveTo(-w/2,0);s.lineTo(w/2,0);s.lineTo(w/2,h-w/2);s.absarc(0,h-w/2,w/2,0,Math.PI,false);s.closePath();
  const g=new THREE.ExtrudeGeometry(s,{depth:.15,bevelEnabled:false,curveSegments:10});
  b.add(g,m,x,y,z,rotation);
}
export function sophiaModel(night:{value:number}) {
  const b=new ModelBuilder();
  const brick=new THREE.MeshStandardMaterial({color:'#ffffff',map:brickTexture(),roughness:.9});
  const trim=new THREE.MeshStandardMaterial({color:'#bca086',roughness:.8});
  const glass=new THREE.MeshStandardMaterial({color:'#382c25',emissive:'#edb670',emissiveIntensity:.3,roughness:.5});
  const lit:THREE.MeshStandardMaterial[]=[glass];
  b.box(52,.5,38,stone,0,0,0);b.box(44,1,30,stone,0,.5,0);
  b.box(34,17,17,brick,2,1,0);b.box(20,18,26,brick,4,1,0);
  b.cylinder(8,16,brick,17,1,0,8,24);
  b.box(36,1.3,19,trim,1,16,0);b.box(22,1.3,28,trim,4,17,0);
  b.box(36,.3,19,snow,1,17.3,0);b.box(22,.3,28,snow,4,18.3,0);
  b.cylinder(9.2,3,green,3,19,0,8.5);b.cylinder(7.7,9,brick,3,22,0,7.7,32);
  b.cylinder(8.1,.7,trim,3,30.5,0);onion(b,3,31.2,0,9.3,13.5);
  // Western bell tower and four corner turrets.
  b.box(9,25,9,brick,-16,1,0);b.box(10,.7,10,trim,-16,25,0);b.box(10,.25,10,snow,-16,25.7,0);
  b.cylinder(5.2,6,brick,-16,26,0,5.2,8);b.cylinder(6.2,8,green,-16,32,0,0,8);cross(b,-16,40,0,.65);
  for(const [x,z] of [[-5,-11],[-5,11],[13,-11],[13,11]]) {
    b.cylinder(2.9,6,brick,x,18,z,2.9,16);b.cylinder(3.2,.5,trim,x,24,z);onion(b,x,24.5,z,3.2,5.2);
  }
  for(const z of [-13.08,13.08]) for(const x of [-2,4,10]) {
    const ry=z<0?Math.PI:0;
    arch(b,x,5,z,3.4,7.8,trim,ry);arch(b,x,5.4,z+(z<0?-.16:.16),2.6,6.8,glass,ry);
    b.box(.22,6.3,.2,trim,x,5.4,z+(z<0?-.4:.4));b.box(2.8,.2,.2,trim,x,9,z+(z<0?-.4:.4));
  }
  for(let i=0;i<12;i++) {
    const a=i/12*Math.PI*2;const x=3+7.76*Math.sin(a),z=7.76*Math.cos(a);
    arch(b,x,23,z,1.9,6,trim,a);arch(b,x+.12*Math.sin(a),23.35,z+.12*Math.cos(a),1.25,5.3,glass,a);
  }
  for(const z of [-4.55,4.55]) {arch(b,-16,19,z,3.2,5.2,dark,z<0?Math.PI:0);}
  arch(b,-20.55,1.5,0,4.7,7.4,trim,-Math.PI/2);arch(b,-20.75,1.6,0,3.7,6.7,dark,-Math.PI/2);
  b.box(5.5,.4,9,stone,-24,.3,0);
  const group=b.finish();group.rotation.y=-.27;
  void night;
  return {group,lit};
}

export function floodModel() {
  const b=new ModelBuilder();
  const bronze=new THREE.MeshStandardMaterial({color:'#735b3e',metalness:.5,roughness:.6});
  b.cylinder(25,.25,stone,0,.15,0,25,48);b.cylinder(10,.5,stone,0,.4,0,10,32);
  for(let i=0;i<4;i++) b.box(11-i*1.3,.7,11-i*1.3,stone,0,.9+i*.7,0);
  b.cylinder(3.5,13,stone,0,3.7,0,2.4,8);b.cylinder(3.9,.75,stone,0,16.7,0,3.9,16);
  b.cylinder(3,1.4,bronze,0,17.45,0,3,16);
  // Simplified sculptural figures atop the monument.
  for(const [x,z,h] of [[-1,0,3.4],[1,0,3], [0,1,3.8]]) {
    b.box(.7,h,.55,bronze,x,18.8,z);b.add(new THREE.SphereGeometry(.45,10,8),bronze,x,18.8+h+.25,z);
  }
  const r=22;
  for(let i=0;i<21;i++) {
    const a=Math.PI*.13+i/20*Math.PI*.74;const x=Math.cos(a)*r,z=Math.sin(a)*r;
    b.cylinder(.5,5.6,stone,x,.8,z,.5,12);b.cylinder(.75,.3,stone,x,6.4,z,.75,12);
    if(i<20) {const a2=Math.PI*.13+(i+1)/20*Math.PI*.74;const x2=Math.cos(a2)*r,z2=Math.sin(a2)*r;const len=Math.hypot(x2-x,z2-z);b.box(len+.2,.7,1.5,stone,(x+x2)/2,6.7,(z+z2)/2,-Math.atan2(z2-z,x2-x));b.box(len+.2,.12,1.6,snow,(x+x2)/2,7.4,(z+z2)/2,-Math.atan2(z2-z,x2-x));}
  }
  return b.finish();
}

export function iceWorldModel(data:CityData, origin:Point) {
  const b=new ModelBuilder();
  const cyan=iceMaterial('#74c7e1'),blue=iceMaterial('#548bc4'),pink=iceMaterial('#c792ce');
  const lit=[cyan,blue,pink];
  const tower=(x:number,z:number,r:number,h:number,m:THREE.MeshPhysicalMaterial)=>{
    b.cylinder(r+3,1.5,snow,x,.1,z,r+3,8);b.cylinder(r,h,m,x,1.5,z,r*.9,8);
    for(let y=6;y<h;y+=7)b.cylinder(r*1.04,.5,m,x,y,z,r*1.04,8);
    b.cylinder(r*1.25,8,m,x,h+1.5,z,0,8);
    for(let j=0;j<8;j++){const a=j/8*Math.PI*2;b.box(1.1,h-4,1.1,m,x+Math.sin(a)*r,3,z+Math.cos(a)*r);}
  };
  // Seasonal architecture is a composition inside the real OSM park boundary.
  b.box(250,1,240,snow,0,0,0);
  b.box(110,17,50,cyan,0,1,-30);b.box(85,26,42,blue,0,1,-30);
  b.box(68,9,52,cyan,0,26,-30);
  for(const x of [-53,-28,28,53])tower(x,-30,7.5,x===-28||x===28?40:31,cyan);
  tower(0,-30,11,66,blue);
  for(const x of [-70,70]) {tower(x,18,9,30,pink);b.box(8,15,90,cyan,x,1,-22);}
  // Freestanding lantern courts and crystalline sculpture forms.
  for(let i=0;i<16;i++) {
    const a=i/16*Math.PI*2;const x=Math.cos(a)*160,z=Math.sin(a)*110;
    tower(x,z,4+i%3,14+(i%4)*4,i%3===0?pink:cyan);
  }
  for(let row=0;row<4;row++)for(let col=0;col<5;col++){
    const x=-210+col*45,z=-200-row*50;const m=(col+row)%2?blue:cyan;
    b.box(23,12,22,m,x,1,z);b.cylinder(18,12,m,x,13,z,0,4);
  }
  // An illustrative ice slide, with a real-scale park footprint.
  for(let i=0;i<6;i++)b.box(130,2,9,cyan,-190,12-i*1.8,80+i*11,.12);
  for(let i=0;i<12;i++) b.add(new THREE.OctahedronGeometry(6+(i%3)*2,0),i%2?cyan:pink,185+(i%4)*30,10,40+Math.floor(i/4)*35);
  // Keep the wheel at its mapped center; its structure is an approximate rebuild.
  const mappedWheel=data.buildings.find(building=>building.id==='1112348116')!;
  const wheelX=mappedWheel.center[0]-origin[0],wheelZ=mappedWheel.center[1]-origin[1],wheelY=65,r=58;
  const wheel=new THREE.TorusGeometry(r,1.4,6,80);b.add(wheel,cyan,wheelX,wheelY,wheelZ);
  b.box(3,70,4,stone,wheelX-18,0,wheelZ);b.box(3,70,4,stone,wheelX+18,0,wheelZ);
  for(let i=0;i<24;i++){
    const a=i/24*Math.PI*2;const x=wheelX+Math.sin(a)*r,y=wheelY+Math.cos(a)*r;
    const g=new THREE.CylinderGeometry(.45,.45,r,6);g.rotateZ(-a);g.translate(Math.sin(a)*r/2,Math.cos(a)*r/2,0);b.add(g,cyan,wheelX,wheelY,wheelZ);
    b.box(4.5,5,4.5,i%3===0?pink:blue,x,y-3,wheelZ);
  }
  return{group:b.finish(),lit};
}

export function centralStreetDetails(data:CityData) {
  const b=new ModelBuilder();
  const cream=new THREE.MeshStandardMaterial({color:'#c9bb9e',roughness:.88});
  const roof=new THREE.MeshStandardMaterial({color:'#5f6c73',roughness:.76});
  const pane=new THREE.MeshStandardMaterial({color:'#385363',emissive:'#e1a766',emissiveIntensity:.25,roughness:.4});
  const warm=new THREE.MeshStandardMaterial({color:'#e0c290',emissive:'#ffb55c',emissiveIntensity:.5});
  const streets=data.roads.filter(r=>r.name==='中央大街');
  const distance=(p:Point)=>{
    let closest=Infinity;
    for(const r of streets)for(let i=1;i<r.points.length;i++){
      const a=r.points[i-1],c=r.points[i];const dx=c[0]-a[0],dz=c[1]-a[1],t=THREE.MathUtils.clamp(((p[0]-a[0])*dx+(p[1]-a[1])*dz)/(dx*dx+dz*dz),0,1);
      closest=Math.min(closest,Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dz));
    }return closest;
  };
  const detailBuildings=data.buildings.filter(building=>building.outer.some(p=>distance(p)<42)&&building.height<=30);
  for(const building of detailBuildings) {
    const h=building.height;
    for(let i=1;i<building.outer.length;i++){
      const [ax,az]=building.outer[i-1],[cx,cz]=building.outer[i];const dx=cx-ax,dz=cz-az,len=Math.hypot(dx,dz);
      if(len<3)continue;
      const mx=(ax+cx)/2,mz=(az+cz)/2,ry=-Math.atan2(dz,dx);
      b.box(len,.45,.65,cream,mx,h-.8,mz,ry);b.box(len,.18,.75,snow,mx,h-.3,mz,ry);
      if(distance([mx,mz])>50||len<8)continue;
      const nx=dz/len,nz=-dx/len;
      // Place decorative surfaces just outside the actual mapped wall.
      const side=pointInside([mx+nx,mz+nz],building.outer)?-1:1;
      const rotation=side<0?ry:ry+Math.PI;
      const count=Math.floor(len/4.2);
      for(let j=0;j<count;j++){
        const t=(j+.5)/count,x=ax+t*dx+nx*.3*side,z=az+t*dz+nz*.3*side;
        for(let floor=0;floor<Math.min(4,Math.floor(h/3.4));floor++){
          arch(b,x,floor*3.4+.8,z,1.85,2.45,cream,rotation);
          arch(b,x+nx*.19*side,floor*3.4+1,z+nz*.19*side,1.36,2.0,pane,rotation);
        }
      }
      b.box(len,.35,1,cream,mx,3.6,mz,ry);
      if(building.name==='马迭尔宾馆'){
        b.box(len,2.2,.65,cream,mx,h,mz,ry);b.box(len,.3,.8,snow,mx,h+2.2,mz,ry);
        b.cylinder(4,5,roof,mx,h+2.5,mz,0,24);
      }
    }
  }
  // Lamps follow the actual central street polyline rather than a guessed axis.
  for(const street of streets)for(let i=1;i<street.points.length;i++){
    const a=street.points[i-1],c=street.points[i],dx=c[0]-a[0],dz=c[1]-a[1],len=Math.hypot(dx,dz),n=Math.floor(len/35);
    for(let j=0;j<n;j++)for(const side of [-1,1]){
      const t=(j+.5)/n,x=a[0]+dx*t-dz/len*8.5*side,z=a[1]+dz*t+dx/len*8.5*side;
      b.cylinder(.13,5.8,dark,x,.2,z,.13,6);b.cylinder(.65,.25,gold,x,5.8,z,.4,6);
      b.add(new THREE.SphereGeometry(.48,8,6),warm,x,6.3,z);b.cylinder(.7,.35,dark,x,6.75,z,0,8);
    }
  }
  return{group:b.finish(),lit:[pane,warm]};
}

export function winterTrees(data:CityData) {
  const group=new THREE.Group();
  const parks=data.surfaces.filter(s=>s.kind==='park'&&s.outer.length>3).map(s=>({...s,bounds:[Math.min(...s.outer.map(p=>p[0])),Math.min(...s.outer.map(p=>p[1])),Math.max(...s.outer.map(p=>p[0])),Math.max(...s.outer.map(p=>p[1]))]}));
  const water=data.surfaces.filter(s=>s.kind==='water');
  let points:Point[]=[];
  const [minX,minZ,maxX,maxZ]=data.bounds;
  for(let x=minX+20;x<maxX;x+=38)for(let z=minZ+20;z<maxZ;z+=38){
    const hash=seeded(`${Math.round(x)}:${Math.round(z)}`);if(hash>.56)continue;
    const p:Point=[x+(hash-.5)*28,z+(seeded('z'+x+z)-.5)*28];
    if(!parks.some(s=>p[0]>s.bounds[0]&&p[0]<s.bounds[2]&&p[1]>s.bounds[1]&&p[1]<s.bounds[3]&&pointInside(p,s.outer)&&!s.holes.some(h=>pointInside(p,h))))continue;
    if(water.some(s=>pointInside(p,s.outer)&&!s.holes.some(h=>pointInside(p,h))))continue;
    if(data.buildings.some(b=>Math.hypot(p[0]-b.center[0],p[1]-b.center[1])<24))continue;
    points.push(p);
  }
  // Sample throughout the whole area, avoiding a west-to-east cap bias.
  points=points.sort((a,b)=>seeded('sample'+a.join(':'))-seeded('sample'+b.join(':'))).slice(0,2600);
  const trunkParts:THREE.BufferGeometry[]=[],snowParts:THREE.BufferGeometry[]=[];
  const trunk=new THREE.CylinderGeometry(.2,.45,7,5);trunk.translate(0,3.5,0);trunkParts.push(trunk);
  for(let i=0;i<7;i++){
    const a=i*2.4;const branch=new THREE.CylinderGeometry(.08,.18,4,4);branch.rotateZ(-.75);branch.rotateY(a);branch.translate(Math.cos(a)*1.25,4+i*.35,Math.sin(a)*1.25);trunkParts.push(branch);
    const cap=new THREE.SphereGeometry(1.3,6,4);cap.scale(1,.28,.8);cap.translate(Math.cos(a)*2.5,5.6+i*.35,Math.sin(a)*2.5);snowParts.push(cap);
  }
  const trunkMesh=mergedMesh(trunkParts,new THREE.MeshStandardMaterial({color:'#6e695f',roughness:1}))!;
  const snowMesh=mergedMesh(snowParts,snow)!;
  const trunks=new THREE.InstancedMesh(trunkMesh.geometry,trunkMesh.material,points.length);
  const caps=new THREE.InstancedMesh(snowMesh.geometry,snowMesh.material,points.length);
  const dummy=new THREE.Object3D();
  points.forEach(([x,z],i)=>{const r=seeded('tree'+i);dummy.position.set(x,0,z);dummy.rotation.y=r*Math.PI*2;dummy.scale.setScalar(.75+r*.65);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);caps.setMatrixAt(i,dummy.matrix);});
  trunks.receiveShadow=true;caps.receiveShadow=true;group.add(trunks,caps);
  return{group,count:points.length};
}
