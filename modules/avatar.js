/**
 * Hệ thống avatar SVG đồng nhất phong cách "cute 3D cartoon".
 * Sinh 24 avatar bằng tham số hoá, không cần asset ngoài.
 * Sau này có thể thay bằng ảnh thật bằng cách đổi `avatarSource()`.
 */

const HAIRS = ['#2b2b3a','#5a3921','#b06e3b','#f0b429','#ff6b9d','#4a90e2','#16a085','#8e44ad'];
const BGS   = ['#ffeaa7','#fab1a0','#81ecec','#a29bfe','#74b9ff','#55efc4','#ffd6a5','#dfe6e9'];
const SKINS = ['#ffdcb8','#f8c291','#f0b287','#ffe3c4'];
const SHIRTS = ['#6c5ce7','#00b894','#e17055','#0984e3','#e84393','#fdcb6e'];
const STYLES = ['short','long','bun','spiky'];

export const AVATARS = Array.from({ length: 24 }, (_, i) => ({
  id: `avatar_${String(i + 1).padStart(2,'0')}`,
  bg: BGS[i % BGS.length],
  hair: HAIRS[i % HAIRS.length],
  skin: SKINS[i % SKINS.length],
  shirt: SHIRTS[(i * 3) % SHIRTS.length],
  style: STYLES[i % STYLES.length],
}));

export function getAvatar(id) {
  return AVATARS.find(a => a.id === id) || AVATARS[0];
}

function hairSVG(style, color) {
  switch (style) {
    case 'long':
      return `
        <path d="M26 56 Q24 20 60 20 Q96 20 94 56 L94 70 Q92 64 86 62 L86 40 Q86 34 60 34 Q34 34 34 40 L34 62 Q28 64 26 70 Z" fill="${color}"/>`;
    case 'bun':
      return `
        <circle cx="60" cy="18" r="14" fill="${color}"/>
        <path d="M28 54 Q28 22 60 22 Q92 22 92 54 Q92 40 60 40 Q28 40 28 54 Z" fill="${color}"/>`;
    case 'spiky':
      return `
        <path d="M28 54 L32 30 L40 44 L46 24 L54 42 L60 22 L66 42 L74 24 L80 44 L88 30 L92 54 Q92 38 60 38 Q28 38 28 54 Z" fill="${color}"/>`;
    default: // short
      return `<path d="M28 54 Q28 22 60 22 Q92 22 92 54 Q92 40 60 40 Q28 40 28 54 Z" fill="${color}"/>`;
  }
}

export function avatarSVG(id) {
  const a = getAvatar(id);
  return `
  <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
    <circle cx="60" cy="60" r="58" fill="${a.bg}"/>
    <circle cx="60" cy="60" r="52" fill="#ffffff" opacity="0.25"/>
    <!-- shoulders -->
    <path d="M16 120 Q18 88 60 88 Q102 88 104 120 Z" fill="${a.shirt}"/>
    <!-- neck -->
    <rect x="52" y="76" width="16" height="14" rx="4" fill="${a.skin}"/>
    <!-- head -->
    <circle cx="60" cy="58" r="32" fill="${a.skin}"/>
    <!-- hair -->
    ${hairSVG(a.style, a.hair)}
    <!-- eyes -->
    <ellipse cx="49" cy="58" rx="3.2" ry="4.2" fill="#2b2b3a"/>
    <ellipse cx="71" cy="58" rx="3.2" ry="4.2" fill="#2b2b3a"/>
    <circle cx="50" cy="56.5" r="1" fill="#fff"/>
    <circle cx="72" cy="56.5" r="1" fill="#fff"/>
    <!-- cheeks -->
    <circle cx="42" cy="68" r="5" fill="#ff9a9a" opacity="0.55"/>
    <circle cx="78" cy="68" r="5" fill="#ff9a9a" opacity="0.55"/>
    <!-- mouth -->
    <path d="M53 71 Q60 78 67 71" stroke="#2b2b3a" stroke-width="2.4" stroke-linecap="round" fill="none"/>
  </svg>`;
}

export function avatarDataURL(id) {
  const svg = avatarSVG(id);
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}