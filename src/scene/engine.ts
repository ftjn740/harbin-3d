import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildCity } from './city';
import { sophiaModel, floodModel, centralStreetDetails, iceWorldModel, winterTrees } from './models';
import { createWeather } from './weather';
import type { CityData, Landmark, LandmarkId, MarkerPosition, SceneApi, SceneMetrics, TimeOfDay } from '../types';

interface Callbacks {
  markers: (positions: MarkerPosition[]) => void;
  metrics: (metrics: SceneMetrics) => void;
  error: (message: string) => void;
}
const PRESETS={
  day:{sky:'#9bb6c9',fog:'#c1cdd4',sun:'#fff0d2',sunIntensity:2.6,ambient:2.0,night:0,exposure:1.0,bloom:.12},
  dusk:{sky:'#72899d',fog:'#a9adb8',sun:'#ffc58e',sunIntensity:2.25,ambient:1.25,night:.72,exposure:1.0,bloom:.22},
  night:{sky:'#101f38',fog:'#253a52',sun:'#7bade0',sunIntensity:.22,ambient:.26,night:1.6,exposure:1.07,bloom:.4},
};

export function createScene(host:HTMLElement,data:CityData,landmarks:Landmark[],callbacks:Callbacks):SceneApi {
  const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5));renderer.setSize(host.clientWidth,host.clientHeight);
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.info.autoReset=false;
  renderer.domElement.setAttribute('aria-label','哈尔滨三维城市；拖动旋转，滚轮缩放，右键平移');
  host.appendChild(renderer.domElement);
  const scene=new THREE.Scene();scene.background=new THREE.Color(PRESETS.dusk.sky);
  const pmrem=new THREE.PMREMGenerator(renderer);const room=new RoomEnvironment();
  const environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;scene.environmentIntensity=.28;room.dispose();pmrem.dispose();
  const skyUniforms={top:{value:new THREE.Color('#526c89')},bottom:{value:new THREE.Color('#d8b6a0')}};
  const sky=new THREE.Mesh(new THREE.SphereGeometry(18000,24,16),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:skyUniforms,
    vertexShader:'varying vec3 vSkyDirection;void main(){vSkyDirection=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:'varying vec3 vSkyDirection;uniform vec3 top;uniform vec3 bottom;void main(){float t=smoothstep(-.06,.66,normalize(vSkyDirection).y);gl_FragColor=vec4(mix(bottom,top,t),1.0);}',
  }));sky.renderOrder=-100;scene.add(sky);
  scene.fog=new THREE.Fog(PRESETS.dusk.fog,5000,14500);
  const camera=new THREE.PerspectiveCamera(45,host.clientWidth/host.clientHeight,1,25000);
  const overview={position:new THREE.Vector3(3250,2900,-1750),target:new THREE.Vector3(500,0,500)};
  camera.position.copy(overview.position);
  const controls=new OrbitControls(camera,renderer.domElement);controls.target.copy(overview.target);
  controls.enableDamping=true;controls.dampingFactor=.065;controls.minDistance=65;controls.maxDistance=10500;
  controls.maxPolarAngle=Math.PI*.455;controls.minPolarAngle=.14;controls.zoomSpeed=.7;controls.panSpeed=.6;
  controls.update();
  const ambient=new THREE.HemisphereLight('#c5dcee','#948782',PRESETS.dusk.ambient);scene.add(ambient);
  const sun=new THREE.DirectionalLight(PRESETS.dusk.sun,PRESETS.dusk.sunIntensity);sun.position.set(-3200,2300,-1600);
  sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-.0002;sun.shadow.normalBias=.45;
  sun.shadow.camera.near=1;sun.shadow.camera.far=10000;sun.shadow.camera.left=-220;sun.shadow.camera.right=220;sun.shadow.camera.top=220;sun.shadow.camera.bottom=-220;scene.add(sun,sun.target);
  const night={value:PRESETS.dusk.night};const city=buildCity(data,night);scene.add(city.world);
  const church=sophiaModel(night);const churchPos=landmarks.find(l=>l.id==='sophia')!.position;church.group.position.set(churchPos[0],.6,churchPos[1]);scene.add(church.group);
  const flood=floodModel();const floodPos=landmarks.find(l=>l.id==='flood')!.position;flood.position.set(floodPos[0],.3,floodPos[1]);flood.rotation.y=Math.PI;scene.add(flood);
  const icePos=landmarks.find(l=>l.id==='ice')!.position;const ice=iceWorldModel(data,icePos);ice.group.position.set(icePos[0],.2,icePos[1]);scene.add(ice.group);
  const central=centralStreetDetails(data);scene.add(central.group);
  const forest=winterTrees(data);scene.add(forest.group);
  const weather=createWeather(data);scene.add(weather.group);
  const composer=new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene,camera));
  const bloom=new UnrealBloomPass(new THREE.Vector2(host.clientWidth/2,host.clientHeight/2),.22,.4,1.1);composer.addPass(bloom);composer.addPass(new OutputPass());
  let transition:{start:number;from:THREE.Vector3;to:THREE.Vector3;fromTarget:THREE.Vector3;toTarget:THREE.Vector3}|null=null;
  let selected:LandmarkId|null=null;let disposed=false;let frame=0;let raf=0;let frames=0;let lastMetric=performance.now();
  let currentTime:TimeOfDay='dusk';
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stopTransition=()=>{transition=null;};controls.addEventListener('start',stopTransition);
  const projected=new THREE.Vector3();
  const contextLost=(event:Event)=>{event.preventDefault();callbacks.error('三维画面连接中断，请重新加载。');};renderer.domElement.addEventListener('webglcontextlost',contextLost);
  function focus(id:LandmarkId|null) {
    selected=id;
    const l=landmarks.find(l=>l.id===id);
    const target=l?new THREE.Vector3(l.position[0],l.id==='sophia'?15:0,l.position[1]):overview.target.clone();
    const pos=l?target.clone().add(new THREE.Vector3(...l.cameraOffset)):overview.position.clone();
    transition={start:performance.now(),from:camera.position.clone(),to:pos,fromTarget:controls.target.clone(),toTarget:target};
    if(reducedMotion){camera.position.copy(pos);controls.target.copy(target);transition=null;controls.update();}
  }
  function setTime(time:TimeOfDay) {
    currentTime=time;const p=PRESETS[time];
    (scene.background as THREE.Color).set(p.sky);(scene.fog as THREE.Fog).color.set(p.fog);
    skyUniforms.top.value.set(time==='night'?'#09162b':time==='day'?'#81aaca':'#526c89');
    skyUniforms.bottom.value.set(time==='night'?'#304966':time==='day'?'#d6e1e4':'#d8b6a0');
    sun.color.set(p.sun);sun.intensity=p.sunIntensity;ambient.intensity=p.ambient;night.value=p.night;
    renderer.toneMappingExposure=p.exposure;bloom.strength=p.bloom;
    scene.environmentIntensity=time==='night'?.04:.28;bloom.threshold=time==='night'?.75:1.1;
    church.lit.forEach(m=>m.emissiveIntensity=.1+p.night*.8);
    central.lit.forEach(m=>m.emissiveIntensity=.05+p.night*.85);
    ice.lit.forEach(m=>m.emissiveIntensity=.1+p.night*.95);
    weather.setNight(time==='night');
  }
  function animate(now:number) {
    if(disposed)return;
    raf=requestAnimationFrame(animate);
    if(transition){
      const t=Math.min((now-transition.start)/1700,1);const ease=t*t*(3-2*t);
      camera.position.lerpVectors(transition.from,transition.to,ease);controls.target.lerpVectors(transition.fromTarget,transition.toTarget,ease);
      if(t===1)transition=null;
    }
    const bounds=data.bounds;
    controls.target.x=THREE.MathUtils.clamp(controls.target.x,bounds[0]+100,bounds[2]-100);
    controls.target.z=THREE.MathUtils.clamp(controls.target.z,bounds[1]+100,bounds[3]-100);
    controls.target.y=THREE.MathUtils.clamp(controls.target.y,0,80);
    controls.update();
    camera.position.y=Math.max(camera.position.y,35);
    if(Math.hypot(camera.position.x-churchPos[0],camera.position.z-churchPos[1])<30)camera.position.y=Math.max(camera.position.y,58);
    if(Math.abs(camera.position.x-icePos[0])<75&&Math.abs(camera.position.z-(icePos[1]-30))<65)camera.position.y=Math.max(camera.position.y,90);
    const wheel=data.buildings.find(b=>b.id==='1112348116')!;
    if(Math.abs(camera.position.x-wheel.center[0])<62&&Math.abs(camera.position.z-wheel.center[1])<6)camera.position.y=Math.max(camera.position.y,132);
    // Prevent orbit/pan from putting the camera inside a mapped building.
    if(camera.position.y<255) {
      for(const b of data.buildings){if(Math.abs(camera.position.x-b.center[0])>150||Math.abs(camera.position.z-b.center[1])>150)continue;
        const ps=b.outer;let inside=false;
        for(let i=0,j=ps.length-1;i<ps.length;j=i++){const a=ps[i],c=ps[j];if((a[1]>camera.position.z)!==(c[1]>camera.position.z)&&camera.position.x<(c[0]-a[0])*(camera.position.z-a[1])/(c[1]-a[1])+a[0])inside=!inside;}
        if(inside)camera.position.y=Math.max(camera.position.y,b.height+12);
      }
    }
    const distance=camera.position.distanceTo(controls.target);
    sky.position.copy(camera.position);
    const centralPoint=landmarks.find(l=>l.id==='central')!.position;
    central.group.visible=camera.position.distanceTo(new THREE.Vector3(centralPoint[0],0,centralPoint[1]))<2100;
    weather.update(now/1000,camera,distance,reducedMotion);
    sun.castShadow=distance<2000;
    sun.target.position.copy(controls.target);sun.position.copy(controls.target).add(new THREE.Vector3(-3200,2300,-1600));sun.target.updateMatrixWorld();
    if(frame%4===0){
      const positions=landmarks.map(l=>{
        projected.set(l.position[0],l.id==='sophia'?58:l.id==='flood'?40:50,l.position[1]).project(camera);
        const x=(projected.x*.5+.5)*host.clientWidth,y=(-projected.y*.5+.5)*host.clientHeight;
        return{id:l.id,x,y,visible:projected.z>-1&&projected.z<1&&x>0&&x<host.clientWidth&&y>0&&y<host.clientHeight&&(distance>900||l.id===selected)};
      });callbacks.markers(positions);
    }
    renderer.info.reset();composer.render();frames++;frame++;
    if(now-lastMetric>1000){
      const metrics={fps:Math.round(frames*1000/(now-lastMetric)),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,heading:Math.atan2(camera.position.x-controls.target.x,camera.position.z-controls.target.z)*180/Math.PI};
      callbacks.metrics(metrics);frames=0;lastMetric=now;
      Object.assign(window,{__harbinMetrics:{...metrics,time:currentTime,selected,camera:camera.position.toArray(),target:controls.target.toArray()}});
    }
  }
  const resize=()=>{
    const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;
    camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);composer.setSize(w,h);
  };
  const observer=new ResizeObserver(resize);observer.observe(host);
  setTime('dusk');raf=requestAnimationFrame(animate);
  return{focus,setTime,dispose:()=>{
    disposed=true;cancelAnimationFrame(raf);observer.disconnect();controls.removeEventListener('start',stopTransition);controls.dispose();
    renderer.domElement.removeEventListener('webglcontextlost',contextLost);
    const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();
    scene.traverse(o=>{if(o instanceof THREE.Mesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);for(const v of Object.values(m))if(v instanceof THREE.Texture)textures.add(v);}}});
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());environment.dispose();composer.dispose();bloom.dispose();renderer.dispose();renderer.domElement.remove();
  }};
}
