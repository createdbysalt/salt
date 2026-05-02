import { defineField } from 'sanity'

export const supportedLanguages = [
  { id: 'en', title: 'English', isDefault: true },
  { id: 'pt-BR', title: 'Português (Brasil)' },
  { id: 'es', title: 'Español' },
  { id: 'de', title: 'Deutsch' },
] as const

export type LanguageId = (typeof supportedLanguages)[number]['id']

export const defaultLanguage = supportedLanguages.find((l) => 'isDefault' in l && l.isDefault)!

export const languageField = defineField({
  name: 'language',
  title: 'Language',
  type: 'string',
  readOnly: true,
  hidden: true,
})

export const baseLanguageField = defineField({
  name: '__i18n_base',
  title: 'Base Document',
  type: 'reference',
  to: [], // Will be set per document type
  hidden: true,
  weak: true,
})

export const localeStringField = (name: string, title: string, options?: { rows?: number }) =>
  defineField({
    name,
    title,
    type: options?.rows ? 'text' : 'string',
    ...(options?.rows && { rows: options.rows }),
  })

export const localeTextField = (name: string, title: string, rows = 3) =>
  defineField({
    name,
    title,
    type: 'text',
    rows,
  })

export const localeBlockField = (name: string, title: string) =>
  defineField({
    name,
    title,
    type: 'array',
    of: [{ type: 'block' }],
  })
