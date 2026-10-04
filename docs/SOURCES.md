# 素材与地理数据记录

获取时间：2026 年 10 月 4 日（北京时间）。所有渲染素材均保存在本地或由源码生成。

| 内容 | 来源 | 使用方式与限制 |
| --- | --- | --- |
| 建筑轮廓、道路、水面、园区 | [OpenStreetMap](https://www.openstreetmap.org/)；[OSM API](https://wiki.openstreetmap.org/wiki/API_v0.6) | © OpenStreetMap contributors；[ODbL 1.0](https://www.openstreetmap.org/copyright)。原始 XML 保留元素 ID、版本和来源属性。 |
| 松花江完整水面 | OSM relation [2244973](https://www.openstreetmap.org/relation/2244973)、[9382294](https://www.openstreetmap.org/relation/9382294) | 拼合 outer/inner 环，裁剪到场景范围，保留岛屿。另保留范围内独立水面与太阳湖。 |
| 索菲亚教堂位置及轮廓 | OSM way [338425563](https://www.openstreetmap.org/way/338425563) | 场景中心由轮廓质心计算，模型结构为近似重建。 |
| 中央大街轴线 | OSM ways [300842743](https://www.openstreetmap.org/way/300842743)、[338436869](https://www.openstreetmap.org/way/338436869)、[1511498728](https://www.openstreetmap.org/way/1511498728) | 道路保持真实位置；灯杆沿道路布置，立面细节按街区风貌制作。 |
| 马迭尔宾馆 | OSM way [760962971](https://www.openstreetmap.org/way/760962971) | 保留轮廓，补充屋顶和近似装饰。 |
| 防洪纪念塔及柱廊 | OSM node [3455170924](https://www.openstreetmap.org/node/3455170924)、way [338438411](https://www.openstreetmap.org/way/338438411) | 独立塔体和北侧弧形柱廊替代普通建筑体块。顶部人物雕塑简化。 |
| 太阳岛公园 | OSM way [350484254](https://www.openstreetmap.org/way/350484254) | 标记为园区质心，该点位于园内太阳湖；保留真实公园、湖面和道路，树木分布为示意。 |
| 冰雪大世界园区 | OSM way [350536247](https://www.openstreetmap.org/way/350536247) | 真实边界内的冰建筑为艺术示意，不对应某届布局。官方地址参照[哈尔滨冰雪大世界](https://ice.hrbicesnow.com/)。 |
| 雪花摩天轮 | OSM way [1112348116](https://www.openstreetmap.org/way/1112348116) | 独立模型放在真实轮廓质心，结构与尺寸近似。 |
| 教堂外观参考 | [Wikimedia Commons 图集](https://commons.wikimedia.org/wiki/Category:Cathedral_of_Holy_Wisdom,_Harbin)、[公开航拍照片页面](https://televisionofnomads.com/saint-sophia-cathedral-in-harbin-china/) | 用于观察穹顶、砖墙、钟楼和拱窗；没有下载、嵌入或重用照片作为纹理。 |
| 纪念塔外观参考 | [Wikimedia Commons 图集](https://commons.wikimedia.org/wiki/Category:Harbin_Flood_Control_Memorial_Tower) | 用于观察塔体与柱廊关系，模型由源码制作，未复用照片贴图。 |
| 纹理、冰晶、积雪、窗光 | 本项目生成 | 红砖 Canvas 纹理、立面与冰面着色器、积雪几何、星点与飘雪。 |
| 渲染与界面库 | Three.js、React、Lucide | 使用 npm 发布包；依赖及固定版本由 package-lock.json 记录。 |

## 高度来源

`public/data/building-heights.csv` 提供每个轮廓的 OSM way ID、名称、高度与来源。

- `height`：地图中的米制 height。
- `levels`：地图 building:levels × 3.2 米，属于楼层推算，非测量高度。
- `estimated`：无有效高度/楼层值时，依据建筑类型和面积估算，非测量高度。

地理数据未提供立面、屋顶细节或精确地形；普通建筑的程序化风貌不能视作实景复刻。馆舍、树木、灯杆、冰雕和冬季氛围均需结合上述限制理解。
