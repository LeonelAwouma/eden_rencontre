import { config } from 'dotenv';
config();

import '@/ai/flows/generate-profile-description-flow.ts';
import '@/ai/flows/moderate-messages-flow.ts';
import '@/ai/flows/verify-identity-flow.ts';
import '@/ai/flows/generate-blog-ideas-flow.ts';
import '@/ai/flows/generate-message-ideas-flow.ts';
