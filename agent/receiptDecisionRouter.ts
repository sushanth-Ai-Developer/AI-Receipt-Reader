
import { GoogleGenAI } from "@google/genai";
import { ReceiptWorkflowState } from "./workflowState";
import { AgentDecision, AgentAction } from "./schema";
import { ROUTER_SYSTEM_PROMPT, USER_STATE_TEMPLATE } from "./prompts";

export class ReceiptDecisionRouter {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
  }

  async getDecision(state: ReceiptWorkflowState): Promise<AgentDecision> {
    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: "user", parts: [{ text: USER_STATE_TEMPLATE(state) }] }],
        config: {
          systemInstruction: ROUTER_SYSTEM_PROMPT,
          responseMimeType: "application/json",
          temperature: 0
        }
      });

      const decision: AgentDecision = JSON.parse(response.text);
      return this.validateDecision(decision);
    } catch (error) {
      console.error("Router Error:", error);
      return {
        decision: AgentAction.STOP_WITH_REASON,
        confidence: 0,
        reason: "Internal routing error.",
        next_step: "none",
        allow_export: false,
        needs_user_action: true
      };
    }
  }

  private validateDecision(decision: any): AgentDecision {
    if (!Object.values(AgentAction).includes(decision.decision)) {
      decision.decision = AgentAction.STOP_WITH_REASON;
    }
    return {
      decision: decision.decision,
      confidence: decision.confidence ?? 0.5,
      reason: decision.reason ?? "No reason provided",
      next_step: decision.next_step ?? "unknown",
      allow_export: !!decision.allow_export,
      needs_user_action: !!decision.needs_user_action
    };
  }
}
