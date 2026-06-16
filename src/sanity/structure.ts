import type { StructureBuilder, StructureResolverContext } from 'sanity/structure'
import {
  DocumentIcon,
  CogIcon,
  UsersIcon,
  TagIcon,
  DocumentTextIcon,
  BookIcon,
  FolderIcon,
  CommentIcon,
  ThListIcon,
  HomeIcon,
  ComposeIcon,
  EarthGlobeIcon,
  DocumentsIcon,
  BoltIcon,
  RocketIcon,
} from '@sanity/icons'

/** Document types fully managed in the custom desk — hide from the auto list. */
const HANDLED_SCHEMA_TYPES = new Set([
  'landingPage',
  'blogPost',
  'author',
  'category',
  'competitor',
  'legalPage',
  'docCategory',
  'docArticle',
  'feedback',
  'testimonial',
  'featurePage',
  'marketingCta',
  'formDefinition',
  'formSubmission',
  'siteSettings',
])

function blogItems(S: StructureBuilder) {
  return [
    S.listItem()
      .title('Posts')
      .icon(DocumentTextIcon)
      .schemaType('blogPost')
      .child(
        S.documentTypeList('blogPost')
          .title('Blog Posts')
          .defaultOrdering([{ field: 'publishedAt', direction: 'desc' }])
      ),
    S.listItem()
      .title('Authors')
      .icon(UsersIcon)
      .schemaType('author')
      .child(S.documentTypeList('author').title('Authors')),
    S.listItem()
      .title('Categories')
      .icon(TagIcon)
      .schemaType('category')
      .child(S.documentTypeList('category').title('Categories')),
  ]
}

function featuresItems(S: StructureBuilder) {
  return [
    S.listItem()
      .title('Pages')
      .icon(DocumentTextIcon)
      .schemaType('featurePage')
      .child(
        S.documentTypeList('featurePage')
          .title('Feature cards')
          .defaultOrdering([
            { field: 'sortOrder', direction: 'asc' },
            { field: 'title', direction: 'asc' },
          ])
      ),
  ]
}

function compareItems(S: StructureBuilder) {
  return [
    S.listItem()
      .title('Pages')
      .icon(DocumentTextIcon)
      .child(
        S.documentList()
          .title('Compare pages')
          .filter('_type == "blogPost" && articleKind in ["comparison", "guide"]')
          .defaultOrdering([{ field: 'compareHub.sortOrder', direction: 'asc' }])
      ),
    S.listItem()
      .title('Competitors')
      .icon(UsersIcon)
      .schemaType('competitor')
      .child(
        S.documentTypeList('competitor')
          .title('Competitors')
          .defaultOrdering([{ field: 'name', direction: 'asc' }])
      ),
  ]
}

function documentationItems(S: StructureBuilder) {
  return [
    S.listItem()
      .title('Categories')
      .icon(FolderIcon)
      .schemaType('docCategory')
      .child(
        S.documentTypeList('docCategory')
          .title('Doc Categories')
          .defaultOrdering([{ field: 'order', direction: 'asc' }])
      ),
    S.listItem()
      .title('Articles')
      .icon(DocumentTextIcon)
      .schemaType('docArticle')
      .child(
        S.documentTypeList('docArticle')
          .title('Doc Articles')
          .defaultOrdering([{ field: 'language', direction: 'asc' }])
      ),
  ]
}

function formsItems(S: StructureBuilder) {
  return [
    S.listItem()
      .title('Waitlist')
      .icon(RocketIcon)
      .child(
        S.document()
          .schemaType('formDefinition')
          .documentId('form-waitlist')
          .title('Waitlist form')
      ),
    S.listItem()
      .title('Definitions')
      .icon(ComposeIcon)
      .schemaType('formDefinition')
      .child(
        S.documentTypeList('formDefinition')
          .title('Form definitions')
          .filter('_type == "formDefinition" && key != "waitlist"')
          .defaultOrdering([{ field: 'title', direction: 'asc' }])
      ),
    S.listItem()
      .title('Submissions')
      .icon(DocumentTextIcon)
      .schemaType('formSubmission')
      .child(
        S.documentTypeList('formSubmission')
          .title('Submissions')
          .defaultOrdering([{ field: 'submittedAt', direction: 'desc' }])
      ),
  ]
}

function unhandledDocumentTypes(S: StructureBuilder) {
  return S.documentTypeListItems().filter(
    (listItem) => !HANDLED_SCHEMA_TYPES.has(listItem.getId() ?? '')
  )
}

export const structure = (S: StructureBuilder, _context: StructureResolverContext) =>
  S.list()
    .title('Content')
    .items([
      // ── Core Pages ──────────────────────────────────────────────
      S.listItem()
        .title('Core Pages')
        .icon(HomeIcon)
        .child(
          S.list()
            .title('Core Pages')
            .items([
              S.listItem()
                .title('Homepage')
                .icon(HomeIcon)
                .child(
                  S.documentList()
                    .title('Homepage')
                    .filter('_type == "landingPage" && slug.current == "home"')
                ),
            ])
        ),

      // ── Dynamic Content ─────────────────────────────────────────
      S.listItem()
        .title('Dynamic Content')
        .icon(DocumentsIcon)
        .child(
          S.list()
            .title('Dynamic Content')
            .items([
              S.listItem()
                .title('Landing Pages')
                .icon(DocumentIcon)
                .schemaType('landingPage')
                .child(
                  S.documentList()
                    .title('Landing Pages')
                    .filter('_type == "landingPage" && slug.current != "home"')
                    .defaultOrdering([{ field: 'language', direction: 'asc' }])
                ),
              S.listItem()
                .title('Blog')
                .icon(BookIcon)
                .child(S.list().title('Blog').items(blogItems(S))),
              S.listItem()
                .title('Compare')
                .icon(ThListIcon)
                .child(S.list().title('Compare').items(compareItems(S))),
              S.listItem()
                .title('Features')
                .icon(BoltIcon)
                .child(S.list().title('Features').items(featuresItems(S))),
              S.listItem()
                .title('CTAs')
                .icon(RocketIcon)
                .schemaType('marketingCta')
                .child(
                  S.documentTypeList('marketingCta')
                    .title('CTAs')
                    .defaultOrdering([{ field: 'key', direction: 'asc' }])
                ),
              S.listItem()
                .title('Legal Pages')
                .icon(DocumentTextIcon)
                .schemaType('legalPage')
                .child(
                  S.documentTypeList('legalPage')
                    .title('Legal Pages')
                    .defaultOrdering([{ field: 'language', direction: 'asc' }])
                ),
              S.listItem()
                .title('Testimonials')
                .icon(UsersIcon)
                .schemaType('testimonial')
                .child(S.documentTypeList('testimonial').title('Testimonials')),
            ])
        ),

      // ── Forms ───────────────────────────────────────────────────
      S.listItem()
        .title('Forms')
        .icon(ComposeIcon)
        .child(S.list().title('Forms').items(formsItems(S))),

      // ── Feedback ────────────────────────────────────────────────
      S.listItem()
        .title('Feedback')
        .icon(CommentIcon)
        .schemaType('feedback')
        .child(
          S.documentTypeList('feedback')
            .title('Feedback')
            .defaultOrdering([{ field: 'submittedAt', direction: 'desc' }])
        ),

      // ── Settings ────────────────────────────────────────────────
      S.listItem()
        .title('Settings')
        .icon(CogIcon)
        .child(
          S.list()
            .title('Settings')
            .items([
              S.listItem()
                .title('Documentation')
                .icon(BookIcon)
                .child(S.list().title('Documentation').items(documentationItems(S))),
              S.listItem()
                .title('Global Elements')
                .icon(EarthGlobeIcon)
                .child(
                  S.document()
                    .schemaType('siteSettings')
                    .documentId('site-settings-en')
                    .title('Global Elements')
                ),
            ])
        ),

      S.divider(),

      // Catch-all for future document types not yet slotted above
      ...unhandledDocumentTypes(S),
    ])
