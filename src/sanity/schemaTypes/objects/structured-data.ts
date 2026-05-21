import { defineType, defineField } from 'sanity'

export const organizationData = defineType({
  name: 'organizationData',
  title: 'Organization Data',
  type: 'object',
  description: 'Schema.org Organization data for AEO/SEO',
  fields: [
    defineField({
      name: 'name',
      title: 'Organization Name',
      type: 'string',
      description: 'Legal or brand name (e.g., "Salt")',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'legalName',
      title: 'Legal Name',
      type: 'string',
      description: 'Registered legal name (e.g., "Simcoe House Inc.")',
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 2,
      description: 'Brief description of the organization',
    }),
    defineField({
      name: 'url',
      title: 'Website URL',
      type: 'url',
      description: 'Primary website URL',
    }),
    defineField({
      name: 'logo',
      title: 'Logo URL',
      type: 'url',
      description: 'URL to organization logo (or will use uploaded logo)',
    }),
    defineField({
      name: 'foundingDate',
      title: 'Founding Date',
      type: 'date',
    }),
    defineField({
      name: 'founders',
      title: 'Founders',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'name', title: 'Name', type: 'string' },
            { name: 'url', title: 'Profile URL', type: 'url' },
          ],
        },
      ],
    }),
    defineField({
      name: 'contactEmail',
      title: 'Contact Email',
      type: 'string',
    }),
    defineField({
      name: 'sameAs',
      title: 'Social Profiles',
      type: 'array',
      of: [{ type: 'url' }],
      description: 'Links to social profiles (Twitter, LinkedIn, GitHub, etc.)',
    }),
  ],
})

export const softwareApplicationData = defineType({
  name: 'softwareApplicationData',
  title: 'Software Application Data',
  type: 'object',
  description: 'Schema.org SoftwareApplication data',
  fields: [
    defineField({
      name: 'name',
      title: 'Application Name',
      type: 'string',
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 2,
    }),
    defineField({
      name: 'applicationCategory',
      title: 'Application Category',
      type: 'string',
      options: {
        list: [
          { title: 'Business Application', value: 'BusinessApplication' },
          { title: 'Developer Application', value: 'DeveloperApplication' },
          { title: 'Design Application', value: 'DesignApplication' },
          { title: 'Productivity Application', value: 'ProductivityApplication' },
        ],
      },
      initialValue: 'BusinessApplication',
    }),
    defineField({
      name: 'operatingSystem',
      title: 'Operating System',
      type: 'string',
      initialValue: 'Web Browser',
    }),
    defineField({
      name: 'offers',
      title: 'Pricing',
      type: 'object',
      fields: [
        { name: 'price', title: 'Starting Price', type: 'number' },
        { name: 'priceCurrency', title: 'Currency', type: 'string', initialValue: 'USD' },
        { name: 'priceValidUntil', title: 'Price Valid Until', type: 'date' },
      ],
    }),
  ],
})
