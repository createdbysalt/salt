"use server";

import { z } from "zod";
import { PLAY_ACTIVITY_CATEGORIES } from "../types";
import { getPlayActivityPage, type PlayActivityPage } from "../queries";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const ActivityPageSchema = z
  .object({
    page: z.number().int().min(1),
    pageSize: z.union([z.literal(25), z.literal(50), z.literal(100)]),
    search: z.string().trim().max(200).optional(),
    categories: z.array(z.enum(PLAY_ACTIVITY_CATEGORIES)).optional(),
    dateFrom: z.string().regex(ISO_DATE).optional(),
    dateTo: z.string().regex(ISO_DATE).optional(),
  })
  .refine((value) => !value.dateFrom || !value.dateTo || value.dateFrom <= value.dateTo, {
    message: "dateFrom must be on or before dateTo",
  });

export async function getActivityPage(input: unknown): Promise<PlayActivityPage> {
  const params = ActivityPageSchema.parse(input);
  return getPlayActivityPage(params);
}
