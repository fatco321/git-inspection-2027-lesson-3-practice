type Point = { x: number; y: number; z: number };

/** The physical plate, expressed in camera coordinates; measurements use the visible viewport. */
export function assessLabelFrame(center: Point, horizontal: Point, vertical: Point,
  width: number, height: number, fov: number, viewportWidth: number, viewportHeight: number) {
  const tan = Math.tan(fov / 2), aspect = viewportWidth / viewportHeight;
  const corners = [-1, 1].flatMap(x => [-1, 1].map(y => {
    const px = center.x + horizontal.x * x * width / 2 + vertical.x * y * height / 2;
    const py = center.y + horizontal.y * x * width / 2 + vertical.y * y * height / 2;
    const depth = center.z + horizontal.z * x * width / 2 + vertical.z * y * height / 2;
    return { x: px / (depth * tan * aspect), y: py / (depth * tan), depth };
  }));
  if (corners.some(p => p.depth <= 0)) return { detail: false, cropped: false };
  const xs = corners.map(p => p.x), ys = corners.map(p => p.y);
  const left = Math.min(...xs), right = Math.max(...xs), bottom = Math.min(...ys), top = Math.max(...ys);
  const intersects = right > -1 && left < 1 && top > -1 && bottom < 1;
  // A close-up must make the actual lettering large enough, regardless of distance or zoom.
  const detail = intersects && (right - left) / 2 >= Math.max(.10, 80 / viewportWidth)
    && (top - bottom) / 2 >= Math.max(.06, 20 / viewportHeight);
  const cropped = corners.some(p => Math.abs(p.x) > .98 || Math.abs(p.y) > .98);
  return { detail, cropped };
}

/** All physical object corners must fit; zoom and readable signage alone do not imply cropping. */
export function objectFitsFrame(corners:Point[],fov:number,viewportWidth:number,viewportHeight:number){
  const tan=Math.tan(fov/2),aspect=viewportWidth/viewportHeight;
  return corners.length>0 && corners.every(p=>p.z>0 &&
    Math.abs(p.x/(p.z*tan*aspect))<=1 && Math.abs(p.y/(p.z*tan))<=1);
}
