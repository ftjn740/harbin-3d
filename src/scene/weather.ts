import * as THREE from 'three';
import { pointInside, ribbon, seeded, mergedMesh } from './geometry';
import type { CityData, Point } from '../types';

export function createWeather(data:CityData) {
  const group=new THREE.Group();
  const snowUniforms={uTime:{value:0},uOrigin:{value:new THREE.Vector3()}};
  const geometry=new THREE.BufferGeometry();const positions=[];
  for(let i=0;i<500;i++)positions.push((seeded('sx'+i)-.5)*380,seeded('sy'+i)*210,(seeded('sz'+i)-.5)*380);
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  const material=new THREE.ShaderMaterial({uniforms:snowUniforms,transparent:true,depthWrite:false,
    vertexShader:`uniform float uTime; uniform vec3 uOrigin; varying float vFade;
      void main(){vec3 p=position;p.y=mod(p.y-uTime*3.0,210.0);p.x+=sin(uTime*.25+p.z)*2.0;p+=uOrigin;
      vec4 mv=modelViewMatrix*vec4(p,1.0);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(200.0 / max(30.0,-mv.z),1.0,2.8);vFade=clamp(1.0-length(p.xz-uOrigin.xz)/240.0,0.0,1.0);}`,
    fragmentShader:`varying float vFade;void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,.12,d)*.52*vFade;if(a<.02)discard;gl_FragColor=vec4(.91,.96,1.0,a);}`,
  });
  const flakes=new THREE.Points(geometry,material);flakes.frustumCulled=false;group.add(flakes);
  const starsGeo=new THREE.BufferGeometry();const starPoints=[];
  for(let i=0;i<500;i++){const a=seeded('a'+i)*Math.PI*2,y=2000+seeded('y'+i)*10000,r=8000+seeded('r'+i)*6000;starPoints.push(Math.sin(a)*r,y,Math.cos(a)*r);}
  starsGeo.setAttribute('position',new THREE.Float32BufferAttribute(starPoints,3));
  const stars=new THREE.Points(starsGeo,new THREE.PointsMaterial({color:'#c2d6ec',size:1.3,sizeAttenuation:false,transparent:true,opacity:.65,depthWrite:false}));stars.visible=false;group.add(stars);
  const water=data.surfaces.filter(s=>s.kind==='water');
  const cracks:THREE.BufferGeometry[]=[];
  for(let i=0;i<180;i++){
    const x=data.bounds[0]+seeded('cx'+i)*(data.bounds[2]-data.bounds[0]),z=data.bounds[1]+seeded('cz'+i)*(data.bounds[3]-data.bounds[1]);
    const p:Point=[x,z];if(!water.some(s=>pointInside(p,s.outer)&&!s.holes.some(h=>pointInside(p,h))))continue;
    const dx=(seeded('dx'+i)-.5)*90,dz=(seeded('dz'+i)-.5)*90;
    const ps:Point[]=[p,[x+dx*.4,z+dz*.5],[x+dx*.55+8,z+dz*.65],[x+dx,z+dz]];
    if(ps.some(q=>!water.some(s=>pointInside(q,s.outer)&&!s.holes.some(h=>pointInside(q,h)))))continue;
    cracks.push(ribbon(ps,.45,.07));
  }
  const crackMesh=mergedMesh(cracks,new THREE.MeshBasicMaterial({color:'#bfdae5',transparent:true,opacity:.35,side:THREE.DoubleSide}));if(crackMesh)group.add(crackMesh);
  return{group,setNight:(value:boolean)=>{stars.visible=value;},update:(time:number,camera:THREE.Camera,distance:number,reducedMotion:boolean)=>{
    flakes.visible=distance<1800&&!reducedMotion;snowUniforms.uTime.value=time;
    snowUniforms.uOrigin.value.set(camera.position.x,Math.max(0,camera.position.y-110),camera.position.z);
  }};
}
