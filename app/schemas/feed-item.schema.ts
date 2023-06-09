import { z } from 'zod';

const feedItemExtrasSchema = z.object({
    'Posted On': z.string(),
    'Category': z.string(),
    'Country': z.string(),
    'Skills': z.string().optional(),
    'Budget': z.string().optional(),
    'Hourly Range': z.string().optional(),
    'Location Requirement': z.string().optional(),
});

export const feedItemSchema = feedItemExtrasSchema.extend({
    title: z.string(),
    updated: z.string(),
    linkHref: z.string(),
    content: z.string(),
});