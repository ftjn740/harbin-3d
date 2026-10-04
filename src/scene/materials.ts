import * as THREE from 'three';

export function facadeMaterial(color: string, night: { value: number }) {
  const material = new THREE.MeshStandardMaterial({ color, roughness: .88 });
  material.onBeforeCompile = shader => {
    shader.uniforms.uNight = night;
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vCityPosition; varying vec3 vCityNormal;');
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvCityPosition = (modelMatrix * vec4(position, 1.0)).xyz; vCityNormal = normalize(mat3(modelMatrix) * normal);');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uNight; varying vec3 vCityPosition; varying vec3 vCityNormal;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      float wall = 1.0 - smoothstep(0.2, 0.7, abs(vCityNormal.y));
      float along = abs(vCityNormal.x) > abs(vCityNormal.z) ? vCityPosition.z : vCityPosition.x;
      vec2 grid = vec2(along / 3.8, (vCityPosition.y - 1.4) / 3.3);
      vec2 cell = fract(grid);
      float windowMask = step(.23,cell.x)*step(cell.x,.73)*step(.24,cell.y)*step(cell.y,.77)*wall*step(2.5,vCityPosition.y);
      float occupied = step(.32,fract(sin(dot(floor(grid),vec2(12.9898,78.233)))*43758.5453));
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.19,.24,.27), windowMask * .82);
      float seam = step(.95, fract(vCityPosition.y / 3.3));
      diffuseColor.rgb *= 1.0 - seam * wall * .14;
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      totalEmissiveRadiance += vec3(1.0,.60,.27) * windowMask * occupied * uNight * 1.3;
    `);
  };
  material.customProgramCacheKey = () => 'harbin-facade-v1';
  return material;
}

export function brickTexture() {
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
  const c=canvas.getContext('2d')!; c.fillStyle='#735044';c.fillRect(0,0,256,256);
  for(let row=0;row<16;row++) for(let col=-1;col<8;col++) {
    const n=((row*37+col*19)%13)/13;
    c.fillStyle=`rgb(${150+n*30},${79+n*18},${57+n*15})`;
    c.fillRect(col*40+(row%2)*20+1,row*16+1,38,14);
  }
  const t=new THREE.CanvasTexture(canvas); t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(2,2);t.anisotropy=4;return t;
}

export function iceMaterial(color: string) {
  return new THREE.MeshPhysicalMaterial({ color, metalness:0, roughness:.18, transmission:.22, thickness:4, ior:1.31, clearcoat:1, clearcoatRoughness:.12, emissive:color, emissiveIntensity:.12 });
}
