import { useEffect, useRef, useState } from 'react';
import { Church, Landmark as Monument, Trees, Snowflake, Building2, Sun, Sunset, Moon, Scan, Mouse, X, Info, RotateCcw, Compass, MapPin } from 'lucide-react';
import { createScene } from './scene/engine';
import { getLandmarks } from './landmarks';
import type { CityData, Landmark, LandmarkId, MarkerPosition, SceneApi, SceneMetrics, TimeOfDay } from './types';

const ICONS={sophia:Church,central:Building2,flood:Monument,sun:Trees,ice:Snowflake};
const TIMES=[{id:'day' as const,name:'白天',caption:'清晰雪景',icon:Sun},{id:'dusk' as const,name:'黄昏',caption:'暖光初上',icon:Sunset},{id:'night' as const,name:'夜晚',caption:'冰灯与星夜',icon:Moon}];

async function loadCity(onProgress:(n:number)=>void,signal:AbortSignal):Promise<CityData> {
  const response=await fetch('/data/harbin.json',{signal});
  if(!response.ok)throw new Error('城市地图数据加载失败，请检查本地文件后重试。');
  const length=Number(response.headers.get('content-length'));
  if(!response.body){onProgress(68);return response.json();}
  const reader=response.body.getReader();const chunks:Uint8Array[]=[];let loaded=0;
  while(true){const {done,value}=await reader.read();if(done)break;chunks.push(value);loaded+=value.length;onProgress(length?Math.min(68,Math.round(loaded/length*68)):30);}
  const bytes=new Uint8Array(loaded);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
  const data=JSON.parse(new TextDecoder().decode(bytes)) as CityData;
  if(!data.buildings?.length||!data.surfaces?.some(s=>s.kind==='water')||!data.landmarks?.['圣索菲亚教堂'])throw new Error('城市地图数据不完整，请重新准备地理数据。');
  return data;
}

export default function App() {
  const host=useRef<HTMLDivElement>(null);const engine=useRef<SceneApi|null>(null);
  const [landmarks,setLandmarks]=useState<Landmark[]>([]);const [data,setData]=useState<CityData|null>(null);
  const [selected,setSelected]=useState<LandmarkId|null>(null);const [time,setTime]=useState<TimeOfDay>('dusk');
  const [markers,setMarkers]=useState<MarkerPosition[]>([]);const [progress,setProgress]=useState(0);const [ready,setReady]=useState(false);
  const [error,setError]=useState('');const [retry,setRetry]=useState(0);const [sourcesOpen,setSourcesOpen]=useState(false);
  const [metrics,setMetrics]=useState<SceneMetrics>({fps:0,drawCalls:0,triangles:0,heading:0});
  const dialogRef=useRef<HTMLDialogElement>(null);const sourcesButton=useRef<HTMLButtonElement>(null);

  useEffect(()=>{
    let active=true;let ownedScene:SceneApi|null=null;const abort=new AbortController();setError('');setProgress(0);setReady(false);setSelected(null);setTime('dusk');
    const initialize=async()=>{
      try{
        const city=await loadCity(n=>{if(active)setProgress(n);},abort.signal);if(!active)return;
        const ls=getLandmarks(city);setData(city);setLandmarks(ls);setProgress(76);
        await new Promise(r=>setTimeout(r,30));if(!active||!host.current)return;
        host.current.replaceChildren();
        ownedScene=createScene(host.current,city,ls,{markers:m=>{if(active)setMarkers(m);},metrics:m=>{if(active)setMetrics(m);},error:m=>{if(active)setError(m);}});
        engine.current=ownedScene;
        setProgress(100);setReady(true);
      }catch(e){if(!active||abort.signal.aborted)return;const msg=e instanceof Error?e.message:'';setError(/WebGL|context/i.test(msg)?'当前浏览器无法启动 WebGL 三维画面，请开启硬件加速或使用支持 WebGL 2 的浏览器。':msg||'三维场景加载失败，请重试。');}
    };void initialize();
    return()=>{active=false;abort.abort();ownedScene?.dispose();if(engine.current===ownedScene)engine.current=null;};
  },[retry]);

  useEffect(()=>{
    const dialog=dialogRef.current;if(!dialog)return;
    if(sourcesOpen&&!dialog.open)dialog.showModal();else if(!sourcesOpen&&dialog.open)dialog.close();
  },[sourcesOpen]);
  const focus=(id:LandmarkId|null)=>{setSelected(id);engine.current?.focus(id);};
  const changeTime=(t:TimeOfDay)=>{setTime(t);engine.current?.setTime(t);};
  const current=landmarks.find(l=>l.id===selected);
  const estimated=data?.meta.heightCounts.estimated||0;

  return <main className={`app time-${time}`}>
    <div className="scene" ref={host} />
    <div className="scene-vignette" aria-hidden="true" />
    <header className="masthead">
      <div className="brand-mark" aria-hidden="true"><Church size={26} strokeWidth={1.3}/></div>
      <div><p className="eyebrow">HARBIN · WINTER EXPLORER</p><h1>3D 城市哈尔滨<span>冬日松花江</span></h1></div>
    </header>
    <div className="season-badge"><Snowflake size={15}/><span>冬季</span><i/><span>{TIMES.find(t=>t.id===time)?.name}</span></div>
    <div className="view-actions"><button className="overview-button" onClick={()=>focus(null)} disabled={!ready}><Scan size={17}/><span>返回全景</span></button></div>
    <nav className="landmark-nav glass" aria-label="城市地标导览">
      <div className="nav-heading"><span>沿江探索</span><span className="small-mono">05 LANDMARKS</span></div>
      <div className="landmark-list">{landmarks.map((l,i)=>{
        const Icon=ICONS[l.id];return <button key={l.id} className={`landmark-item ${selected===l.id?'selected':''}`} aria-pressed={selected===l.id} onClick={()=>focus(l.id)} disabled={!ready}>
          <span className="landmark-number">0{i+1}</span><span className="landmark-icon"><Icon size={23} strokeWidth={1.3}/></span>
          <span className="landmark-text"><strong>{l.name}</strong><span>{l.english}</span></span><span className="selection-line"/>
        </button>;
      })}</div>
      <div className="nav-footer"><MapPin size={13}/><span>松花江两岸 · 核心景观</span></div>
    </nav>
    <div className="map-markers" aria-label="地图中的地标">{markers.map(m=>{
      const l=landmarks.find(x=>x.id===m.id);if(!l||!m.visible)return null;
      return <button key={m.id} className={`map-marker ${m.id===selected?'active':''}`} style={{left:m.x,top:m.y}} onClick={()=>focus(m.id)} aria-label={`前往${l.name}`}>
        <span className="marker-label">{l.name}</span><span className="marker-stem"/><span className="marker-dot"/>
      </button>;
    })}</div>
    <div className="compass" aria-label="地图方向"><div className="compass-face" style={{transform:`rotate(${-metrics.heading+180}deg)`}}><b>N</b><span className="needle"/><span className="south-needle"/></div><Compass size={58} strokeWidth={.6}/></div>
    {current&&<aside className="detail-card glass" aria-live="polite">
      <div className="detail-heading"><span className="eyebrow">{current.category}</span><button className="icon-button" onClick={()=>{setSelected(null);}} aria-label="关闭地标介绍"><X size={17}/></button></div>
      <h2>{current.name}</h2><p>{current.description}</p>
      <div className="detail-coordinates"><span>{current.coordinates[1].toFixed(5)}° N</span><span>{current.coordinates[0].toFixed(5)}° E</span></div>
      <div className="detail-note"><Info size={13}/><span>{current.note}</span></div>
    </aside>}
    <section className="light-panel glass" aria-label="光照设置">
      <div className="light-heading"><span>城市光影</span><span className="small-mono">TIME OF DAY</span></div>
      <div className="time-options">{TIMES.map(t=>{const Icon=t.icon;return <button key={t.id} className={time===t.id?'active':''} aria-pressed={time===t.id} onClick={()=>changeTime(t.id)} disabled={!ready}><Icon size={20} strokeWidth={1.4}/><strong>{t.name}</strong><span>{t.caption}</span></button>;})}</div>
    </section>
    <footer className="scene-footer">
      <button className="source-button" ref={sourcesButton} onClick={()=>setSourcesOpen(true)}><Info size={14}/>数据与重建说明</button>
      <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>
    </footer>
    <div className="interaction-hint"><Mouse size={16}/><span>拖动旋转</span><i/><span>滚轮缩放</span><i/><span>右键平移</span></div>
    <div className="performance-label" title={`${metrics.drawCalls} 次绘制 · ${metrics.triangles.toLocaleString()} 个三角形`}><span className="small-mono">{metrics.fps||'—'} FPS</span><span>本地场景</span></div>
    {!ready&&!error&&<div className="loading-screen"><div className="loading-logo"><Church size={42} strokeWidth={1}/></div><p className="eyebrow">HARBIN · 45.78° N</p><h2>冬日松花江</h2><p>{progress<70?'正在读取城市地图':'正在构建冬日城市'}</p><div className="loading-bar" role="progressbar" aria-label="城市加载进度" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><span style={{width:`${progress}%`}}/></div><span className="loading-percent">{progress}%</span></div>}
    {error&&<div className="error-screen" role="alert"><Snowflake size={36}/><h2>暂时无法进入城市</h2><p>{error}</p><button onClick={()=>{setSelected(null);setTime('dusk');setRetry(n=>n+1);}}><RotateCcw size={16}/>重新加载</button></div>}
    <dialog ref={dialogRef} className="sources-dialog" onCancel={()=>setSourcesOpen(false)} onClose={()=>{setSourcesOpen(false);sourcesButton.current?.focus();}} onClick={e=>{if(e.target===e.currentTarget)setSourcesOpen(false);}} aria-labelledby="sources-title">
      <div className="dialog-heading"><p className="eyebrow">ABOUT THIS CITY</p><button className="icon-button" onClick={()=>setSourcesOpen(false)} aria-label="关闭数据说明"><X size={20}/></button></div>
      <h2 id="sources-title">真实布局，冬日重建</h2>
      <p>道路、水系、园区与普通建筑轮廓来自 OpenStreetMap。地标位置保持真实，建筑立面、积雪与冰灯为本项目制作的近似重建。</p>
      <div className="data-summary"><div><b>{data?.meta.buildingCount.toLocaleString()||'—'}</b><span>建筑轮廓</span></div><div><b>{data?.meta.roadCount.toLocaleString()||'—'}</b><span>道路与步道</span></div><div><b>{estimated.toLocaleString()}</b><span>估算建筑高度</span></div></div>
      <p>建筑高度：{data?.meta.heightCounts.height||0} 个使用地图高度，{data?.meta.heightCounts.levels||0} 个由地图楼层数推算，其余按建筑类型与轮廓面积估算。地面采用平面近似；地图覆盖不足处保持简化。</p>
      <p>冰雪大世界采用真实园区边界，冰塔与城堡是艺术示意，不对应某一届实际布局。树木与季节氛围也属于景观示意。</p>
      <div className="source-links"><a href="/data/building-heights.csv" download>下载建筑高度记录</a><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OSM · ODbL 1.0</a></div>
      <p className="source-date">地图获取：2026 年 10 月 4 日 · 地理数据与素材均在本地加载</p>
    </dialog>
  </main>;
}
