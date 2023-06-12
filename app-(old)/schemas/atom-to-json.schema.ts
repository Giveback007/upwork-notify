import { z } from 'zod';

export const entrySchema = z.object({
  id: z.string(),
  title: z.string(),
  updated: z.string(),
  link: z.string(),
  summary: z.string(),
  content: z.string(),
});

export const atomFeedToJSONSchema = z.object({
  id: z.string(),
  title: z.string(),
  author: z.object({
    name: z.string(),
    email: z.string(),
  }),
  updated: z.string(),
  link: z.string(),
  subtitle: z.string(),
  rights: z.string(),
  logo: z.string(),
  generator: z.string(),
  entry: z.array(entrySchema),
});

export type AtomFeedToJSON = z.infer<typeof atomFeedToJSONSchema>;
