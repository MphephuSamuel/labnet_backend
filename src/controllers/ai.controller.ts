import { Response } from "express";
import { aiService } from "../services/ai.service";
import { AIChatRequestBody } from "../types/ai";
import { AuthenticatedRequest } from "../types/auth-request";

export const queryAI = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { prompt, messages } = req.body as AIChatRequestBody;

    if (
      (!prompt || prompt.trim().length === 0) &&
      (!messages || messages.length === 0)
    ) {
      return res.status(400).json({
        error: "Prompt or messages are required",
      });
    }

    const result = await aiService.handlePrompt(prompt ?? "", messages ?? []);

    return res.json(result);
  } catch (error) {
    console.error("AI query error:", error);

    return res.status(500).json({
      error: "AI query failed",
    });
  }
};
