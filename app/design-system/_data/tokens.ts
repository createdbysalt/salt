export interface TokenGroup {
  name: string;
  description: string;
  tokens: TokenInfo[];
}

export interface TokenInfo {
  name: string;
  variable: string;
  usage: string;
  category?: "semantic" | "status" | "structure" | "chart";
}

export const colorTokenGroups: TokenGroup[] = [
  {
    name: "Semantic Colors",
    description: "Core colors for UI elements",
    tokens: [
      { name: "Background", variable: "--background", usage: "Main page background", category: "semantic" },
      { name: "Foreground", variable: "--foreground", usage: "Primary text color", category: "semantic" },
      { name: "Card", variable: "--card", usage: "Elevated surface background", category: "semantic" },
      { name: "Card Foreground", variable: "--card-foreground", usage: "Text on cards", category: "semantic" },
      { name: "Popover", variable: "--popover", usage: "Popover/dropdown background", category: "semantic" },
      { name: "Popover Foreground", variable: "--popover-foreground", usage: "Text in popovers", category: "semantic" },
      { name: "Primary", variable: "--primary", usage: "Primary actions, CTAs, links", category: "semantic" },
      { name: "Primary Foreground", variable: "--primary-foreground", usage: "Text on primary buttons", category: "semantic" },
      { name: "Secondary", variable: "--secondary", usage: "Secondary actions", category: "semantic" },
      { name: "Secondary Foreground", variable: "--secondary-foreground", usage: "Text on secondary buttons", category: "semantic" },
      { name: "Muted", variable: "--muted", usage: "Subtle backgrounds", category: "semantic" },
      { name: "Muted Foreground", variable: "--muted-foreground", usage: "Subtle text, helper text", category: "semantic" },
      { name: "Accent", variable: "--accent", usage: "Accent highlights", category: "semantic" },
      { name: "Accent Foreground", variable: "--accent-foreground", usage: "Text on accent backgrounds", category: "semantic" },
    ],
  },
  {
    name: "Status Colors",
    description: "Semantic status indicators",
    tokens: [
      { name: "Success", variable: "--success", usage: "Success states, positive feedback", category: "status" },
      { name: "Success Foreground", variable: "--success-foreground", usage: "Text on success backgrounds", category: "status" },
      { name: "Warning", variable: "--warning", usage: "Warning states, caution", category: "status" },
      { name: "Warning Foreground", variable: "--warning-foreground", usage: "Text on warning backgrounds", category: "status" },
      { name: "Destructive", variable: "--destructive", usage: "Error states, destructive actions", category: "status" },
      { name: "Destructive Foreground", variable: "--destructive-foreground", usage: "Text on error backgrounds", category: "status" },
      { name: "Info", variable: "--info", usage: "Informational states", category: "status" },
      { name: "Info Foreground", variable: "--info-foreground", usage: "Text on info backgrounds", category: "status" },
    ],
  },
  {
    name: "Structure Colors",
    description: "Borders, inputs, and UI structure",
    tokens: [
      { name: "Border", variable: "--border", usage: "Default border color", category: "structure" },
      { name: "Input", variable: "--input", usage: "Input field borders", category: "structure" },
      { name: "Ring", variable: "--ring", usage: "Focus ring color", category: "structure" },
      { name: "Sidebar", variable: "--sidebar", usage: "Sidebar background", category: "structure" },
      { name: "Sidebar Foreground", variable: "--sidebar-foreground", usage: "Sidebar text", category: "structure" },
      { name: "Sidebar Border", variable: "--sidebar-border", usage: "Sidebar borders", category: "structure" },
      { name: "Topbar", variable: "--topbar", usage: "Topbar background", category: "structure" },
      { name: "Topbar Foreground", variable: "--topbar-foreground", usage: "Topbar text", category: "structure" },
      { name: "Topbar Border", variable: "--topbar-border", usage: "Topbar borders", category: "structure" },
      { name: "Surface 1", variable: "--surface-1", usage: "First elevation surface", category: "structure" },
      { name: "Surface 2", variable: "--surface-2", usage: "Second elevation surface", category: "structure" },
    ],
  },
  {
    name: "Chart Colors",
    description: "Multi-color palette for data visualization",
    tokens: [
      { name: "Chart 1", variable: "--chart-1", usage: "First data series (primary)", category: "chart" },
      { name: "Chart 2", variable: "--chart-2", usage: "Second data series", category: "chart" },
      { name: "Chart 3", variable: "--chart-3", usage: "Third data series", category: "chart" },
      { name: "Chart 4", variable: "--chart-4", usage: "Fourth data series", category: "chart" },
      { name: "Chart 5", variable: "--chart-5", usage: "Fifth data series", category: "chart" },
    ],
  },
];

export const radiusTokens: TokenInfo[] = [
  { name: "Small", variable: "--radius-sm", usage: "Smaller elements" },
  { name: "Medium", variable: "--radius-md", usage: "Buttons, inputs (default)" },
  { name: "Large", variable: "--radius-lg", usage: "Cards, panels" },
  { name: "XL", variable: "--radius-xl", usage: "Extra large surfaces" },
  { name: "2XL", variable: "--radius-2xl", usage: "Very large surfaces" },
];



