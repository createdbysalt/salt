import type { BlogThumbPalette } from "./palettes";

/** Theme-specific focal illustration layered on top of each template. */
export type BlogThumbMotifId =
  | "supabaseDatabase"
  | "pricingTag"
  | "declineProject"
  | "boundaryContract"
  | "proposalEmail"
  | "businessInsights"
  | "partnerTrust"
  | "proactiveRadar"
  | "reactiveIdle"
  | "proactiveActive"
  | "automationPipeline"
  | "examplesGrid"
  | "toolsToolbox"
  | "capabilitiesHub"
  | "trendsForward"
  | "chatbotWaiting"
  | "proactiveTasks"
  | "lindyAgentBuilder"
  | "saltWorkDone"
  | "viktorCoworker"
  | "saltBusinessOps"
  | "chatgptAnswers"
  | "saltExecutes"
  | "vaEmptyDesk"
  | "saltAlwaysOn"
  | "alternativesFork"
  | "pricingFlat";

export function renderMotif(id: BlogThumbMotifId, palette: BlogThumbPalette): string {
  switch (id) {
    case "supabaseDatabase":
      return `
        <ellipse cx="800" cy="620" rx="180" ry="48" fill="${palette.fg}" opacity="0.12"/>
        <rect x="620" y="360" width="360" height="260" rx="24" fill="${palette.fg}" opacity="0.1"/>
        <ellipse cx="800" cy="360" rx="180" ry="48" fill="${palette.accent}" opacity="0.95"/>
        <ellipse cx="800" cy="430" rx="180" ry="48" fill="${palette.fg}" opacity="0.18"/>
        <ellipse cx="800" cy="500" rx="180" ry="48" fill="${palette.fg}" opacity="0.14"/>
        <line x1="980" y1="430" x2="1120" y2="320" stroke="${palette.accent}" stroke-width="4" opacity="0.8"/>
        <line x1="980" y1="500" x2="1140" y2="560" stroke="${palette.accent}" stroke-width="4" opacity="0.6"/>
        <circle cx="1140" cy="320" r="16" fill="${palette.accent}"/>
        <circle cx="1140" cy="560" r="16" fill="${palette.accent}" opacity="0.7"/>
      `;
    case "pricingTag":
      return `
        <path d="M720 280 L1040 280 L1120 420 L880 620 L560 420 Z" fill="${palette.fg}" opacity="0.92"/>
        <circle cx="760" cy="360" r="36" fill="${palette.bg}" opacity="0.35"/>
        <text x="748" y="372" font-family="ui-sans-serif, system-ui" font-size="36" font-weight="700" fill="${palette.bg}">$</text>
        <rect x="820" y="380" width="220" height="16" rx="8" fill="${palette.bg}" opacity="0.25"/>
        <rect x="820" y="420" width="160" height="12" rx="6" fill="${palette.bg}" opacity="0.18"/>
        <path d="M900 520 L980 460 L1060 520 L980 580 Z" fill="${palette.accent}" opacity="0.85"/>
      `;
    case "declineProject":
      return `
        <rect x="640" y="300" width="480" height="360" rx="24" fill="${palette.fg}" opacity="0.14"/>
        <rect x="700" y="360" width="280" height="18" rx="9" fill="${palette.fg}" opacity="0.35"/>
        <rect x="700" y="400" width="360" height="12" rx="6" fill="${palette.fg}" opacity="0.2"/>
        <line x1="720" y1="560" x2="1040" y2="400" stroke="${palette.fg}" stroke-width="14" stroke-linecap="round" opacity="0.9"/>
        <line x1="720" y1="400" x2="1040" y2="560" stroke="${palette.fg}" stroke-width="14" stroke-linecap="round" opacity="0.9"/>
      `;
    case "boundaryContract":
      return `
        <line x1="480" y1="720" x2="480" y2="280" stroke="${palette.fg}" stroke-width="6" opacity="0.5"/>
        <line x1="480" y1="280" x2="1120" y2="280" stroke="${palette.fg}" stroke-width="6" opacity="0.5"/>
        <rect x="560" y="340" width="520" height="380" rx="24" fill="${palette.fg}" opacity="0.12"/>
        <rect x="620" y="400" width="28" height="28" rx="6" fill="${palette.accent}"/>
        <rect x="670" y="408" width="320" height="12" rx="6" fill="${palette.fg}" opacity="0.35"/>
        <rect x="620" y="460" width="28" height="28" rx="6" fill="none" stroke="${palette.fg}" stroke-width="3" opacity="0.5"/>
        <rect x="670" y="468" width="280" height="12" rx="6" fill="${palette.fg}" opacity="0.22"/>
        <rect x="620" y="520" width="28" height="28" rx="6" fill="none" stroke="${palette.fg}" stroke-width="3" opacity="0.5"/>
        <rect x="670" y="528" width="300" height="12" rx="6" fill="${palette.fg}" opacity="0.22"/>
      `;
    case "proposalEmail":
      return `
        <rect x="560" y="320" width="560" height="380" rx="24" fill="${palette.fg}" opacity="0.92"/>
        <path d="M560 344 L840 540 L1120 344" fill="none" stroke="${palette.bg}" stroke-width="4" opacity="0.2"/>
        <rect x="620" y="420" width="360" height="14" rx="7" fill="${palette.bg}" opacity="0.18"/>
        <rect x="620" y="460" width="420" height="12" rx="6" fill="${palette.bg}" opacity="0.12"/>
        <rect x="620" y="490" width="380" height="12" rx="6" fill="${palette.bg}" opacity="0.12"/>
        <path d="M1180 560 L1280 500 L1280 660 L1180 660 Z" fill="${palette.accent}" opacity="0.9"/>
        <path d="M1240 580 L1270 610 L1240 640" fill="none" stroke="${palette.fg}" stroke-width="4" stroke-linecap="round"/>
      `;
    case "businessInsights":
      return `
        <rect x="560" y="300" width="560" height="400" rx="24" fill="${palette.fg}" opacity="0.1"/>
        <rect x="640" y="520" width="80" height="140" rx="8" fill="${palette.accent}" opacity="0.85"/>
        <rect x="760" y="460" width="80" height="200" rx="8" fill="${palette.fg}" opacity="0.35"/>
        <rect x="880" y="400" width="80" height="260" rx="8" fill="${palette.accent}" opacity="0.55"/>
        <circle cx="720" cy="380" r="100" fill="none" stroke="${palette.fg}" stroke-width="4" opacity="0.5"/>
        <line x1="720" y1="380" x2="820" y2="320" stroke="${palette.accent}" stroke-width="4"/>
        <circle cx="820" cy="320" r="12" fill="${palette.accent}"/>
      `;
    case "partnerTrust":
      return `
        <circle cx="680" cy="500" r="120" fill="${palette.fg}" opacity="0.14"/>
        <circle cx="920" cy="500" r="120" fill="${palette.accent}" opacity="0.75"/>
        <path d="M740 500 C780 420, 820 420, 860 500 C820 580, 780 580, 740 500" fill="${palette.fg}" opacity="0.35"/>
        <path d="M860 460 L900 500 L860 540" fill="none" stroke="${palette.fg}" stroke-width="5" stroke-linecap="round"/>
        <line x1="900" y1="500" x2="980" y2="500" stroke="${palette.fg}" stroke-width="5" stroke-linecap="round"/>
      `;
    case "proactiveRadar":
      return `
        <circle cx="800" cy="480" r="200" fill="none" stroke="${palette.fg}" stroke-width="3" opacity="0.2"/>
        <circle cx="800" cy="480" r="130" fill="none" stroke="${palette.fg}" stroke-width="3" opacity="0.3"/>
        <circle cx="800" cy="480" r="60" fill="none" stroke="${palette.fg}" stroke-width="3" opacity="0.4"/>
        <circle cx="800" cy="480" r="20" fill="${palette.accent}"/>
        <line x1="800" y1="480" x2="980" y2="340" stroke="${palette.accent}" stroke-width="4"/>
        <line x1="800" y1="480" x2="620" y2="360" stroke="${palette.accent}" stroke-width="4" opacity="0.7"/>
        <line x1="800" y1="480" x2="860" y2="660" stroke="${palette.accent}" stroke-width="4" opacity="0.5"/>
        <circle cx="980" cy="340" r="14" fill="${palette.accent}"/>
        <circle cx="620" cy="360" r="14" fill="${palette.accent}" opacity="0.7"/>
        <circle cx="860" cy="660" r="14" fill="${palette.accent}" opacity="0.5"/>
      `;
    case "reactiveIdle":
      return `
        <rect x="220" y="320" width="440" height="360" rx="24" fill="${palette.fg}" opacity="0.12"/>
        <circle cx="440" cy="460" r="60" fill="none" stroke="${palette.fg}" stroke-width="4" opacity="0.4"/>
        <line x1="440" y1="460" x2="440" y2="420" stroke="${palette.fg}" stroke-width="4" opacity="0.5"/>
        <rect x="300" y="560" width="280" height="80" rx="16" fill="${palette.fg}" opacity="0.08"/>
        <circle cx="360" cy="600" r="10" fill="${palette.fg}" opacity="0.25"/>
        <circle cx="400" cy="600" r="10" fill="${palette.fg}" opacity="0.25"/>
        <circle cx="440" cy="600" r="10" fill="${palette.fg}" opacity="0.25"/>
      `;
    case "proactiveActive":
      return `
        <rect x="900" y="280" width="480" height="420" rx="24" fill="${palette.fg}" opacity="0.12"/>
        <circle cx="1140" cy="420" r="80" fill="${palette.accent}" opacity="0.85"/>
        <path d="M1100 420 L1130 450 L1185 390" fill="none" stroke="${palette.fg}" stroke-width="6" stroke-linecap="round"/>
        <rect x="980" y="540" width="320" height="14" rx="7" fill="${palette.fg}" opacity="0.35"/>
        <rect x="980" y="580" width="260" height="14" rx="7" fill="${palette.fg}" opacity="0.25"/>
        <path d="M1280 620 L1340 580 L1340 680 L1280 680 Z" fill="${palette.accent}" opacity="0.7"/>
      `;
    case "automationPipeline":
      return `
        <circle cx="520" cy="500" r="48" fill="${palette.accent}" opacity="0.9"/>
        <line x1="568" y1="500" x2="680" y2="500" stroke="${palette.fg}" stroke-width="4" opacity="0.4"/>
        <rect x="680" y="452" width="96" height="96" rx="16" fill="${palette.fg}" opacity="0.15"/>
        <line x1="776" y1="500" x2="888" y2="500" stroke="${palette.fg}" stroke-width="4" opacity="0.4"/>
        <circle cx="936" cy="500" r="48" fill="${palette.accent}" opacity="0.7"/>
        <line x1="984" y1="500" x2="1096" y2="500" stroke="${palette.fg}" stroke-width="4" opacity="0.4"/>
        <rect x="1096" y="452" width="96" height="96" rx="16" fill="${palette.accent}" opacity="0.45"/>
        <path d="M1120 476 L1160 500 L1120 524" fill="none" stroke="${palette.fg}" stroke-width="4"/>
      `;
    case "examplesGrid":
      return Array.from({ length: 7 }, (_, i) => {
        const col = i % 4;
        const row = Math.floor(i / 4);
        const x = 560 + col * 130;
        const y = 340 + row * 130;
        return `<rect x="${x}" y="${y}" width="100" height="100" rx="16" fill="${palette.fg}" opacity="${0.12 + (i % 3) * 0.08}"/>
          <rect x="${x + 20}" y="${y + 30}" width="60" height="8" rx="4" fill="${palette.accent}" opacity="0.7"/>
          <rect x="${x + 20}" y="${y + 50}" width="40" height="6" rx="3" fill="${palette.fg}" opacity="0.25"/>`;
      }).join("");
    case "toolsToolbox":
      return `
        ${[0, 1, 2, 3, 4, 5].map((i) => {
          const col = i % 3;
          const row = Math.floor(i / 3);
          const x = 620 + col * 140;
          const y = 360 + row * 140;
          return `<rect x="${x}" y="${y}" width="110" height="110" rx="20" fill="${palette.fg}" opacity="0.12"/>
            <circle cx="${x + 55}" cy="${y + 48}" r="22" fill="${palette.accent}" opacity="${0.5 + (i % 2) * 0.3}"/>
            <rect x="${x + 30}" y="${y + 78}" width="50" height="8" rx="4" fill="${palette.fg}" opacity="0.25"/>`;
        }).join("")}
      `;
    case "capabilitiesHub":
      return `
        <circle cx="800" cy="480" r="56" fill="${palette.accent}" opacity="0.9"/>
        ${[
          [800, 280],
          [980, 380],
          [980, 580],
          [800, 680],
          [620, 580],
          [620, 380],
        ]
          .map(
            ([cx, cy]) =>
              `<line x1="800" y1="480" x2="${cx}" y2="${cy}" stroke="${palette.fg}" stroke-width="3" opacity="0.25"/>
               <rect x="${cx - 50}" y="${cy - 40}" width="100" height="80" rx="14" fill="${palette.fg}" opacity="0.12"/>`
          )
          .join("")}
      `;
    case "trendsForward":
      return `
        <polyline points="480,640 640,520 800,560 960,380 1120,320" fill="none" stroke="${palette.accent}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="1120" cy="320" r="16" fill="${palette.accent}"/>
        <path d="M1080 280 L1160 320 L1080 360" fill="none" stroke="${palette.accent}" stroke-width="5" stroke-linecap="round"/>
        <rect x="480" y="680" width="720" height="4" rx="2" fill="${palette.fg}" opacity="0.2"/>
      `;
    case "chatbotWaiting":
      return `
        <rect x="260" y="360" width="360" height="100" rx="24" fill="${palette.fg}" opacity="0.12"/>
        <circle cx="320" cy="410" r="12" fill="${palette.fg}" opacity="0.3"/>
        <circle cx="360" cy="410" r="12" fill="${palette.fg}" opacity="0.3"/>
        <circle cx="400" cy="410" r="12" fill="${palette.fg}" opacity="0.3"/>
        <rect x="300" y="520" width="280" height="80" rx="20" fill="${palette.fg}" opacity="0.08"/>
      `;
    case "proactiveTasks":
      return `
        ${[0, 1, 2].map((i) => {
          const y = 360 + i * 90;
          return `<rect x="940" y="${y}" width="400" height="64" rx="16" fill="${palette.fg}" opacity="0.12"/>
            <rect x="970" y="${y + 22}" width="28" height="28" rx="6" fill="${palette.accent}"/>
            <rect x="1020" y="${y + 28}" width="240" height="12" rx="6" fill="${palette.fg}" opacity="0.35"/>`;
        }).join("")}
      `;
    case "lindyAgentBuilder":
      return `
        <circle cx="360" cy="400" r="40" fill="${palette.fg}" opacity="0.2"/>
        <line x1="400" y1="400" x2="480" y2="360" stroke="${palette.fg}" stroke-width="3" opacity="0.3"/>
        <circle cx="520" cy="360" r="40" fill="${palette.fg}" opacity="0.2"/>
        <line x1="560" y1="360" x2="640" y2="420" stroke="${palette.fg}" stroke-width="3" opacity="0.3"/>
        <circle cx="680" cy="420" r="40" fill="${palette.fg}" opacity="0.2"/>
        <line x1="400" y1="400" x2="480" y2="520" stroke="${palette.fg}" stroke-width="3" opacity="0.3"/>
        <circle cx="520" cy="560" r="40" fill="${palette.fg}" opacity="0.2"/>
        <rect x="280" y="620" width="360" height="14" rx="7" fill="${palette.fg}" opacity="0.15"/>
      `;
    case "saltWorkDone":
      return `
        <rect x="960" y="340" width="400" height="72" rx="16" fill="${palette.fg}" opacity="0.14"/>
        <rect x="990" y="362" width="28" height="28" rx="6" fill="${palette.accent}"/>
        <rect x="1040" y="368" width="260" height="12" rx="6" fill="${palette.fg}" opacity="0.35"/>
        <rect x="960" y="440" width="400" height="72" rx="16" fill="${palette.fg}" opacity="0.14"/>
        <rect x="990" y="462" width="28" height="28" rx="6" fill="${palette.accent}"/>
        <rect x="1040" y="468" width="220" height="12" rx="6" fill="${palette.fg}" opacity="0.35"/>
        <rect x="960" y="540" width="400" height="72" rx="16" fill="${palette.fg}" opacity="0.14"/>
        <rect x="990" y="562" width="28" height="28" rx="6" fill="${palette.accent}"/>
      `;
    case "viktorCoworker":
      return `
        <rect x="260" y="320" width="400" height="420" rx="28" fill="${palette.fg}" opacity="0.1"/>
        <circle cx="460" cy="420" r="64" fill="${palette.accent}" opacity="0.5"/>
        <rect x="320" y="520" width="280" height="64" rx="20" fill="${palette.fg}" opacity="0.12"/>
        <rect x="320" y="620" width="220" height="64" rx="20" fill="${palette.fg}" opacity="0.08"/>
      `;
    case "saltBusinessOps":
      return `
        <rect x="920" y="300" width="520" height="440" rx="24" fill="${palette.fg}" opacity="0.1"/>
        <rect x="980" y="560" width="60" height="120" rx="6" fill="${palette.accent}" opacity="0.8"/>
        <rect x="1070" y="500" width="60" height="180" rx="6" fill="${palette.fg}" opacity="0.3"/>
        <rect x="1160" y="420" width="60" height="260" rx="6" fill="${palette.accent}" opacity="0.55"/>
        <rect x="1250" y="480" width="60" height="200" rx="6" fill="${palette.fg}" opacity="0.25"/>
      `;
    case "chatgptAnswers":
      return `
        <rect x="280" y="380" width="320" height="88" rx="20" fill="${palette.fg}" opacity="0.12"/>
        <text x="310" y="434" font-family="ui-sans-serif" font-size="48" fill="${palette.fg}" opacity="0.35">?</text>
        <rect x="340" y="520" width="400" height="120" rx="20" fill="${palette.fg}" opacity="0.08"/>
        <rect x="380" y="552" width="320" height="12" rx="6" fill="${palette.fg}" opacity="0.2"/>
        <rect x="380" y="580" width="260" height="12" rx="6" fill="${palette.fg}" opacity="0.15"/>
      `;
    case "saltExecutes":
      return `
        <rect x="940" y="360" width="420" height="88" rx="16" fill="${palette.fg}" opacity="0.12"/>
        <rect x="980" y="390" width="28" height="28" rx="6" fill="${palette.accent}"/>
        <rect x="1030" y="396" width="280" height="12" rx="6" fill="${palette.fg}" opacity="0.35"/>
        <rect x="940" y="480" width="420" height="88" rx="16" fill="${palette.fg}" opacity="0.12"/>
        <rect x="980" y="510" width="28" height="28" rx="6" fill="${palette.accent}"/>
        <rect x="1030" y="516" width="240" height="12" rx="6" fill="${palette.fg}" opacity="0.35"/>
      `;
    case "vaEmptyDesk":
      return `
        <rect x="300" y="560" width="320" height="16" rx="4" fill="${palette.fg}" opacity="0.2"/>
        <rect x="340" y="420" width="16" height="140" fill="${palette.fg}" opacity="0.15"/>
        <rect x="460" y="480" width="120" height="80" rx="12" fill="${palette.fg}" opacity="0.08"/>
        <rect x="280" y="360" width="360" height="14" rx="7" fill="${palette.fg}" opacity="0.12"/>
      `;
    case "saltAlwaysOn":
      return `
        <circle cx="1140" cy="460" r="100" fill="none" stroke="${palette.accent}" stroke-width="6" opacity="0.8"/>
        <line x1="1140" y1="460" x2="1140" y2="400" stroke="${palette.fg}" stroke-width="5" stroke-linecap="round"/>
        <line x1="1140" y1="460" x2="1190" y2="490" stroke="${palette.fg}" stroke-width="5" stroke-linecap="round"/>
        <rect x="980" y="580" width="320" height="64" rx="16" fill="${palette.fg}" opacity="0.12"/>
        <rect x="1020" y="602" width="240" height="12" rx="6" fill="${palette.accent}" opacity="0.7"/>
      `;
    case "alternativesFork":
      return `
        <circle cx="640" cy="500" r="32" fill="${palette.accent}"/>
        <line x1="672" y1="500" x2="780" y2="380" stroke="${palette.fg}" stroke-width="4" opacity="0.35"/>
        <line x1="672" y1="500" x2="780" y2="500" stroke="${palette.fg}" stroke-width="4" opacity="0.35"/>
        <line x1="672" y1="500" x2="780" y2="620" stroke="${palette.fg}" stroke-width="4" opacity="0.35"/>
        <circle cx="860" cy="380" r="28" fill="${palette.fg}" opacity="0.2"/>
        <circle cx="860" cy="500" r="28" fill="${palette.fg}" opacity="0.2"/>
        <circle cx="860" cy="620" r="28" fill="${palette.fg}" opacity="0.2"/>
        <circle cx="1040" cy="380" r="20" fill="${palette.accent}" opacity="0.6"/>
        <circle cx="1040" cy="500" r="20" fill="${palette.accent}" opacity="0.45"/>
        <circle cx="1040" cy="620" r="20" fill="${palette.accent}" opacity="0.3"/>
      `;
    case "pricingFlat":
      return `
        <rect x="580" y="360" width="440" height="56" rx="12" fill="${palette.bg}" opacity="0.12"/>
        <rect x="580" y="440" width="440" height="72" rx="16" fill="${palette.bg}" opacity="0.08"/>
        <rect x="620" y="540" width="28" height="28" rx="6" fill="${palette.accent}"/>
        <rect x="670" y="546" width="280" height="12" rx="6" fill="${palette.bg}" opacity="0.2"/>
        <rect x="620" y="590" width="28" height="28" rx="6" fill="${palette.accent}"/>
        <rect x="670" y="596" width="240" height="12" rx="6" fill="${palette.bg}" opacity="0.2"/>
      `;
    default:
      return "";
  }
}
