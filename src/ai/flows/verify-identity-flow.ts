'use server';
/**
 * @fileOverview This file implements a Genkit flow for AI-powered identity verification.
 *
 * - verifyIdentity - A function that verifies a user's identity by comparing a live photo with an identity document.
 * - VerifyIdentityInput - The input type for the verifyIdentity function.
 * - VerifyIdentityOutput - The return type for the verifyIdentity function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

const VerifyIdentityInputSchema = z.object({
  userPhotoDataUri: z
    .string()
    .describe(
      "A live photo of the user, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  idDocumentDataUri: z
    .string()
    .describe(
      "An image of the user's identity document, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type VerifyIdentityInput = z.infer<typeof VerifyIdentityInputSchema>;

const VerifyIdentityOutputSchema = z.object({
  isVerified: z
    .boolean()
    .describe(
      'True if the person in the user photo matches the person in the identity document.'
    ),
  reason: z
    .string()
    .describe('An explanation for the verification determination.'),
});
export type VerifyIdentityOutput = z.infer<typeof VerifyIdentityOutputSchema>;

export async function verifyIdentity(
  input: VerifyIdentityInput
): Promise<VerifyIdentityOutput> {
  return verifyIdentityFlow(input);
}

const verifyIdentityPrompt = ai.definePrompt({
  name: 'verifyIdentityPrompt',
  input: { schema: VerifyIdentityInputSchema },
  output: { schema: VerifyIdentityOutputSchema },
  prompt: `You are an identity verification expert. Your task is to compare two images:
1. The first image is a live photo of a user.
2. The second image is of their identity document (e.g., passport, driver's license).

Carefully examine both images. Your primary goal is to determine if the person in the live photo is the same person as depicted on the identity document.
Consider facial features, hair, and any distinguishing marks.

Provide your output in JSON format with two fields:
- 'isVerified': a boolean (true if the person in both images appears to be the same, false otherwise).
- 'reason': a string explaining your determination (e.g., "Faces match closely, verification successful." or "Faces do not match, potential discrepancy.").

User's Photo: {{media url=userPhotoDataUri}}
Identity Document: {{media url=idDocumentDataUri}}`,
});

const verifyIdentityFlow = ai.defineFlow(
  {
    name: 'verifyIdentityFlow',
    inputSchema: VerifyIdentityInputSchema,
    outputSchema: VerifyIdentityOutputSchema,
  },
  async (input) => {
    const { output } = await ai.generate({
      model: googleAI.model('gemini-2.5-flash-image'),
      prompt: verifyIdentityPrompt(input),
      config: {
        responseModalities: ['TEXT'], // We only need text output (JSON) for this verification
      },
    });
    if (!output) {
      throw new Error('No output received from identity verification model.');
    }
    return output;
  }
);
