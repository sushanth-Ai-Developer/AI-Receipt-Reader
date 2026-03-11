
import { LineItem } from "../types";

/**
 * Per-file validation metadata for multi-image uploads.
 */
export interface FileValidationResult {
  fileName: string;
  isReceipt: boolean;
  confidence: number;
  reason: string;
  skipped: boolean;
  classification: "valid_receipt" | "invalid_non_receipt" | "uncertain";
  error?: string;
}

/**
 * Tracks the full lifecycle of a receipt processing session.
 */
export interface ReceiptWorkflowState {
  session_id: string;
  
  // Input Assets
  uploadedImages: File[];
  validImages: File[]; 
  
  // Validation & Warnings
  validationResults: FileValidationResult[];
  warnings: string[]; 
  skippedFilesMessage?: string;
  batchSummaryMessage?: string;
  
  // Extraction Results
  ocrText?: string;
  parsedItems: LineItem[];
  extractionConfidence: number;
  
  // Final Outputs
  exportedFiles: Record<string, string>;
  
  // Orchestration Metadata
  logs: Array<{
    iteration: number;
    action: string;
    reason: string;
    timestamp: string;
  }>;
  userStatusMessage: string;
  isTerminal: boolean;
  errorMessage?: string;
  
  // Loop Control
  iterationCount: number;
  maxIterations: number;
  
  metadata: Record<string, any>;
}

export const createInitialState = (files: File[], sessionId: string): ReceiptWorkflowState => ({
  session_id: sessionId,
  uploadedImages: files,
  validImages: [],
  validationResults: [],
  warnings: [],
  parsedItems: [],
  extractionConfidence: 0,
  exportedFiles: {},
  logs: [],
  userStatusMessage: "Initializing agent workflow...",
  isTerminal: false,
  iterationCount: 0,
  maxIterations: 10,
  metadata: {}
});
