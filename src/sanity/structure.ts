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
} from '@sanity/icons'

export const structure = (S: StructureBuilder, context: StructureResolverContext) =>
  S.list()
    .title('Content')
    .items([
      // Site Settings
      S.listItem()
        .title('Site Settings')
        .icon(CogIcon)
        .schemaType('siteSettings')
        .child(
          S.documentTypeList('siteSettings')
            .title('Site Settings')
            .defaultOrdering([{ field: 'language', direction: 'asc' }])
        ),

      S.divider(),

      // Landing Pages
      S.listItem()
        .title('Landing Pages')
        .icon(DocumentIcon)
        .schemaType('landingPage')
        .child(
          S.documentTypeList('landingPage')
            .title('Landing Pages')
            .defaultOrdering([{ field: 'language', direction: 'asc' }])
        ),

      S.divider(),

      // Blog
      S.listItem()
        .title('Blog')
        .icon(BookIcon)
        .child(
          S.list()
            .title('Blog')
            .items([
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
            ])
        ),

      // Legal Pages
      S.listItem()
        .title('Legal Pages')
        .icon(DocumentTextIcon)
        .schemaType('legalPage')
        .child(
          S.documentTypeList('legalPage')
            .title('Legal Pages')
            .defaultOrdering([{ field: 'language', direction: 'asc' }])
        ),

      S.divider(),

      // Documentation
      S.listItem()
        .title('Documentation')
        .icon(BookIcon)
        .child(
          S.list()
            .title('Documentation')
            .items([
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
            ])
        ),

      S.divider(),

      // Feedback
      S.listItem()
        .title('Feedback')
        .icon(CommentIcon)
        .schemaType('feedback')
        .child(
          S.documentTypeList('feedback')
            .title('Feedback')
            .defaultOrdering([{ field: 'submittedAt', direction: 'desc' }])
        ),

      // Testimonials
      S.listItem()
        .title('Testimonials')
        .icon(UsersIcon)
        .schemaType('testimonial')
        .child(S.documentTypeList('testimonial').title('Testimonials')),
    ])
