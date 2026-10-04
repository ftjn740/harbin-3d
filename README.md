# 3D 城市哈尔滨 · 冬日松花江

React / TypeScript / Vite / Three.js 本地交互网站。包含真实松花江水系、街道与建筑轮廓，五处地标导览，以及白天、黄昏、夜晚三种冬季光照。

## 启动

本机可双击 `start.command`，或在终端执行：

```bash
cd /Users/rongyi/git_code/mi_mini_local_test_project/harbin-3d
./start.command
```

打开 <http://127.0.0.1:5173/>。预览仅监听本机地址。按 Ctrl+C 停止。5173 已被本项目占用时，直接使用现有页面；如被其他程序占用，先停止该程序再启动。

已在 `.runtime/` 保存适合这台 Mac 的官方 Node.js 22.23.3 运行时；该目录不进入源码版本管理。在其他电脑运行需安装 Node.js 22.18+：

```bash
npm ci
npm run dev
npm test
npm run build
```

生产输出位于 `dist/`，可以通过 `npm run preview` 本地检查。浏览场景无需访问地图服务、照片服务或 CDN，也无需 API 密钥。

## 操作

- 左键拖动旋转，滚轮缩放，右键拖动平移。
- 点击左侧地标或地图标记，镜头自动飞向目标；拖动画面可中断飞行。
- 点击「返回全景」恢复初始视角；点击地标介绍的关闭按钮只关闭介绍。
- 右下角切换光照。右下角显示当前浏览器实测 FPS。
- 「数据与重建说明」中可下载每栋建筑的高度来源记录。

## 真实程度

场景范围为 WGS84 经度 126.53–126.65、纬度 45.750–45.816。使用本地等距近似投影，x 向东、z 向南，单位米。地面为平面，不包含实测地形。

普通建筑保留地图轮廓，立面为程序化近似。3,438 个轮廓中，10 个采用地图高度，83 个由楼层数 × 3.2 米推算，3,345 个按类型与面积估算。索菲亚教堂、纪念塔、柱廊和摩天轮使用独立模型。冰雪大世界的冰塔与城堡是园区内的艺术示意，不对应某届真实布局；冬季树木位置也是景观示意。

地图覆盖不足的地方保持简化，未使用随机楼群填补空白。完整限制与来源见 [素材与地理数据](docs/SOURCES.md)，验收记录见 [运行检查](docs/VALIDATION.md)。

## 数据更新

原始 OSM XML 保存在 `public/data/osm/`。渲染仅加载处理后的 `harbin.json`（约 1.7 MB），原始文件不会在浏览时请求。

```bash
python3 -m venv .runtime/data-venv
.runtime/data-venv/bin/pip install shapely==2.0.7
python3 scripts/fetch_osm.py
.runtime/data-venv/bin/python scripts/prepare_data.py
npm test
```

下载脚本保留已有有效缓存。当前原始数据另包含完整松花江水面关系 `2244973` 与 `9382294`，确保闭合河岸和岛屿孔洞；如更新这些关系，应从 OSM `/api/0.6/relation/<id>/full` 同步相应 XML 后再处理。

## 项目结构

- `src/App.tsx`：导览、加载、错误提示、光照和数据说明。
- `src/scene/`：城市合并几何、程序化地标、材质、天气、相机与资源释放。
- `src/landmarks.ts`：地标配置与镜头位置。
- `scripts/`：地图下载、数据处理与地理/几何回归检查。

地理数据来自 © OpenStreetMap contributors，按 ODbL 1.0 使用。项目制作的三维模型、程序化纹理和界面不包含第三方照片贴图。Three.js 的 MIT 许可保存在 `docs/THREE-LICENSE.txt`。
