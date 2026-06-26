'use server';
/**
 * @fileOverview This file implements a Genkit flow for moderating user messages.
 *
 * - moderateMessage - A function that moderates message content for external links or personal contact information.
 * - ModerateMessageInput - The input type for the moderateMessage function.
 * - ModerateMessageOutput - The return type for the moderateMessage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ModerateMessageInputSchema = z.object({
  messageText: z
    .string()
    .describe(
      'The text content of the message to be moderated. The system should prevent the sharing of external links or personal contact numbers.'
    ),
});
export type ModerateMessageInput = z.infer<typeof ModerateMessageInputSchema>;

const ModerateMessageOutputSchema = z.object({
  isModerated: z
    .boolean()
    .describe(
      'True if the message contains external links, personal contact numbers (phone or email), or other sensitive information that should be blocked; false otherwise.'
    ),
  moderationReason: z
    .string()
    .describe(
      'If isModerated is true, this field provides the reason for moderation (e.g., "Message contains an external link.", "Message contains a personal contact number."). Empty string if isModerated is false.'
    ),
  suggestedAction: z
    .enum(['BLOCK', 'ALLOW'])
    .describe(
      'The suggested action based on moderation. "BLOCK" if the message should be prevented from being sent, "ALLOW" otherwise.'
    ),
});
export type ModerateMessageOutput = z.infer<
  typeof ModerateMessageOutputSchema
>;

export async function moderateMessage(
  input: ModerateMessageInput
): Promise<ModerateMessageOutput> {
  return moderateMessagesFlow(input);
}

const moderateMessagesPrompt = ai.definePrompt({
  name: 'moderateMessagesPrompt',
  input: {schema: ModerateMessageInputSchema},
  output: {schema: ModerateMessageOutputSchema},
  prompt: `You are an AI assistant designed to moderate messages in a Christian dating platform to prevent the sharing of external links or personal contact numbers (phone numbers or email addresses) during initial conversations.

Analyze the following message for any instances of external links (URLs), phone numbers, or email addresses. It is crucial to protect users from potential scammers.

If the message contains any of these, set 'isModerated' to true, provide a specific 'moderationReason', and set 'suggestedAction' to "BLOCK".
If the message is safe and does not contain any such information, set 'isModerated' to false, 'moderationReason' to an empty string, and 'suggestedAction' to "ALLOW".

Here is the message:

{{{messageText}}}
`,
});

const moderateMessagesFlow = ai.defineFlow(
  {
    name: 'moderateMessagesFlow',
    inputSchema: ModerateMessageInputSchema,
    outputSchema: ModerateMessageOutputSchema,
  },
  async input => {
    const {output} = await moderateMessagesPrompt(input);
    return output!;
  }
);
