import { z } from "zod";

export const MemoryFileDraftSchema = z
  .object({
    fileName: z.string().min(1).max(200),
    fileType: z.enum(["file", "link"]),
    externalUrl: z.string().url().optional(),
    attachmentIndex: z.number().int().min(0).optional(),
    person: z.object({ id: z.string(), name: z.string() }).optional(),
    personName: z.string().min(1).max(160).optional(),
    work: z.object({ id: z.string(), name: z.string() }).optional(),
    description: z.string().max(2000).optional(),
    category: z
      .enum(["brand_asset", "deliverable", "contract", "screenshot", "other"])
      .default("other"),
  })
  .superRefine((value, ctx) => {
    if (value.fileType === "link" && !value.externalUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Links require an external URL",
        path: ["externalUrl"],
      });
    }
    if (!value.person?.id && !value.personName?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A person or display name is required",
        path: ["personName"],
      });
    }
  });

export type MemoryFileDraft = z.infer<typeof MemoryFileDraftSchema>;

export type SaveMemoryFileResult = {
  fileId: string;
  href: string;
};
