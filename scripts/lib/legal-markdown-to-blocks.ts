type PortableTextMarkDef = {
  _key: string
  _type: 'link'
  href: string
}

type PortableTextSpan = {
  _type: 'span'
  _key: string
  text: string
  marks: string[]
}

export type PortableTextBlock = {
  _type: 'block'
  _key: string
  style: 'normal' | 'h2' | 'h3' | 'h4'
  children: PortableTextSpan[]
  markDefs?: PortableTextMarkDef[]
  listItem?: 'bullet' | 'number'
  level?: number
}

function blockKey(): string {
  return Math.random().toString(36).slice(2, 10)
}

function parseInline(text: string): {
  children: PortableTextSpan[]
  markDefs: PortableTextMarkDef[]
} {
  const markDefs: PortableTextMarkDef[] = []
  const children: PortableTextSpan[] = []

  const pattern =
    /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g

  let lastIndex = 0
  let match: RegExpExecArray | null

  const pushPlain = (value: string) => {
    if (!value) return
    children.push({
      _type: 'span',
      _key: blockKey(),
      text: value,
      marks: [],
    })
  }

  while ((match = pattern.exec(text)) !== null) {
    pushPlain(text.slice(lastIndex, match.index))
    const token = match[0]

    if (token.startsWith('**')) {
      children.push({
        _type: 'span',
        _key: blockKey(),
        text: token.slice(2, -2),
        marks: ['strong'],
      })
    } else if (token.startsWith('*')) {
      children.push({
        _type: 'span',
        _key: blockKey(),
        text: token.slice(1, -1),
        marks: ['em'],
      })
    } else if (token.startsWith('[')) {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
      if (linkMatch) {
        const markKey = blockKey()
        markDefs.push({ _key: markKey, _type: 'link', href: linkMatch[2] })
        children.push({
          _type: 'span',
          _key: blockKey(),
          text: linkMatch[1],
          marks: [markKey],
        })
      }
    }

    lastIndex = match.index + token.length
  }

  pushPlain(text.slice(lastIndex))

  if (children.length === 0) {
    children.push({ _type: 'span', _key: blockKey(), text: '', marks: [] })
  }

  return { children, markDefs }
}

function makeBlock(
  style: PortableTextBlock['style'],
  text: string,
  listItem?: PortableTextBlock['listItem']
): PortableTextBlock {
  const { children, markDefs } = parseInline(text)
  return {
    _type: 'block',
    _key: blockKey(),
    style,
    children,
    ...(markDefs.length > 0 ? { markDefs } : {}),
    ...(listItem ? { listItem, level: 1 } : {}),
  }
}

export function legalMarkdownToBlocks(markdown: string): PortableTextBlock[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const blocks: PortableTextBlock[] = []
  let paragraph: string[] = []

  const flushParagraph = () => {
    const text = paragraph.join(' ').trim()
    if (text) blocks.push(makeBlock('normal', text))
    paragraph = []
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()

    if (!line.trim()) {
      flushParagraph()
      continue
    }

    if (/^---+$/.test(line.trim())) {
      flushParagraph()
      continue
    }

    const heading = line.match(/^(#{2,4})\s+(.+)$/)
    if (heading) {
      flushParagraph()
      const level = heading[1].length
      const style = level === 2 ? 'h2' : level === 3 ? 'h3' : 'h4'
      blocks.push(makeBlock(style, heading[2].trim()))
      continue
    }

    const bullet = line.match(/^[-*]\s+(.+)$/)
    if (bullet) {
      flushParagraph()
      blocks.push(makeBlock('normal', bullet[1].trim(), 'bullet'))
      continue
    }

    const numbered = line.match(/^\d+\.\s+(.+)$/)
    if (numbered) {
      flushParagraph()
      blocks.push(makeBlock('normal', numbered[1].trim(), 'number'))
      continue
    }

    paragraph.push(line.trim())
  }

  flushParagraph()
  return blocks
}
