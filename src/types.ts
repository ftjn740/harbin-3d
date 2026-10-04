export type TimeOfDay = 'day' | 'dusk' | 'night';
export type Point = [number, number];
export interface Footprint { outer: Point[]; holes: Point[][] }
export interface Building extends Footprint {
  id: string; name: string; height: number; heightSource: 'height' | 'levels' | 'estimated'; center: Point;
  tags: Record<string, string>;
}
export interface Road { id: string; kind: string; name: string; bridge: boolean; points: Point[] }
export interface Surface extends Footprint { id: string; kind: 'water' | 'park' | 'square' | 'icepark'; name: string }
export interface CityData {
  origin: Point; bbox: number[]; bounds: number[]; buildings: Building[]; roads: Road[]; surfaces: Surface[];
  landmarks: Record<string, { osm: string; position: Point; coordinates: Point }>;
  meta: { buildingCount: number; roadCount: number; surfaceCount: number; heightCounts: Record<string, number>; retrieved: string };
}
export type LandmarkId = 'sophia' | 'central' | 'flood' | 'sun' | 'ice';
export interface Landmark {
  id: LandmarkId; name: string; english: string; category: string; description: string; note: string;
  position: Point; coordinates: Point; cameraOffset: [number, number, number]; model: string; source: string;
}
export interface SceneMetrics { fps: number; drawCalls: number; triangles: number; heading: number }
export interface MarkerPosition { id: LandmarkId; x: number; y: number; visible: boolean }
export interface SceneApi {
  focus: (id: LandmarkId | null) => void;
  setTime: (time: TimeOfDay) => void;
  dispose: () => void;
}
