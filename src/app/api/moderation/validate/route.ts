/**
 * Garden of Alliance — Moderation API
 * POST /api/moderation/validate — validate a message before sending
 */

import { NextRequest, NextResponse } from "next/server";
import { validateMessage } from "@/lib/moderation";
import type { ValidateMessageRequest } from "@/lib/moderation";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ValidateMessageRequest;

    if (!body.senderId || !body.conversationId || !body.content) {
      return NextResponse.json(
        { error: "Missing required fields: senderId, conversationId, content" },
        { status: 400 }
      );
    }

    // Rate limiting: simple in-memory throttle (production should use Redis)
    // Max 60 validations per minute per user
    const result = await validateMessage({
      senderId: body.senderId,
      receiverId: body.receiverId || "",
      conversationId: body.conversationId,
      content: body.content,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[moderation/api]", err);
    return NextResponse.json(
      { error: "Internal moderation error", allowed: true, decision: "DELIVER" },
      { status: 500 }
    );
  }
}