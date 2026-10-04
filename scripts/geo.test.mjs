import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { flatGeometry, volumeGeometry, pointInside } from '../src/scene/geometry.ts';
import { getLandmarks } from '../src/landmarks.ts';

const city=JSON.parse(readFileSync(new URL('../public/data/harbin.json',import.meta.url),'utf8'));
const landmarks=getLandmarks(city);
const water=city.surfaces.filter(s=>s.kind==='water');
const isWater=p=>water.some(s=>pointInside(p,s.outer)&&!s.holes.some(h=>pointInside(p,h)));

test('geographic landmarks retain their OSM anchors and river-bank relationships',()=>{
  assert.equal(landmarks.length,5);
  const church=landmarks.find(l=>l.id==='sophia'),flood=landmarks.find(l=>l.id==='flood'),sun=landmarks.find(l=>l.id==='sun'),ice=landmarks.find(l=>l.id==='ice');
  assert.ok(Math.abs(church.coordinates[0]-126.6212875)<1e-6);
  assert.ok(Math.abs(flood.coordinates[1]-45.778685)<1e-6);
  assert.ok(church.position[1]>flood.position[1]);
  assert.ok(sun.position[1]<flood.position[1]);
  assert.ok(ice.position[0]<sun.position[0]);
  assert.equal(isWater(church.position),false);
  assert.equal(isWater(flood.position),false);
  const mainRiver=water.filter(s=>s.id==='r2244973'||s.id==='r9382294');
  assert.equal(mainRiver.some(s=>pointInside(sun.position,s.outer)&&!s.holes.some(h=>pointInside(sun.position,h))),false);
  // The park centroid sits on Sun Lake, which is correctly retained as frozen water.
  assert.ok(water.some(s=>s.name==='太阳湖'&&pointInside(sun.position,s.outer)));
  assert.ok(isWater([1000,0]),'main Songhua channel should contain this verified point');
});

test('Central Street follows its mapped north-south pedestrian axis',()=>{
  const streets=city.roads.filter(r=>r.name==='中央大街');
  assert.ok(streets.length>=3);
  const pts=streets.flatMap(r=>r.points);
  const north=pts.reduce((a,b)=>a[1]<b[1]?a:b),south=pts.reduce((a,b)=>a[1]>b[1]?a:b);
  assert.ok(south[1]-north[1]>1300);
  assert.ok(Math.abs(south[0]-north[0])<350);
  const flood=city.landmarks['防洪纪念塔'].position;
  assert.ok(Math.hypot(north[0]-flood[0],north[1]-flood[1])<100);
});

test('building heights are finite, attributed and match their source tags',()=>{
  const counts={};
  for(const b of city.buildings){
    assert.ok(b.height>=2&&b.height<=250);
    counts[b.heightSource]=(counts[b.heightSource]||0)+1;
    if(b.heightSource==='height')assert.equal(b.height,parseFloat(b.tags.height));
    if(b.heightSource==='levels')assert.ok(Math.abs(b.height-Number(b.tags['building:levels'])*3.2)<.011);
    assert.deepEqual(b.outer[0],b.outer.at(-1));
    for(const [x,z] of b.outer){assert.ok(x>=city.bounds[0]-.02&&x<=city.bounds[2]+.02&&z>=city.bounds[1]-.02&&z<=city.bounds[3]+.02);}
  }
  assert.deepEqual(counts,city.meta.heightCounts);
  assert.equal(city.buildings.length,city.meta.buildingCount);
});

test('roof triangulation preserves courtyards and local meter coordinates',()=>{
  const footprint={outer:[[0,0],[10,0],[10,10],[0,10],[0,0]],holes:[[[3,3],[7,3],[7,7],[3,7],[3,3]]]};
  const roof=flatGeometry(footprint,12);const p=roof.getAttribute('position');const indices=roof.index;
  let area=0;const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
  for(let i=0;i<indices.count;i+=3){a.fromBufferAttribute(p,indices.getX(i));b.fromBufferAttribute(p,indices.getX(i+1));c.fromBufferAttribute(p,indices.getX(i+2));area+=b.clone().sub(a).cross(c.clone().sub(a)).length()/2;}
  assert.ok(Math.abs(area-84)<.001);
  roof.computeBoundingBox();assert.ok(Math.abs(roof.boundingBox.min.y-12)<.001);
  const volume=volumeGeometry(footprint,18);volume.computeBoundingBox();assert.ok(Math.abs(volume.boundingBox.max.y-18)<.001);
  roof.dispose();volume.dispose();
});

test('park/water polygon holes stay land and camera hit tests use closed rings',()=>{
  assert.equal(pointInside([5,5],[[0,0],[10,0],[10,10],[0,10],[0,0]]),true);
  assert.equal(pointInside([15,5],[[0,0],[10,0],[10,10],[0,10],[0,0]]),false);
  assert.ok(water.some(s=>s.holes.length>0));
  assert.ok(city.surfaces.some(s=>s.kind==='icepark'));
});
