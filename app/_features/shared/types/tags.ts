import { 
  AlertCircle, 
  Zap, 
  TrendingUp, 
  AlertTriangle,
  Clock,
  Ban
} from "lucide-react";

export type TagType = 'client' | 'project';

export type TagColor = 'destructive' | 'info' | 'success' | 'warning' | 'purple' | 'orange';

export interface Tag {
  id: string;
  label: string;
  type: TagType;
  color: TagColor;
  icon: string; // lucide icon name
  isBuiltIn: boolean;
  createdAt: string;
}

// Built-in client tags
export const BUILT_IN_CLIENT_TAGS: Tag[] = [
  {
    id: 'late-payment',
    label: 'Late Payment',
    type: 'client',
    color: 'destructive',
    icon: 'AlertCircle',
    isBuiltIn: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'retainer',
    label: 'Retainer',
    type: 'client',
    color: 'info',
    icon: 'Zap',
    isBuiltIn: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'high-value',
    label: 'High Value',
    type: 'client',
    color: 'success',
    icon: 'TrendingUp',
    isBuiltIn: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'at-risk',
    label: 'At Risk',
    type: 'client',
    color: 'warning',
    icon: 'AlertCircle',
    isBuiltIn: true,
    createdAt: new Date().toISOString(),
  },
];

// Built-in project tags
export const BUILT_IN_PROJECT_TAGS: Tag[] = [
  {
    id: 'urgent',
    label: 'Urgent',
    type: 'project',
    color: 'destructive',
    icon: 'AlertTriangle',
    isBuiltIn: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'blocked',
    label: 'Blocked',
    type: 'project',
    color: 'warning',
    icon: 'Ban',
    isBuiltIn: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'on-hold',
    label: 'On Hold',
    type: 'project',
    color: 'info',
    icon: 'Clock',
    isBuiltIn: true,
    createdAt: new Date().toISOString(),
  },
];

// Helper to get built-in tags by type
export function getBuiltInTags(type: TagType): Tag[] {
  return type === 'client' ? BUILT_IN_CLIENT_TAGS : BUILT_IN_PROJECT_TAGS;
}

// Color palette for auto-assignment
export const TAG_COLOR_PALETTE: TagColor[] = [
  'destructive',
  'info',
  'success',
  'warning',
  'purple',
  'orange',
];

// Helper to get next available color
export function getNextTagColor(existingTags: Tag[]): TagColor {
  const usedColors = existingTags.map(t => t.color);
  const availableColors = TAG_COLOR_PALETTE.filter(c => !usedColors.includes(c));
  
  // If all colors used, cycle back to beginning
  if (availableColors.length === 0) {
    return TAG_COLOR_PALETTE[existingTags.length % TAG_COLOR_PALETTE.length];
  }
  
  return availableColors[0];
}

// Helper to get tag color classes
export function getTagColorClass(color: TagColor): string {
  switch(color) {
    case 'destructive':
      return 'bg-destructive/10 text-destructive border-destructive/20';
    case 'info':
      return 'bg-info/10 text-info border-info/20';
    case 'success':
      return 'bg-success/10 text-success border-success/20';
    case 'warning':
      return 'bg-warning/10 text-warning border-warning/20';
    case 'purple':
      return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
    case 'orange':
      return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20';
  }
}

// Helper to get tag filter button color
export function getTagFilterColor(color: TagColor): string {
  switch(color) {
    case 'destructive':
      return 'text-destructive hover:text-destructive';
    case 'info':
      return 'text-info hover:text-info';
    case 'success':
      return 'text-success hover:text-success';
    case 'warning':
      return 'text-warning hover:text-warning';
    case 'purple':
      return 'text-purple-600 dark:text-purple-400 hover:text-purple-600 dark:hover:text-purple-400';
    case 'orange':
      return 'text-orange-600 dark:text-orange-400 hover:text-orange-600 dark:hover:text-orange-400';
  }
}

