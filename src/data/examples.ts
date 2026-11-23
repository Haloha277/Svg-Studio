import type { SvgExample } from '../types/studio';

export const SVG_EXAMPLES: SvgExample[] = [
  {
    id: 'basic-circle',
    name: 'Basic Circle',
    description: 'Concentric rings with precision stroke weights and dashed orbit geometry.',
    category: 'Primitives',
    code: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" width="320" height="320">
  <rect x="20" y="20" width="280" height="280" rx="28" fill="#18181b" />
  <circle cx="160" cy="160" r="104" fill="none" stroke="#3f3f46" stroke-width="1.5" stroke-dasharray="6 6" />
  <circle cx="160" cy="160" r="72" fill="none" stroke="#6366f1" stroke-width="3" />
  <circle cx="160" cy="160" r="36" fill="#6366f1" fill-opacity="0.18" stroke="#818cf8" stroke-width="2" />
  <circle cx="160" cy="160" r="8" fill="#fafafa" />
</svg>`,
  },
  {
    id: 'rectangle',
    name: 'Rectangle',
    description: 'Swiss grid composition using layered rounded rectangles and opacity.',
    category: 'Primitives',
    code: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 360" width="360" height="360">
  <rect width="360" height="360" rx="24" fill="#f4f3f0" />
  <rect x="36" y="36" width="132" height="132" rx="16" fill="#18181b" />
  <rect x="192" y="36" width="132" height="60" rx="12" fill="#5b5bd6" />
  <rect x="192" y="108" width="132" height="60" rx="12" fill="#d4d4d8" />
  <rect x="36" y="192" width="288" height="132" rx="18" fill="#ffffff" stroke="#d4d4d8" stroke-width="2" />
  <rect x="56" y="212" width="108" height="92" rx="10" fill="#5b5bd6" fill-opacity="0.14" stroke="#5b5bd6" stroke-width="2" />
  <rect x="184" y="228" width="116" height="14" rx="7" fill="#18181b" />
  <rect x="184" y="254" width="84" height="12" rx="6" fill="#71717a" />
  <rect x="184" y="278" width="60" height="12" rx="6" fill="#a1a1aa" />
</svg>`,
  },
  {
    id: 'gradient-background',
    name: 'Gradient Background',
    description: 'Multi-stop linear and radial gradients layered with atmospheric light.',
    category: 'Color & Fill',
    code: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300">
  <defs>
    <linearGradient id="skyBase" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e1b4b" />
      <stop offset="50%" stop-color="#3730a3" />
      <stop offset="100%" stop-color="#0f172a" />
    </linearGradient>
    <radialGradient id="auroraGlow" cx="72%" cy="28%" r="58%">
      <stop offset="0%" stop-color="#818cf8" stop-opacity="0.7" />
      <stop offset="55%" stop-color="#6366f1" stop-opacity="0.22" />
      <stop offset="100%" stop-color="#1e1b4b" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="horizonGlow" cx="25%" cy="85%" r="52%">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.45" />
      <stop offset="100%" stop-color="#0f172a" stop-opacity="0" />
    </radialGradient>
  </defs>
  <rect width="400" height="300" rx="20" fill="url(#skyBase)" />
  <rect width="400" height="300" rx="20" fill="url(#auroraGlow)" />
  <rect width="400" height="300" rx="20" fill="url(#horizonGlow)" />
  <circle cx="292" cy="84" r="28" fill="#e0e7ff" fill-opacity="0.9" />
</svg>`,
  },
  {
    id: 'svg-path',
    name: 'SVG Path',
    description: 'Precision cubic Bézier contour ribbons using smooth path commands.',
    category: 'Paths',
    code: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300">
  <rect width="400" height="300" rx="18" fill="#18181b" />
  <g fill="none" stroke-linecap="round">
    <path d="M 32 210 C 96 120, 148 260, 210 165 S 318 88, 368 152" stroke="#4f46e5" stroke-width="2" stroke-opacity="0.45" />
    <path d="M 32 190 C 96 100, 148 240, 210 145 S 318 68, 368 132" stroke="#6366f1" stroke-width="2.5" stroke-opacity="0.7" />
    <path d="M 32 170 C 96 80, 148 220, 210 125 S 318 48, 368 112" stroke="#a5b4fc" stroke-width="3" />
    <path d="M 32 150 C 96 60, 148 200, 210 105 S 318 28, 368 92" stroke="#e0e7ff" stroke-width="1.5" stroke-dasharray="4 6" />
  </g>
  <circle cx="210" cy="125" r="5" fill="#fafafa" />
  <circle cx="32" cy="170" r="4" fill="#a5b4fc" />
  <circle cx="368" cy="112" r="4" fill="#a5b4fc" />
</svg>`,
  },
  {
    id: 'geometric-shapes',
    name: 'Geometric Shapes',
    description: 'Bauhaus-inspired study combining polygons, clip paths, and transforms.',
    category: 'Composition',
    code: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 360" width="360" height="360">
  <defs>
    <clipPath id="quadClip">
      <rect x="44" y="44" width="130" height="130" rx="14" />
    </clipPath>
  </defs>
  <rect width="360" height="360" rx="22" fill="#faf9f7" stroke="#e4e2dd" stroke-width="2" />
  <g clip-path="url(#quadClip)">
    <rect x="44" y="44" width="130" height="130" fill="#18181b" />
    <circle cx="174" cy="174" r="96" fill="#5b5bd6" />
  </g>
  <polygon points="251,44 316,174 186,174" fill="#18181b" />
  <circle cx="109" cy="251" r="65" fill="#e4e2dd" />
  <circle cx="109" cy="251" r="30" fill="#18181b" />
  <g transform="translate(251, 251) rotate(45)">
    <rect x="-42" y="-42" width="84" height="84" rx="12" fill="none" stroke="#5b5bd6" stroke-width="10" />
  </g>
</svg>`,
  },
  {
    id: 'animated-circle',
    name: 'Animated Circle',
    description: 'Orbital satellite and pulsing radar rings using SMIL SVG animation.',
    category: 'Animation',
    code: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" width="320" height="320">
  <rect width="320" height="320" rx="24" fill="#111113" />
  <circle cx="160" cy="160" r="92" fill="none" stroke="#27272a" stroke-width="1.5" />
  <circle cx="160" cy="160" r="46" fill="none" stroke="#6366f1" stroke-width="2">
    <animate attributeName="r" values="36;102;36" dur="3.6s" repeatCount="indefinite" />
    <animate attributeName="stroke-opacity" values="0.9;0.08;0.9" dur="3.6s" repeatCount="indefinite" />
  </circle>
  <circle cx="160" cy="160" r="22" fill="#5b5bd6" fill-opacity="0.25" stroke="#818cf8" stroke-width="2" />
  <g>
    <animateTransform
      attributeName="transform"
      type="rotate"
      from="0 160 160"
      to="360 160 160"
      dur="5s"
      repeatCount="indefinite"
    />
    <circle cx="160" cy="68" r="8" fill="#fafafa" />
    <circle cx="160" cy="68" r="14" fill="none" stroke="#818cf8" stroke-width="1.5" stroke-opacity="0.6" />
  </g>
</svg>`,
  },
  {
    id: 'loading-spinner',
    name: 'Loading Spinner',
    description: 'Minimalist dual-arc activity indicator with smooth continuous rotation.',
    category: 'Animation',
    code: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240">
  <rect width="240" height="240" rx="24" fill="#18181b" />
  <circle cx="120" cy="120" r="56" fill="none" stroke="#27272a" stroke-width="8" />
  <g>
    <animateTransform
      attributeName="transform"
      type="rotate"
      from="0 120 120"
      to="360 120 120"
      dur="1.15s"
      repeatCount="indefinite"
    />
    <circle
      cx="120"
      cy="120"
      r="56"
      fill="none"
      stroke="#818cf8"
      stroke-width="8"
      stroke-linecap="round"
      stroke-dasharray="110 242"
    />
  </g>
  <g>
    <animateTransform
      attributeName="transform"
      type="rotate"
      from="360 120 120"
      to="0 120 120"
      dur="1.8s"
      repeatCount="indefinite"
    />
    <circle
      cx="120"
      cy="120"
      r="36"
      fill="none"
      stroke="#e4e4e7"
      stroke-width="4"
      stroke-linecap="round"
      stroke-dasharray="56 170"
    />
  </g>
</svg>`,
  },
  {
    id: 'simple-illustration',
    name: 'Simple Illustration',
    description: 'Clean studio desk lamp vector scene with layered warm light cone and mask.',
    category: 'Illustration',
    code: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 320" width="360" height="320">
  <defs>
    <linearGradient id="lightBeam" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fde68a" stop-opacity="0.45" />
      <stop offset="100%" stop-color="#fde68a" stop-opacity="0" />
    </linearGradient>
    <linearGradient id="backdrop" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1e1e24" />
      <stop offset="100%" stop-color="#131316" />
    </linearGradient>
  </defs>
  <rect width="360" height="320" rx="22" fill="url(#backdrop)" />
  <polygon points="154,126 244,126 300,268 98,268" fill="url(#lightBeam)" />
  <line x1="48" y1="268" x2="312" y2="268" stroke="#3f3f46" stroke-width="3" stroke-linecap="round" />
  <path d="M 106 268 L 106 254 L 146 254 L 146 268 Z" fill="#52525b" />
  <path d="M 126 254 L 94 166 L 166 104" fill="none" stroke="#a1a1aa" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />
  <circle cx="94" cy="166" r="7" fill="#e4e4e7" />
  <path d="M 152 104 C 166 78, 224 78, 246 126 L 152 126 Z" fill="#6366f1" />
  <ellipse cx="199" cy="126" rx="34" ry="5" fill="#fef08a" />
</svg>`,
  },
  {
    id: 'logo-design',
    name: 'Logo Design',
    description: 'Precision geometric monogram mark with negative-space mask and wordmark.',
    category: 'Branding',
    code: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 220" width="380" height="220">
  <defs>
    <mask id="cutSlice">
      <rect width="380" height="220" fill="#ffffff" />
      <rect x="95" y="42" width="16" height="136" rx="8" transform="rotate(32 103 110)" fill="#000000" />
    </mask>
  </defs>
  <rect width="380" height="220" rx="20" fill="#ffffff" stroke="#e4e2dd" stroke-width="1.5" />
  <g mask="url(#cutSlice)">
    <circle cx="103" cy="110" r="46" fill="#18181b" />
    <circle cx="103" cy="110" r="22" fill="#ffffff" />
  </g>
  <circle cx="136" cy="77" r="7" fill="#5b5bd6" />
  <text x="174" y="106" font-family="Plus Jakarta Sans, sans-serif" font-size="28" font-weight="700" fill="#18181b" letter-spacing="-0.03em">Monolith</text>
  <text x="175" y="132" font-family="JetBrains Mono, monospace" font-size="12" font-weight="500" fill="#71717a" letter-spacing="0.06em">VECTOR FOUNDRY</text>
</svg>`,
  },
  {
    id: 'abstract-art',
    name: 'Abstract Art',
    description: 'Harmonic generative ribbon curves with translucent layered geometry.',
    category: 'Generative',
    code: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 320" width="400" height="320">
  <defs>
    <linearGradient id="ribbonA" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6366f1" stop-opacity="0.85" />
      <stop offset="100%" stop-color="#06b6d4" stop-opacity="0.35" />
    </linearGradient>
    <linearGradient id="ribbonB" x1="100%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#f43f5e" stop-opacity="0.7" />
      <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0.3" />
    </linearGradient>
  </defs>
  <rect width="400" height="320" rx="22" fill="#0f0f12" />
  <path d="M 0 230 C 90 110, 180 290, 270 140 C 320 60, 365 90, 400 60 L 400 320 L 0 320 Z" fill="url(#ribbonA)" />
  <path d="M 0 150 C 110 240, 200 70, 310 180 C 350 220, 380 160, 400 170 L 400 320 L 0 320 Z" fill="url(#ribbonB)" />
  <circle cx="116" cy="94" r="34" fill="none" stroke="#fafafa" stroke-width="1.5" stroke-opacity="0.35" />
  <circle cx="116" cy="94" r="14" fill="#fafafa" fill-opacity="0.9" />
  <g stroke="#ffffff" stroke-opacity="0.16" stroke-width="1">
    <line x1="250" y1="36" x2="360" y2="36" />
    <line x1="274" y1="48" x2="360" y2="48" />
    <line x1="298" y1="60" x2="360" y2="60" />
  </g>
</svg>`,
  },
];

export const DEFAULT_EXAMPLE = SVG_EXAMPLES[5]; // Animated Circle / Orbital Emblem
