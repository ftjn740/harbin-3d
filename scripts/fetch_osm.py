"""Download public OSM map extracts, retaining attribution and original IDs."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import subprocess
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / 'public/data/osm'
CACHE.mkdir(parents=True, exist_ok=True)
LONS = [126.53, 126.57, 126.61, 126.65]
LATS = [45.750, 45.772, 45.794, 45.816]

def fetch(item):
    i, j, bbox = item
    path = CACHE / f'{i}-{j}.osm'
    if path.exists() and path.stat().st_size > 200:
        try:
            ET.parse(path)
            return str(path.name) + ' cached'
        except ET.ParseError:
            pass
    url = 'https://api.openstreetmap.org/api/0.6/map?bbox=' + ','.join(map(str, bbox))
    subprocess.run(['curl', '-fsS', '--retry', '2', '--max-time', '55', url, '-o', str(path)], check=True)
    ET.parse(path)
    return f'{path.name}: {path.stat().st_size} bytes'

if __name__ == '__main__':
    jobs = [(i,j,(LONS[i],LATS[j],LONS[i+1],LATS[j+1])) for i in range(3) for j in range(3)]
    with ThreadPoolExecutor(max_workers=3) as pool:
        for result in pool.map(fetch, jobs):
            print(result, flush=True)
