/**
 * ESLint Plugin: Semantic Colors
 *
 * Enforces semantic color usage in Tailwind CSS classes instead of raw color values.
 * This maintains design system consistency by using design tokens.
 *
 * @example
 * // Bad
 * <div className="bg-blue-500 text-gray-900" />
 *
 * // Good
 * <div className="bg-primary text-foreground" />
 */

// Raw Tailwind color patterns to detect
// Matches: bg-{color}-{shade}, text-{color}-{shade}, border-{color}-{shade}, etc.
const RAW_COLOR_PATTERN = /\b(bg|text|border|ring|outline|shadow|divide|from|via|to|fill|stroke|accent|caret|decoration)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(-\d{2,3})?(\/\d+)?\b/g;

// Semantic color suggestions based on common use cases
const COLOR_SUGGESTIONS = {
  // Background colors
  'bg-white': 'bg-background or bg-card',
  'bg-black': 'bg-foreground (for inverted) or bg-primary',
  'bg-gray-50': 'bg-muted or bg-card',
  'bg-gray-100': 'bg-muted or bg-accent',
  'bg-gray-200': 'bg-muted or bg-border',
  'bg-gray-900': 'bg-card (dark mode) or bg-primary',
  'bg-zinc-50': 'bg-muted or bg-card',
  'bg-zinc-100': 'bg-muted or bg-accent',
  'bg-zinc-800': 'bg-card (dark mode)',
  'bg-zinc-900': 'bg-background (dark mode)',
  'bg-zinc-950': 'bg-background (dark mode)',
  'bg-blue-500': 'bg-primary or bg-info',
  'bg-blue-600': 'bg-primary',
  'bg-green-500': 'bg-success',
  'bg-green-600': 'bg-success',
  'bg-red-500': 'bg-destructive',
  'bg-red-600': 'bg-destructive',
  'bg-yellow-500': 'bg-warning',
  'bg-orange-500': 'bg-warning',

  // Text colors
  'text-white': 'text-primary-foreground or text-background',
  'text-black': 'text-foreground',
  'text-gray-50': 'text-foreground (inverted)',
  'text-gray-100': 'text-foreground (inverted)',
  'text-gray-400': 'text-muted-foreground',
  'text-gray-500': 'text-muted-foreground',
  'text-gray-600': 'text-muted-foreground or text-foreground/70',
  'text-gray-700': 'text-foreground/80',
  'text-gray-800': 'text-foreground/90',
  'text-gray-900': 'text-foreground',
  'text-zinc-400': 'text-muted-foreground',
  'text-zinc-500': 'text-muted-foreground',
  'text-zinc-600': 'text-muted-foreground',
  'text-zinc-900': 'text-foreground',
  'text-blue-500': 'text-primary or text-info',
  'text-blue-600': 'text-primary',
  'text-green-500': 'text-success',
  'text-green-600': 'text-success',
  'text-red-500': 'text-destructive',
  'text-red-600': 'text-destructive',
  'text-yellow-500': 'text-warning',
  'text-orange-500': 'text-warning',

  // Border colors
  'border-gray-200': 'border-border',
  'border-gray-300': 'border-border',
  'border-gray-400': 'border-border',
  'border-zinc-200': 'border-border',
  'border-zinc-300': 'border-border',
  'border-zinc-700': 'border-border (dark mode)',
  'border-zinc-800': 'border-border (dark mode)',
  'border-blue-500': 'border-primary or border-info',
  'border-green-500': 'border-success',
  'border-red-500': 'border-destructive',
  'border-yellow-500': 'border-warning',

  // Ring colors
  'ring-gray-200': 'ring-border or ring-ring',
  'ring-gray-300': 'ring-ring',
  'ring-blue-500': 'ring-primary or ring-ring',
  'ring-blue-600': 'ring-ring',
};

// Get suggestion for a raw color class
function getSuggestion(colorClass) {
  // Check for exact match first
  if (COLOR_SUGGESTIONS[colorClass]) {
    return COLOR_SUGGESTIONS[colorClass];
  }

  // Extract the prefix and color type
  const match = colorClass.match(/^(bg|text|border|ring|outline|shadow|divide|from|via|to|fill|stroke|accent|caret|decoration)-(\w+)(-\d+)?/);
  if (!match) return null;

  const [, prefix, color] = match;

  // Generic suggestions based on prefix
  const genericSuggestions = {
    bg: 'bg-background, bg-card, bg-muted, bg-accent, bg-primary, bg-secondary, bg-destructive',
    text: 'text-foreground, text-muted-foreground, text-primary, text-secondary, text-destructive',
    border: 'border-border, border-input, border-primary, border-destructive',
    ring: 'ring-ring, ring-primary, ring-destructive',
    outline: 'outline-ring, outline-primary',
    shadow: 'shadow (no color needed for most cases)',
    divide: 'divide-border',
    from: 'from-primary, from-secondary (for gradients)',
    via: 'via-primary, via-secondary (for gradients)',
    to: 'to-primary, to-secondary (for gradients)',
    fill: 'fill-foreground, fill-primary, fill-muted-foreground',
    stroke: 'stroke-foreground, stroke-primary, stroke-muted-foreground',
  };

  return genericSuggestions[prefix] || `${prefix}-{semantic-color}`;
}

// ESLint rule definition
const semanticColorsRule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce semantic color usage instead of raw Tailwind colors',
      category: 'Design System',
      recommended: true,
      url: 'https://github.com/salt-core/eslint-plugin-semantic-colors',
    },
    fixable: null, // Can't auto-fix because semantic mapping requires context
    hasSuggestions: true,
    messages: {
      avoidRawColor: 'Avoid raw Tailwind color "{{colorClass}}". Use semantic colors instead: {{suggestion}}',
      useSemanticColors: 'Replace with semantic color to maintain design system consistency.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          ignore: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of color classes to ignore',
          },
          allowInComments: {
            type: 'boolean',
            default: true,
            description: 'Allow raw colors in comments',
          },
        },
        additionalProperties: false,
      },
    ],
  },

  create(context) {
    const options = context.options[0] || {};
    const ignorePatterns = options.ignore || [];

    // Check if a class should be ignored
    function shouldIgnore(colorClass) {
      return ignorePatterns.some(pattern => {
        if (pattern.includes('*')) {
          const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
          return regex.test(colorClass);
        }
        return colorClass === pattern;
      });
    }

    // Check a string value for raw colors
    function checkString(node, value) {
      if (typeof value !== 'string') return;

      const matches = [...value.matchAll(RAW_COLOR_PATTERN)];

      for (const match of matches) {
        const colorClass = match[0];

        if (shouldIgnore(colorClass)) continue;

        const suggestion = getSuggestion(colorClass);

        context.report({
          node,
          messageId: 'avoidRawColor',
          data: {
            colorClass,
            suggestion: suggestion || 'semantic colors (bg-primary, text-foreground, etc.)',
          },
        });
      }
    }

    return {
      // Check JSX className attribute
      JSXAttribute(node) {
        if (node.name.name !== 'className' && node.name.name !== 'class') return;

        const value = node.value;

        // String literal: className="bg-blue-500"
        if (value && value.type === 'Literal' && typeof value.value === 'string') {
          checkString(value, value.value);
        }

        // JSX Expression: className={...}
        if (value && value.type === 'JSXExpressionContainer') {
          const expr = value.expression;

          // String literal in expression: className={"bg-blue-500"}
          if (expr.type === 'Literal' && typeof expr.value === 'string') {
            checkString(expr, expr.value);
          }

          // Template literal: className={`bg-blue-500 ${condition}`}
          if (expr.type === 'TemplateLiteral') {
            for (const quasi of expr.quasis) {
              checkString(quasi, quasi.value.raw);
            }
          }

          // Tagged template: className={cn`bg-blue-500`}
          if (expr.type === 'TaggedTemplateExpression') {
            for (const quasi of expr.quasi.quasis) {
              checkString(quasi, quasi.value.raw);
            }
          }
        }
      },

      // Check cn(), clsx(), classNames() calls
      CallExpression(node) {
        const callee = node.callee;
        const functionName = callee.type === 'Identifier' ? callee.name : null;

        // Check if it's a className utility function
        if (!['cn', 'clsx', 'classNames', 'twMerge', 'cva'].includes(functionName)) {
          return;
        }

        // Check all arguments
        for (const arg of node.arguments) {
          // String literal
          if (arg.type === 'Literal' && typeof arg.value === 'string') {
            checkString(arg, arg.value);
          }

          // Template literal
          if (arg.type === 'TemplateLiteral') {
            for (const quasi of arg.quasis) {
              checkString(quasi, quasi.value.raw);
            }
          }

          // Array of strings
          if (arg.type === 'ArrayExpression') {
            for (const element of arg.elements) {
              if (element && element.type === 'Literal' && typeof element.value === 'string') {
                checkString(element, element.value);
              }
            }
          }

          // Object with string keys (conditional classes)
          if (arg.type === 'ObjectExpression') {
            for (const prop of arg.properties) {
              if (prop.type === 'Property' && prop.key.type === 'Literal' && typeof prop.key.value === 'string') {
                checkString(prop.key, prop.key.value);
              }
            }
          }
        }
      },
    };
  },
};

// Plugin export
const plugin = {
  meta: {
    name: 'eslint-plugin-semantic-colors',
    version: '1.0.0',
  },
  rules: {
    'no-raw-colors': semanticColorsRule,
  },
  configs: {
    recommended: {
      plugins: ['semantic-colors'],
      rules: {
        'semantic-colors/no-raw-colors': 'warn',
      },
    },
    strict: {
      plugins: ['semantic-colors'],
      rules: {
        'semantic-colors/no-raw-colors': 'error',
      },
    },
  },
};

export default plugin;
export { semanticColorsRule };
