import { createClient } from '@sanity/client';
import { readFileSync } from 'fs';

const PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'olt8be01';
const DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';

// Read tokens from env vars (preferred) or /tmp files (legacy)
const writeToken = process.env.SANITY_API_WRITE_TOKEN || readFileSync('/tmp/sanity_wt', 'utf8').trim();
const readToken = process.env.SANITY_API_READ_TOKEN || readFileSync('/tmp/sanity_rt', 'utf8').trim();

if (!writeToken || !readToken) {
  console.error('ERROR: Missing Sanity API tokens.');
  console.error('Set SANITY_API_WRITE_TOKEN and SANITY_API_READ_TOKEN env vars,');
  console.error('or write them to /tmp/sanity_wt and /tmp/sanity_rt.');
  console.error('Usage with 1Password: op run --env-file=.env.1password -- node push-blog-posts.mjs');
  process.exit(1);
}

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  token: writeToken,
  apiVersion: '2023-08-01',
  useCdn: false,
});

const readClient = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  token: readToken,
  apiVersion: '2023-08-01',
  useCdn: false,
});

async function main() {
  // Step 1: Check/create author
  console.log('\n📋 Prerequisites:');
  let authorId;
  const existingAuthor = await readClient.fetch('*[_type == "author" && name == "Matt Martins"]._id');
  if (existingAuthor.length > 0) {
    authorId = existingAuthor[0];
    console.log(`  ✓ Author 'Matt Martins' already exists (ID: ${authorId})`);
  } else {
    const author = await client.create({
      _type: 'author',
      name: 'Matt Martins',
      slug: { _type: 'slug', current: 'matt-martins' }
    });
    authorId = author._id;
    console.log(`  ✓ Created author 'Matt Martins' (ID: ${authorId})`);
  }

  // Step 2: Check/create category
  let categoryId;
  const existingCategory = await readClient.fetch('*[_type == "category" && title == "Proactive AI"]._id');
  if (existingCategory.length > 0) {
    categoryId = existingCategory[0];
    console.log(`  ✓ Category 'Proactive AI' already exists (ID: ${categoryId})`);
  } else {
    const category = await client.create({
      _type: 'category',
      title: 'Proactive AI',
      slug: { _type: 'slug', current: 'proactive-ai' }
    });
    categoryId = category._id;
    console.log(`  ✓ Created category 'Proactive AI' (ID: ${categoryId})`);
  }

  // Step 3: Define and push pages
  const today = new Date();
  
  const pages = [
    {
      file: '/srv/salt-software-knowledge-base/04-Content/Pieces/Website/SeoBatches/Cluster1-ProactiveAI/what-is-proactive-ai.md',
      title: 'What Is Proactive AI? The Complete Guide for Business Owners',
      slug: 'what-is-proactive-ai',
      excerpt: 'Proactive AI is business software that monitors your operations and surfaces what needs attention — without waiting for you to ask. A complete guide for independent professionals.',
      seo_title: 'What Is Proactive AI? Complete Guide for Business Owners',
      seo_desc: 'Proactive AI monitors your business operations and surfaces what needs attention. Learn how it differs from reactive AI and how it automates your work.',
      pubOffset: 0
    },
    {
      file: '/srv/salt-software-knowledge-base/04-Content/Pieces/Website/SeoBatches/Cluster1-ProactiveAI/proactive-ai-vs-reactive-ai.md',
      title: "Proactive AI vs. Reactive AI: What's the Difference?",
      slug: 'proactive-ai-vs-reactive-ai',
      excerpt: 'The core difference between proactive and reactive AI is initiative: proactive AI pushes information to you; reactive AI waits for you to ask.',
      seo_title: "Proactive AI vs. Reactive AI: What's the Difference?",
      seo_desc: 'Proactive AI pushes information to you. Reactive AI waits for your prompt. Learn the difference and which one your business needs.',
      pubOffset: 1
    },
    {
      file: '/srv/salt-software-knowledge-base/04-Content/Pieces/Website/SeoBatches/Cluster1-ProactiveAI/how-proactive-ai-automates-operations.md',
      title: 'How Proactive AI Automates Business Operations',
      slug: 'how-proactive-ai-automates-operations',
      excerpt: 'Proactive AI automates business operations by observing your data sources and surfacing what needs attention. A practical guide to the Observe → Surface → Decide loop.',
      seo_title: 'How Proactive AI Automates Business Operations',
      seo_desc: 'Proactive AI automates business operations by observing your data and surfacing what needs your attention. A practical guide for independent professionals.',
      pubOffset: 2
    }
  ];

  const createdIds = [];

  for (const page of pages) {
    console.log(`\n📄 Pushing: ${page.title}`);
    
    // Read markdown
    const md = readFileSync(page.file, 'utf8');
    // Strip front matter
    const bodyMd = md.replace(/^---\n[\s\S]*?\n---\n/, '').trim();
    console.log(`  ✓ Markdown parsed (${bodyMd.length} chars)`);
    
    // Convert Markdown to Portable Text
    const blocks = mdToPortableText(bodyMd);
    console.log(`  ✓ Converted to ${blocks.length} Portable Text blocks`);
    
    // Staggered publish date
    const pubDate = new Date(today);
    pubDate.setDate(pubDate.getDate() + page.pubOffset);
    const publishedAt = pubDate.toISOString();
    
    // Check for existing post with this slug
    const existingIds = await readClient.fetch(`*[_type == "blogPost" && slug.current == "${page.slug}"]._id`);
    
    let doc;
    if (existingIds.length > 0) {
      doc = await client.createOrReplace({
        _id: existingIds[0],
        _type: 'blogPost',
        title: page.title,
        slug: { _type: 'slug', current: page.slug },
        excerpt: page.excerpt,
        author: { _type: 'reference', _ref: authorId },
        category: { _type: 'reference', _ref: categoryId },
        publishedAt,
        body: blocks,
        seo: {
          title: page.seo_title,
          description: page.seo_desc,
          noIndex: false
        },
        language: 'en'
      });
      console.log(`  ✓ Updated existing post (ID: ${doc._id})`);
    } else {
      doc = await client.create({
        _type: 'blogPost',
        title: page.title,
        slug: { _type: 'slug', current: page.slug },
        excerpt: page.excerpt,
        author: { _type: 'reference', _ref: authorId },
        category: { _type: 'reference', _ref: categoryId },
        publishedAt,
        body: blocks,
        seo: {
          title: page.seo_title,
          description: page.seo_desc,
          noIndex: false
        },
        language: 'en'
      });
      console.log(`  ✓ Created new post (ID: ${doc._id})`);
    }
    
    createdIds.push({ title: page.title, slug: page.slug, _id: doc._id });
  }

  // Step 4: Verify
  console.log('\n' + '='.repeat(60));
  console.log('VERIFICATION');
  console.log('='.repeat(60));
  
  for (const page of pages) {
    const results = await readClient.fetch(
      `*[_type == "blogPost" && slug.current == "${page.slug}"]{_id, title, "slug": slug.current, publishedAt}`
    );
    if (results.length > 0) {
      const r = results[0];
      console.log(`  ✓ ${r.title}:`);
      console.log(`      ID: ${r._id}`);
      console.log(`      Slug: ${r.slug}`);
      console.log(`      Published: ${r.publishedAt}`);
    } else {
      console.log(`  ✗ ${page.slug}: NOT FOUND`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Author ID: ${authorId}`);
  console.log(`Category ID: ${categoryId}`);
  console.log(`Posts created/updated: ${createdIds.length}`);
  for (const c of createdIds) {
    console.log(`  - ${c.title} (${c._id})`);
  }
  console.log('Done!');
}

/**
 * Simple Markdown to Sanity Portable Text converter.
 * Handles: H2, H3, paragraphs, **bold**, *italic*, `code`, [links](url), bullets, numbered lists.
 * H1 is skipped (used as title).
 */
function mdToPortableText(md) {
  const lines = md.split('\n');
  const blocks = [];
  let inList = false;
  let listType = null;
  let listItems = [];
  
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    
    // Skip HRs (---)
    if (/^---+$/.test(trimmed) && trimmed.length > 2) continue;
    // Blank line
    if (!trimmed) { flushList(); continue; }
    
    // H1 - skip (used as title)
    if (/^#\s+(.+)/.test(trimmed)) continue;
    
    // H2
    const h2Match = trimmed.match(/^##\s+(.+)/);
    if (h2Match) { flushList(); blocks.push(makeBlock('h2', h2Match[1].trim())); continue; }
    
    // H3
    const h3Match = trimmed.match(/^###\s+(.+)/);
    if (h3Match) { flushList(); blocks.push(makeBlock('h3', h3Match[1].trim())); continue; }
    
    // Bullet list item
    const bulletMatch = trimmed.match(/^[-*+]\s+(.+)/);
    if (bulletMatch) {
      if (!inList) { inList = true; listType = 'bullet'; listItems = []; }
      listItems.push(bulletMatch[1].trim());
      continue;
    }
    
    // Numbered list item
    const numMatch = trimmed.match(/^\d+[.)]\s+(.+)/);
    if (numMatch) {
      if (!inList) { inList = true; listType = 'number'; listItems = []; }
      listItems.push(numMatch[1].trim());
      continue;
    }
    
    // Table row - skip
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) continue;
    
    flushList();
    
    // Regular paragraph
    blocks.push(makeBlock('normal', trimmed));
  }
  
  flushList();
  return blocks;
  
  function flushList() {
    if (inList && listItems.length > 0) {
      for (const item of listItems) {
        const block = makeBlock('normal', item);
        block.listItem = listType;
        block.level = 1;
        blocks.push(block);
      }
      inList = false;
      listItems = [];
    }
  }
}

function makeBlock(style, text) {
  const children = [];
  const markDefs = [];
  let lastIdx = 0;
  let linkCounter = 0;
  
  // Pattern: [text](url) | **bold** | *italic* | `code`
  const re = /\[([^\]]+)\]\(([^)]+)\)|\*\*(.+?)\*\*|(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)|`([^`]+)`/g;
  let match;
  
  while ((match = re.exec(text)) !== null) {
    // Plain text before match
    if (match.index > lastIdx) {
      const plain = text.slice(lastIdx, match.index);
      if (plain) children.push({ _type: 'span', text: plain });
    }
    
    if (match[1]) {
      // Link: [text](url)
      const linkText = match[1];
      const url = match[2];
      const key = `link-${linkCounter++}`;
      markDefs.push({ _key: key, _type: 'link', href: url });
      
      // Check for bold link text
      const boldLink = linkText.match(/^\*\*(.+)\*\*$/);
      if (boldLink) {
        children.push({ _type: 'span', text: boldLink[1], marks: ['strong', key] });
      } else {
        children.push({ _type: 'span', text: linkText, marks: [key] });
      }
    } else if (match[3]) {
      // **bold**
      children.push({ _type: 'span', text: match[3], marks: ['strong'] });
    } else if (match[4]) {
      // *italic*
      children.push({ _type: 'span', text: match[4], marks: ['em'] });
    } else if (match[5]) {
      // `code`
      children.push({ _type: 'span', text: match[5], marks: ['code'] });
    }
    
    lastIdx = match.index + match[0].length;
  }
  
  // Remaining text after last match
  if (lastIdx < text.length) {
    const remaining = text.slice(lastIdx);
    if (remaining) children.push({ _type: 'span', text: remaining });
  }
  
  // Fallback if no children parsed
  if (children.length === 0) {
    children.push({ _type: 'span', text });
  }
  
  return {
    _type: 'block',
    style,
    children,
    markDefs
  };
}

main().catch(err => {
  console.error('ERROR:', err.message || err);
  process.exit(1);
});
