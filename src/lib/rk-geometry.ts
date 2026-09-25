import { rkContours, rkFaces } from '../data/brand.mjs';

export function buildRKGeometry() {
  const lines: number[] = [];
  const faces: number[] = [];
  const shades: number[] = [];
  const depth = 0.14;
  const vertex = (point: number[], z: number) => [(point[0] - 44) / 36, (34 - point[1]) / 36, z];
  const triangle = (a: number[], b: number[], c: number[], shade: number) => {
    faces.push(...a, ...b, ...c);
    shades.push(shade, shade, shade);
  };

  for (const contour of rkContours) {
    contour.forEach((point, index) => {
      const next = contour[(index + 1) % contour.length];
      const front = vertex(point, depth);
      const frontNext = vertex(next, depth);
      const back = vertex(point, -depth);
      const backNext = vertex(next, -depth);
      lines.push(...front, ...frontNext, ...back, ...backNext, ...front, ...back);
      triangle(front, back, frontNext, 0.45);
      triangle(back, backNext, frontNext, 0.45);
    });
  }
  for (const polygon of rkFaces) {
    for (let index = 1; index < polygon.length - 1; index++) {
      triangle(vertex(polygon[0], depth), vertex(polygon[index], depth), vertex(polygon[index + 1], depth), 1);
      triangle(vertex(polygon[0], -depth), vertex(polygon[index + 1], -depth), vertex(polygon[index], -depth), 0.3);
    }
  }
  return { lines: new Float32Array(lines), faces: new Float32Array(faces), shades: new Float32Array(shades) };
}
