import { z } from 'zod';
import { feedItemSchema } from './feed-item.schema';

export const feedItemParamsSchema = z.object({
    rssUrl: z.string(),
    chatId: z.string(),
    name: z.string(),
    userId: z.string(),

    checkFreq: z.number().optional(),
    items: z.array(feedItemSchema).optional(),
    lastChecked: z.number().optional(),
});
