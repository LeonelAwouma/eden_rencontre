'use server';
/**
 * @fileOverview A Genkit flow to assist users in generating a refined and faith-aligned profile description.
 *
 * - generateProfileDescription - A function that generates a profile description based on user's faith profile.
 * - GenerateProfileDescriptionInput - The input type for the generateProfileDescription function.
 * - GenerateProfileDescriptionOutput - The return type for the generateProfileDescription function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateProfileDescriptionInputSchema = z.object({
  denomination: z
    .string()
    .describe(
      'The user\'s Christian denomination (e.g., Catholique, Protestant, Évangélique, Baptiste, etc.).'
    ),
  practice: z
    .string()
    .describe(
      'Details about the user\'s religious practice, such as church attendance frequency or involvement in ministries (e.g., chorale, ministry, etc.).'
    ),
  visionOfHome: z
    .string()
    .describe(
      'The user\'s vision for the home and family, including aspects like children\'s education and the role of prayer.'
    ),
});
export type GenerateProfileDescriptionInput = z.infer<
  typeof GenerateProfileDescriptionInputSchema
>;

const GenerateProfileDescriptionOutputSchema = z.object({
  description: z.string().describe('The generated faith-aligned profile description.'),
});
export type GenerateProfileDescriptionOutput = z.infer<
  typeof GenerateProfileDescriptionOutputSchema
>;

export async function generateProfileDescription(
  input: GenerateProfileDescriptionInput
): Promise<GenerateProfileDescriptionOutput> {
  return generateProfileDescriptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateProfileDescriptionPrompt',
  input: { schema: GenerateProfileDescriptionInputSchema },
  output: { schema: GenerateProfileDescriptionOutputSchema },
  prompt: `You are an AI writing assistant for Eden Rencontre, a premium Christian matchmaking platform dedicated to helping African and diaspora Christians build faith-centered marriages. Your task is to help a user write a heartfelt, sincere, and biblically-aligned profile description.

Based on the following information provided by the user:
- Christian denomination: {{{denomination}}}
- Religious practice: {{{practice}}}
- Vision for the home and family: {{{visionOfHome}}}

Write a warm, authentic, and faith-aligned profile description of 3-4 sentences that:
1. Reflects the person's spiritual identity and Christian commitment.
2. Shares their vision for a God-honoring marriage and family.
3. Is written in the first person, in a respectful and welcoming tone.
4. Is suitable for a serious Christian audience seeking a life partner.

Output only the profile description, without any title or preamble.`,
});

const generateProfileDescriptionFlow = ai.defineFlow(
  {
    name: 'generateProfileDescriptionFlow',
    inputSchema: GenerateProfileDescriptionInputSchema,
    outputSchema: GenerateProfileDescriptionOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);