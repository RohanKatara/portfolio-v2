// Shared geometry for the SVG identity, browser icons and dimensional hero.
export const rkOutline = [
  [8, 8], [38, 8], [46, 16], [46, 26], [62, 8], [78, 8],
  [55, 34], [80, 60], [63, 60], [46, 42], [46, 60],
  [34, 60], [20, 42], [20, 60], [8, 60],
];
export const rkCounter = [[20, 18], [34, 18], [34, 32], [20, 32]];
export const rkContours = [rkOutline, rkCounter];
export const rkPath = rkContours.map(points => `M${points.map(point => point.join(' ')).join('L')}Z`).join('');

// Convex, non-overlapping pieces of the same silhouette for GPU triangles.
export const rkFaces = [
  [[8, 8], [20, 8], [20, 60], [8, 60]],
  [[20, 8], [38, 8], [46, 16], [46, 18], [20, 18]],
  [[20, 32], [34, 32], [34, 42], [20, 42]],
  [[34, 18], [46, 18], [46, 60], [34, 60]],
  [[20, 42], [34, 42], [34, 60]],
  [[46, 26], [62, 8], [78, 8], [55, 34], [46, 34]],
  [[46, 34], [55, 34], [80, 60], [63, 60], [46, 42]],
];

export const rkViewBox = '0 0 88 68';
// Bump after regenerating icons so browsers refresh their cached tab icon.
export const brandIconVersion = 'rk-1';
export const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="20" fill="#0b0d12"/><path d="${rkPath}" transform="translate(-1.28 9.92) scale(1.12)" fill="#edf1fa" fill-rule="evenodd"/></svg>`;
