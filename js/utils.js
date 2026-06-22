import { SIG } from './constants.js';

export function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function hostHasSubruneAttachmentPoints(node) {
  if (!node || !node.def) return false;
  if (node.def.supportsSubrunes === true) return true;
  if (node.def.supportsSubrunes === false) return false;
  const family = node.def.family;
  if (family === 'effector_mono' || family === 'effector_miro') return false;
  return family === 'effector_priamo' || family === 'effector_complex' || family === 'effector_forbidden';
}

export function isSubruneCompatibleHost(hostNode, rule) {
  if (!hostHasSubruneAttachmentPoints(hostNode)) return false;
  const family = hostNode.def.family;
  const type = hostNode.def.type;
  if (rule.allowedFamilies.includes(family) || rule.allowedFamilies.includes(type)) return true;
  if (rule.allowedFamilies.includes('effector') && (family === 'effector_complex' || family === 'effector_forbidden')) return true;
  return false;
}

export function truthyInput(input) {
  if (!input) return false;
  if (input.signal === SIG.STRONG) return true;
  if (input.signal === SIG.DATA) {
    if (typeof input.data === 'string') return input.data.length > 0;
    return !!Number(input.data);
  }
  return false;
}

export function isFreshInput(input, time) {
  return !!input && input.signal !== SIG.NONE && input.lastTime === time;
}

export function isCarrierSignal(signal) {
  return signal === SIG.WEAK || signal === SIG.STRONG;
}

export function signalName(signal) {
  if (signal === SIG.DATA) return '1(DATA)';
  if (signal === SIG.WEAK) return '2(WEAK)';
  if (signal === SIG.STRONG) return '3(STRONG)';
  return '0';
}

export const LIGHT_BASE_WAVELENGTHS = Object.freeze({
  mono_light: 640,
  miro_light: 640,
  pr_light: 580,
  effector_light_rgb: 580
});

export function isLightRuneNode(nodeOrType) {
  const key = typeof nodeOrType === 'string'
    ? nodeOrType
    : (nodeOrType && (nodeOrType.type || (nodeOrType.def && nodeOrType.def.type))) || '';
  return key === 'mono_light' || key === 'miro_light' || key === 'pr_light' || key === 'effector_light_rgb';
}

export function getLightBaseWavelength(nodeOrType) {
  const key = typeof nodeOrType === 'string'
    ? nodeOrType
    : (nodeOrType && (nodeOrType.type || (nodeOrType.def && nodeOrType.def.type))) || '';
  return LIGHT_BASE_WAVELENGTHS[key] || null;
}

export function wavelengthToCSS(nm) {
  nm = Math.max(380, Math.min(780, Number(nm) || 580));
  let r = 0, g = 0, b = 0;
  if (nm >= 380 && nm < 440) { r = -(nm - 440) / 60; b = 1; }
  else if (nm >= 440 && nm < 490) { g = (nm - 440) / 50; b = 1; }
  else if (nm >= 490 && nm < 510) { g = 1; b = -(nm - 510) / 20; }
  else if (nm >= 510 && nm < 580) { r = (nm - 510) / 70; g = 1; }
  else if (nm >= 580 && nm < 645) { r = 1; g = -(nm - 645) / 65; }
  else if (nm >= 645 && nm <= 780) { r = 1; }
  const factor = nm < 420 ? 0.3 + 0.7 * (nm - 380) / 40 : nm < 601 ? 1.0 : 0.3 + 0.7 * (780 - nm) / 179;
  return `rgb(${Math.round(r * factor * 255)},${Math.round(g * factor * 255)},${Math.round(b * factor * 255)})`;
}

export function wavelengthToColorName(nm) {
  nm = Math.max(380, Math.min(780, Number(nm) || 580));
  if (nm < 405) return 'ультрафиолетовый';
  if (nm < 430) return 'фиолетовый';
  if (nm < 450) return 'сине-фиолетовый';
  if (nm < 470) return 'синий';
  if (nm < 492) return 'светло-синий';
  if (nm < 507) return 'голубой';
  if (nm < 525) return 'бирюзовый';
  if (nm < 548) return 'зелёный';
  if (nm < 568) return 'салатовый';
  if (nm < 585) return 'жёлто-зелёный';
  if (nm < 597) return 'жёлтый';
  if (nm < 612) return 'жёлто-оранжевый';
  if (nm < 635) return 'оранжевый';
  if (nm < 660) return 'красно-оранжевый';
  return 'красный';
}

export function cssRgbWithAlpha(cssColor, alpha) {
  const m = String(cssColor || '').match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
  if (!m) return cssColor;
  return `rgba(${m[1]}, ${m[2]}, ${m[3]}, ${alpha})`;
}

export function computeLightSpectrumState(node, meta) {
    const base = getLightBaseWavelength(node);
    if (!base) return null;

    const metaShift = Number(meta && meta.freqShift) || 0;
    const subShift = (node && node.subruneState && node.subruneState.freqShift) || 0;

    const totalShift = metaShift + subShift;
    let wavelength = base / (1 + totalShift);
    wavelength = Math.round(Math.max(380, Math.min(780, wavelength)));

    return {
        wavelength,
        totalShift,
        colorCss: wavelengthToCSS(wavelength),
        colorName: wavelengthToColorName(wavelength)
    };
}

export function ensureButtonState() {
  const a = document.getElementById('btnConnectMode');
  const b = document.getElementById('mobile-connect-toggle');
  if (a) a.classList.toggle('active', !!(window.engine && engine.connectMode));
  if (b) b.classList.toggle('active', !!(window.engine && engine.connectMode));
}

export function isBlinkSourceType(type) {
  return type === 'source_strong_blink' || type === 'source_weak_blink';
}

export function isAnySourceType(type) {
  return type === 'source_strong' || type === 'source_weak' || isBlinkSourceType(type);
}

export function isStrongSourceLike(type) {
  return type === 'source_strong' || type === 'source_strong_blink';
}

export function isWeakSourceLike(type) {
  return type === 'source_weak' || type === 'source_weak_blink';
}

export function buildPrimaryMeta(sourceNode, sourceTag, pulseIndex) {
  const strong = sourceNode && sourceNode.def && isStrongSourceLike(sourceNode.def.type);
  const weak = sourceNode && sourceNode.def && isWeakSourceLike(sourceNode.def.type);
  return {
    scale: null,
    frequency: null,
    direction: null,
    tags: [],
    originSourceType: strong ? 'source_strong' : (weak ? 'source_weak' : null),
    originSourceTag: sourceTag || null,
    pulseIndex: pulseIndex || 1,
    primaryStrong: !!strong,
    primaryStrongToken: strong ? (sourceTag + '#P' + pulseIndex) : null,
    primarySeenBy: [],
    blinkSource: !!(sourceNode && sourceNode.def && isBlinkSourceType(sourceNode.def.type))
  };
}

export function getOrdinaryStrongSourceFlag(meta) {
  const tag = meta && typeof meta.originSourceTag === 'string' ? meta.originSourceTag : null;
  if (!tag) return null;
  if (!(meta && meta.originSourceType === 'source_strong')) return null;
  if (meta && meta.blinkSource) return null;
  return /^М\d+$/.test(tag) ? tag : null;
}

export function getCensorStrongSourceFlag(meta) {
  const tag = meta && typeof meta.originSourceTag === 'string' ? meta.originSourceTag : null;
  if (!tag || !/^М\d+$/.test(tag)) return null;
  if (!(meta && meta.originSourceType === 'source_strong')) return null;
  if (meta && meta.blinkSource) {
    return Number(meta.pulseIndex || 0) === 1 ? tag : null;
  }
  return tag;
}

export function clampAutoDelay(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 1500;
  return Math.max(500, Math.min(3000, Math.round(n)));
}

export function isStrongPrimarySourceTag(tag) {
  return typeof tag === 'string' && /^М\d+$/.test(tag);
}

export function stringToBits(text) {
  const bits = [];
  try {
    const enc = new TextEncoder().encode(String(text ?? ''));
    for (const byte of enc) {
      for (let i = 7; i >= 0; i--) bits.push((byte >> i) & 1);
    }
  } catch (e) {
    const s = String(text ?? '');
    for (let ci = 0; ci < s.length; ci++) {
      const code = s.charCodeAt(ci) & 255;
      for (let i = 7; i >= 0; i--) bits.push((code >> i) & 1);
    }
  }
  return bits;
}

export function numberToBits(num) {
  const n = Math.max(0, Math.floor(Number(num) || 0));
  if (n === 0) return [0];
  return n.toString(2).split('').map(ch => ch === '1' ? 1 : 0);
}

export function encodeValueToBits(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return numberToBits(value);
  if (typeof value === 'boolean') return [value ? 1 : 0];
  if (Array.isArray(value)) {
    const out = [];
    for (const item of value) out.push(...encodeValueToBits(item));
    return out.length ? out : [0];
  }
  return stringToBits(value);
}

export function numberToBase7Digits(num) {
  const n = Math.max(0, Math.floor(Number(num) || 0));
  if (n === 0) return [0];
  return n.toString(7).split('').map(ch => Math.max(0, Math.min(6, Number(ch) || 0)));
}

export function encodeValueToDirs(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return numberToBase7Digits(value);
  if (typeof value === 'boolean') return [value ? 1 : 0];
  if (Array.isArray(value)) {
    const out = [];
    for (const item of value) out.push(...encodeValueToDirs(item));
    return out.length ? out : [0];
  }
  const s = String(value ?? '');
  const out = [];
  for (let i = 0; i < s.length; i++) out.push(s.charCodeAt(i) % 7);
  return out.length ? out : [0];
}

export function isCircleSimple(nodeOrType) {
  const t = typeof nodeOrType === 'string' ? nodeOrType : (nodeOrType && nodeOrType.def ? nodeOrType.def.type : '');
  return t === 'circle_memory_bit' || t === 'circle_memory_dir';
}

export function capText(value, maxLen) {
  const s = String(value == null ? '' : value);
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

export function safeDisplay(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return capText(value, 160);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  try { return capText(JSON.stringify(value), 160); } catch (_) { return capText(String(value), 160); }
}

export function encodeSimpleUnits(node, value, capacity) {
  const cap = Math.max(1, Number(capacity) || 1);
  if (node.def.type === 'circle_memory_bit') {
    let bits = [];
    if (typeof value === 'number' && Number.isFinite(value)) {
      const n = Math.max(0, Math.floor(value));
      bits = n === 0 ? [0] : n.toString(2).split('').map(ch => ch === '1' ? 1 : 0);
    } else if (typeof value === 'boolean') {
      bits = [value ? 1 : 0];
    } else {
      const s = capText(value, cap);
      if (/^[01]+$/.test(s) && s.length) bits = s.split('').map(ch => ch === '1' ? 1 : 0);
      else {
        const txt = capText(s, Math.max(1, Math.floor(cap / 8)));
        try {
          const enc = new TextEncoder().encode(txt);
          for (const byte of enc) {
            for (let i = 7; i >= 0; i--) bits.push((byte >> i) & 1);
            if (bits.length >= cap) break;
          }
        } catch (_) {
          for (let i = 0; i < txt.length && bits.length < cap; i++) bits.push((txt.charCodeAt(i) & 1) ? 1 : 0);
        }
      }
    }
    return bits.slice(0, cap);
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const n = Math.max(0, Math.floor(value));
    return (n === 0 ? [0] : n.toString(7).split('').map(ch => Math.max(0, Math.min(6, Number(ch) || 0)))).slice(0, cap);
  }
  const raw = capText(value, cap * 2);
  if (/^\s*\d+(\s*,\s*\d+)*\s*$/.test(raw)) {
    return raw.split(',').map(x => Math.max(0, Math.min(6, Number(x.trim()) || 0))).slice(0, cap);
  }
  const out = [];
  const s = capText(raw, cap);
  for (let i = 0; i < s.length && out.length < cap; i++) out.push(s.charCodeAt(i) % 7);
  return out.length ? out : [0];
}

export function getMaterialCapacity(node) {
  return node.def.type === 'circle_memory_bit' ? Number(node.def.materialBitsCapacity || 80) : Number(node.def.materialDirCapacity || 60);
}

export function getVirtualCapacity(node) {
  return node.def.type === 'circle_memory_bit' ? Number(node.def.virtualBitsCapacity || 199) : Number(node.def.virtualDirCapacity || 43);
}

export function getNodePortPosition(node, index, type) {
    if (!node || !node.def) return { x: 0, y: 0 };

    if (index < 0) {
        const subIndex = -(index + 1);
        const count = node.def.maxSubrunes || 0;
        if (subIndex >= count) return { x: node.x, y: node.y };
        const scale = window.engine ? window.engine.viewport.scale : 1;
        const nTop = Math.ceil(count / 2);
        const nBot = count - nTop;
        const cx = node.x + node.w / 2;
        const topY = node.y - 10 / scale;
        const botY = node.y + node.h + 10 / scale;
        const spacing = 20 / scale;
        const isTop = (subIndex % 2 === 0);
        const k = Math.floor(subIndex / 2);
        let startX;
        if (isTop) startX = cx - ((nTop - 1) * spacing) / 2;
        else startX = cx - ((nBot - 1) * spacing) / 2;
        const x = startX + k * spacing;
        const y = isTop ? topY : botY;
        return { x, y };
    }

    if (node.def.isSubrune) {
        return { x: node.x + node.w, y: node.y + node.h * 0.5 };
    }
    const count = type === 'in' ? node.def.inputs : node.def.outputs;
    const y = node.y + node.h * (index + 1) / Math.max(1, count + 1);
    return { x: type === 'in' ? node.x : node.x + node.w, y };
}

export function getSubruneAttachmentPos(node, index) {
    const count = node.def.maxSubrunes || 0;
    if (count === 0) return { x: node.x, y: node.y + node.h / 2 };
    const nTop = Math.ceil(count / 2);
    const nBot = count - nTop;
    const cx = node.x + node.w / 2;
    const topY = node.y - 10;
    const botY = node.y + node.h + 10;
    const spacing = 20;
    const isTop = (index % 2 === 0);
    const k = Math.floor(index / 2);
    let startX;
    if (isTop) startX = cx - ((nTop - 1) * spacing) / 2;
    else startX = cx - ((nBot - 1) * spacing) / 2;
    return { x: startX + k * spacing, y: isTop ? topY : botY };
}
