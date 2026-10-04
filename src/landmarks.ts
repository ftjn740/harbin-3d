import type { CityData, Landmark } from './types';

export function getLandmarks(data: CityData): Landmark[] {
  const source = (name: string) => data.landmarks[name];
  const central: [number, number] = [126.61305, 45.7716];
  const project = ([lon, lat]: [number, number]): [number, number] => [
    (lon - data.origin[0]) * 111320 * Math.cos(data.origin[1] * Math.PI / 180),
    (data.origin[1] - lat) * 111320,
  ];
  return [
    {
      id: 'sophia', name: '圣索菲亚教堂', english: 'SAINT SOPHIA', category: '建筑 · 道里区',
      description: '红砖墙、绿色穹顶与金色十字，构成哈尔滨最鲜明的城市记忆。沿广场环绕，观察这座历史建筑的层叠屋顶与拱窗。',
      note: '依据建筑轮廓与公开照片重建；立面细节为近似。',
      ...source('圣索菲亚教堂'), cameraOffset: [-95, 85, 115], model: 'sophia', source: 'https://www.openstreetmap.org/way/338425563',
    },
    {
      id: 'central', name: '中央大街', english: 'CENTRAL STREET', category: '街区 · 道里区',
      description: '沿真实街道轴线，从欧式建筑之间望向江畔。积雪屋檐、石板路与暖色窗光，让这条步行街在冬日黄昏慢慢亮起。',
      note: '道路与建筑轮廓来自地图；沿街立面按风貌近似重建。',
      position: project(central), coordinates: central, cameraOffset: [-130, 150, 260], model: 'central', source: 'https://www.openstreetmap.org/way/300842743',
    },
    {
      id: 'flood', name: '防洪纪念塔', english: 'FLOOD CONTROL MONUMENT', category: '纪念地标 · 松花江南岸',
      description: '中央大街的北端，纪念塔与弧形柱廊面向松花江。江岸、广场与街道在这里相接，是观察城市与江水关系的好位置。',
      note: '位置取自地图，塔体与柱廊依据公开照片近似重建。',
      ...source('防洪纪念塔'), cameraOffset: [90, 85, -140], model: 'flood', source: 'https://www.openstreetmap.org/node/3455170924',
    },
    {
      id: 'sun', name: '太阳岛', english: 'SUN ISLAND', category: '公园 · 松花江北岸',
      description: '从江南转向太阳岛，城市的密集街区逐渐变成开阔雪地、林地与湖面。园区边界与道路保留地图中的真实形状。',
      note: '园区、湖面与道路使用地图数据；树木分布为景观示意。',
      ...source('太阳岛公园'), cameraOffset: [-580, 700, 1050], model: 'sun', source: 'https://www.openstreetmap.org/way/350484254',
    },
    {
      id: 'ice', name: '冰雪大世界', english: 'ICE & SNOW WORLD', category: '冰雪景观 · 松北区',
      description: '真实园区范围内，冰塔、城堡与冰灯在蓝色暮光中亮起。透过冰晶与雪地，感受哈尔滨冬季的冷暖色彩。',
      note: '冰建筑为艺术示意重建，不对应任何一届实际园区布局。',
      ...source('哈尔滨冰雪大世界'), cameraOffset: [390, 380, 590], model: 'ice', source: 'https://www.openstreetmap.org/way/350536247',
    },
  ];
}
