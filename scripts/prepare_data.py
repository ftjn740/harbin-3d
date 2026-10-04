"""Clip/deduplicate OSM extracts; no invented footprints. Requires shapely>=2."""
from pathlib import Path
import xml.etree.ElementTree as ET
import math, json, re, datetime
from collections import Counter
from shapely.geometry import Polygon, box
from shapely.validation import make_valid

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/data'
ORIGIN = [126.596, 45.782]
BBOX = [126.53, 45.750, 126.65, 45.816]
MX = 111320 * math.cos(math.radians(ORIGIN[1]))
def project(lon, lat):
    return [(lon - ORIGIN[0]) * MX, (ORIGIN[1] - lat) * 111320]
sw, ne = project(BBOX[0], BBOX[1]), project(BBOX[2], BBOX[3])
CLIP = box(sw[0], ne[1], ne[0], sw[1])
nodes, ways, relations = {}, {}, {}
for file in sorted((OUT / 'osm').glob('*.osm')):
    for elem in ET.parse(file).getroot():
        if elem.tag == 'node': nodes[elem.get('id')] = elem
        if elem.tag == 'way': ways[elem.get('id')] = elem
        if elem.tag == 'relation': relations[elem.get('id')] = elem

def tags(elem): return {v.get('k'):v.get('v') for v in elem.findall('tag')}
def refs(elem): return [n.get('ref') for n in elem.findall('nd')]
def coords(ids): return [project(float(nodes[n].get('lon')), float(nodes[n].get('lat'))) for n in ids if n in nodes]
def rounded(ps): return [[round(p[0],2),round(p[1],2)] for p in ps]
def polygons(geom):
    if geom.is_empty: return []
    if geom.geom_type == 'Polygon': return [geom]
    if hasattr(geom,'geoms'): return [p for g in geom.geoms for p in polygons(g)]
    return []
def encode(poly):
    return {'outer':rounded(poly.exterior.coords), 'holes':[rounded(r.coords) for r in poly.interiors]}
def closed_rings(chains):
    pending = [list(c) for c in chains if len(c)>2]
    complete=[]
    while pending:
        chain=pending.pop()
        while chain[0] != chain[-1]:
            found=False
            for i,c in enumerate(pending):
                if chain[-1]==c[0]: chain += c[1:]
                elif chain[-1]==c[-1]: chain += c[-2::-1]
                elif chain[0]==c[-1]: chain = c[:-1]+chain
                elif chain[0]==c[0]: chain = c[:0:-1]+chain
                else: continue
                pending.pop(i);found=True;break
            if not found:break
        if chain[0]==chain[-1]:complete.append(chain)
    return complete

surfaces=[]; relation_members=set();building_members=set()
for rid, rel in relations.items():
    t=tags(rel)
    is_water=t.get('natural')=='water'
    is_park=t.get('leisure') in ['park','garden','golf_course'] or t.get('landuse') in ['forest','grass']
    is_square=t.get('place')=='square' or t.get('highway')=='pedestrian'
    if t.get('type')!='multipolygon' or not (is_water or is_park or is_square or 'building' in t):continue
    members=[m for m in rel.findall('member') if m.get('type')=='way']
    if any(m.get('ref') not in ways for m in members):continue
    outer=closed_rings([refs(ways[m.get('ref')]) for m in members if m.get('role') in ['outer','']])
    inner=closed_rings([refs(ways[m.get('ref')]) for m in members if m.get('role')=='inner'])
    for ring in outer:
        p=Polygon(coords(ring))
        holes=[coords(r) for r in inner if len(coords(r))>3 and p.covers(Polygon(coords(r)).representative_point())]
        p=make_valid(Polygon(coords(ring),holes))
        for poly in polygons(p.intersection(CLIP).simplify(1.5,preserve_topology=True)):
            if poly.area<4:continue
            kind='water' if is_water else 'park' if is_park else 'square' if is_square else 'building'
            if kind!='building':surfaces.append({'id':'r'+rid,'kind':kind,'name':t.get('name',''),**encode(poly)})
    if is_water or is_park or is_square:relation_members.update(m.get('ref') for m in members)

buildings=[];roads=[];landmarks={};heights=Counter()
for wid,way in ways.items():
    t=tags(way);ids=refs(way);ps=coords(ids)
    if len(ps)<2:continue
    if t.get('name') in ['圣索菲亚教堂','哈尔滨冰雪大世界','太阳岛公园','马迭尔宾馆'] and len(ps)>3:
        p=make_valid(Polygon(ps));c=p.centroid
        landmarks[t['name']]={'osm':'way/'+wid,'position':[round(c.x,2),round(c.y,2)],'coordinates':[round(ORIGIN[0]+c.x/MX,7),round(ORIGIN[1]-c.y/111320,7)]}
    if 'building' in t and t['building']!='no' and len(ps)>3 and ids[0]==ids[-1]:
        if wid=='338425563':continue
        p=make_valid(Polygon(ps))
        for poly in polygons(p.intersection(CLIP).simplify(.35,preserve_topology=True)):
            if poly.area<12:continue
            height=0;source='estimated'
            raw=t.get('height','')
            m=re.match(r'^(\d+(?:\.\d+)?)\s*(m|米)?$',raw)
            if m:height=float(m.group(1));source='height'
            else:
                m=re.match(r'^(\d+(?:\.\d+)?)$',t.get('building:levels',''))
                if m:height=float(m.group(1))*3.2;source='levels'
            if not height:
                source='estimated'
                # Stable type/area-based inference. Not a measured building height.
                height=6.4 if t['building'] in ['garage','garages','shed','house'] else 16 if poly.area<800 else 24
                if t.get('historic') or t.get('heritage'):height=12.8
                if t['building'] in ['apartments','residential']:height=22.4
            if not 2<=height<=250:height=16;source='estimated'
            c=poly.centroid;heights[source]+=1
            buildings.append({'id':wid,'name':t.get('name',''),'height':round(height,2),'heightSource':source,'tags':{k:v for k,v in t.items() if k in ['height','building:levels','building','heritage']},'center':[round(c.x,2),round(c.y,2)],**encode(poly)})
    if t.get('highway') and t.get('area')!='yes':
        from shapely.geometry import LineString
        g=LineString(ps).intersection(CLIP)
        parts=[g] if g.geom_type=='LineString' else list(g.geoms) if g.geom_type=='MultiLineString' else []
        for part in parts:
            if part.length<5:continue
            roads.append({'id':wid,'kind':t['highway'],'name':t.get('name',''),'bridge':t.get('bridge')=='yes','points':rounded(part.simplify(.8).coords)})
    if wid not in relation_members and len(ps)>3 and ids[0]==ids[-1]:
        kind='water' if t.get('natural')=='water' or t.get('waterway')=='riverbank' else 'park' if t.get('leisure') in ['park','garden','golf_course'] or t.get('landuse') in ['forest','grass'] or t.get('natural') in ['wood','scrub'] else 'square' if t.get('place')=='square' or (t.get('highway')=='pedestrian' and t.get('area')=='yes') else 'icepark' if wid=='350536247' else None
        if kind:
            for p in polygons(make_valid(Polygon(ps)).intersection(CLIP).simplify(1.5,preserve_topology=True)):
                if p.area>4:surfaces.append({'id':'w'+wid,'kind':kind,'name':t.get('name',''),**encode(p)})
flood=nodes['3455170924'];landmarks['防洪纪念塔']={'osm':'node/3455170924','coordinates':[float(flood.get('lon')),float(flood.get('lat'))],'position':rounded([project(float(flood.get('lon')),float(flood.get('lat')))])[0]}
data={'origin':ORIGIN,'bbox':BBOX,'bounds':[sw[0],ne[1],ne[0],sw[1]],'landmarks':landmarks,'buildings':buildings,'roads':roads,'surfaces':surfaces,'meta':{'source':'OpenStreetMap contributors','license':'ODbL-1.0','retrieved':'2026-10-04','heightCounts':dict(heights),'buildingCount':len(buildings),'roadCount':len(roads),'surfaceCount':len(surfaces),'projection':'Local equirectangular WGS84, x=east, z=south; meters','notes':['Building heights without height or building:levels are estimated by type and footprint area.','Flat ground approximation; no surveyed elevation or facade data.','Incomplete OSM coverage is intentionally left simplified.']}}
(OUT/'harbin.json').write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')))
(OUT/'building-heights.csv').write_text('osm_way_id,name,height_m,height_source\n'+'\n'.join(f'{b["id"]},{b["name"].replace(","," ")},{b["height"]},{b["heightSource"]}' for b in buildings))
print(json.dumps({**data['meta'],'landmarks':landmarks},ensure_ascii=False,indent=2))
