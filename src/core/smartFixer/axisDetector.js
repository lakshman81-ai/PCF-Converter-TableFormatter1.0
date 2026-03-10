/**
 * REGION D: ELEMENT AXIS DETECTOR
 */
import { vec } from '../../utils/math';

export function detectElementAxis(element, config) {
  const threshold = config.smartFixer?.offAxisThreshold ?? 0.5;
  const type = (element.type || "").toUpperCase();

  if (type === "SUPPORT" || type === "OLET") return [null, null];

  const ep1 = element.ep1;
  const ep2 = element.ep2;
  if (!ep1 || !ep2) return [null, null];

  const dx = ep2.x - ep1.x;
  const dy = ep2.y - ep1.y;
  const dz = ep2.z - ep1.z;

  const axes = [];
  if (Math.abs(dx) > threshold) axes.push(["X", dx]);
  if (Math.abs(dy) > threshold) axes.push(["Y", dy]);
  if (Math.abs(dz) > threshold) axes.push(["Z", dz]);

  if (axes.length === 0) return [null, null];
  if (axes.length === 1) return [axes[0][0], axes[0][1] > 0 ? 1 : -1];

  if (type === "BEND") {
    const sorted = [...axes].sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
    return [sorted[0][0], sorted[0][1] > 0 ? 1 : -1];
  }

  const dominant = axes.reduce((a, b) => Math.abs(a[1]) > Math.abs(b[1]) ? a : b);
  return [dominant[0], dominant[1] > 0 ? 1 : -1];
}

export function detectBranchAxis(teeElement) {
  if (!teeElement.bp || !teeElement.cp) return null;
  const bv = vec.sub(teeElement.bp, teeElement.cp);
  const axes = [["X", Math.abs(bv.x)], ["Y", Math.abs(bv.y)], ["Z", Math.abs(bv.z)]];
  const dominant = axes.reduce((a, b) => a[1] > b[1] ? a : b);
  return dominant[0];
}

export function detectBranchDirection(teeElement) {
  if (!teeElement.bp || !teeElement.cp) return null;
  const bv = vec.sub(teeElement.bp, teeElement.cp);
  const axis = detectBranchAxis(teeElement);
  if (!axis) return null;
  return bv[axis.toLowerCase()] > 0 ? 1 : -1;
}

export function getElementVector(element) {
  const type = (element.type || "").toUpperCase();
  if (type === "SUPPORT" || type === "OLET") return { x: 0, y: 0, z: 0 };
  if (!element.ep1 || !element.ep2) return { x: 0, y: 0, z: 0 };
  return vec.sub(element.ep2, element.ep1);
}
