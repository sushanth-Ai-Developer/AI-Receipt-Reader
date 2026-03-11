
export enum AgentAction {
  VALIDATE_RECEIPT_TYPE = "VALIDATE_RECEIPT_TYPE",
  ENHANCE_IMAGE = "ENHANCE_IMAGE",
  STITCH_IMAGES = "STITCH_IMAGES",
  PROCEED_TO_OCR = "PROCEED_TO_OCR",
  EXTRACT_STRUCTURED_ITEMS = "EXTRACT_STRUCTURED_ITEMS",
  GENERATE_EXPORTS = "GENERATE_EXPORTS",
  REQUEST_REUPLOAD = "REQUEST_REUPLOAD",
  STOP_WITH_REASON = "STOP_WITH_REASON",
  NOTIFY_NOT_A_RECEIPT = "NOTIFY_NOT_A_RECEIPT"
}

export interface AgentDecision {
  decision: AgentAction;
  confidence: number;
  reason: string;
  next_step: string;
  allow_export: boolean;
  needs_user_action: boolean;
}
