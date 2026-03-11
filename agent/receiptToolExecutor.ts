
import { GoogleGenAI, Type } from "@google/genai";
import { AgentAction, AgentDecision } from "./schema";
import { ReceiptWorkflowState, FileValidationResult } from "./workflowState";
import { extractStitchedInvoiceData } from "../services/geminiService";
import { generateCSVFromData } from "../services/csvService";
import { generateEDI810FromData } from "../services/ediService";
import { repairEDIStream } from "../services/ediRepairService";
import { DocumentResult, DetectedCode } from "../types";

export class ReceiptToolExecutor {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
  }

  async execute(decision: AgentDecision, state: ReceiptWorkflowState): Promise<Partial<ReceiptWorkflowState>> {
    const warnings: string[] = [...state.warnings];

    switch (decision.decision) {
      case AgentAction.VALIDATE_RECEIPT_TYPE: {
        const results: FileValidationResult[] = [];
        const validImages: File[] = [];

        for (const file of state.uploadedImages) {
          try {
            const validation = await this.validateSingleFile(file);
            results.push(validation);
            if (validation.isReceipt) {
              validImages.push(file);
            } else {
              warnings.push(`File "${file.name}" is not a valid receipt and was skipped.`);
            }
          } catch (e) {
            console.error(`Validation failed for ${file.name}:`, e);
            warnings.push(`Could not validate "${file.name}". Skipping for safety.`);
            results.push({
              fileName: file.name,
              isReceipt: false,
              confidence: 0,
              reason: "Validation error occurred.",
              skipped: true,
              classification: "invalid_non_receipt"
            });
          }
        }

        const skippedCount = results.filter(r => !r.isReceipt).length;
        return {
          validationResults: results,
          validImages: validImages,
          warnings,
          skippedFilesMessage: skippedCount > 0 ? `${skippedCount} file(s) were not valid receipts and were skipped.` : undefined,
          userStatusMessage: `Validation complete. ${validImages.length} receipts found.`
        };
      }

      case AgentAction.EXTRACT_STRUCTURED_ITEMS: {
        const targets = state.validImages.length > 0 ? state.validImages : state.uploadedImages;
        try {
          const results = await extractStitchedInvoiceData(targets);
          if (results.length === 0) throw new Error("No receipts were successfully extracted.");
          
          const allLineItems = results.flatMap(r => r.line_items);
          const avgConfidence = results.reduce((acc, r) => acc + r.invoice_identity.confidence_score_0_to_100, 0) / results.length / 100;

          return {
            parsedItems: allLineItems,
            extractionConfidence: avgConfidence,
            userStatusMessage: `Data extraction successful for ${results.length} receipt(s).`,
            metadata: { ...state.metadata, rawResults: results }
          };
        } catch (e) {
          console.error("Extraction failed:", e);
          throw e;
        }
      }

      case AgentAction.GENERATE_EXPORTS: {
        const rawResults: DocumentResult[] = state.metadata.rawResults || [];
        const csvs: string[] = [];
        const edis: string[] = [];
        const allLabels: DetectedCode[] = [];

        for (const result of rawResults) {
          try {
            // 1. Generate CSV
            csvs.push(generateCSVFromData(result));

            // 2. Generate EDI (Draft -> Repair)
            const draftEdi = generateEDI810FromData(result);
            let finalEdi = draftEdi;
            if (draftEdi) {
              try {
                finalEdi = await repairEDIStream(draftEdi);
              } catch (ediRepairError) {
                console.error(`EDI Repair failed for invoice ${result.invoice_identity.invoice_number}:`, ediRepairError);
                warnings.push(`EDI refinement failed for invoice ${result.invoice_identity.invoice_number}. Using draft version.`);
              }
            }
            
            edis.push(finalEdi);
            
            // Store in result for UI binding
            result.exportedFiles = {
              ...result.exportedFiles,
              edi: finalEdi,
              csv: generateCSVFromData(result)
            };

            // 3. Generate Labels
            const labels: DetectedCode[] = result.line_items.map(item => ({
              type: item.code_type || 'UPC-A',
              value: item.code_value || '',
              description: item.description,
              price: typeof item.retail_ssp_msrp === 'number' ? item.retail_ssp_msrp : undefined,
              unit: item.uom_purchased
            }));
            allLabels.push(...labels);

          } catch (exportError) {
            console.error(`Export generation failed for a receipt:`, exportError);
            warnings.push(`Failed to generate some exports for one of the receipts.`);
          }
        }

        return {
          userStatusMessage: "Exports generated successfully.",
          exportedFiles: {
            csv: csvs.join('\n\n---\n\n'),
            edi: edis.join('\n\n'),
            labels: JSON.stringify(allLabels),
            status: "ready"
          },
          warnings
        };
      }

      default:
        return { userStatusMessage: `Action ${decision.decision} executed.` };
    }
  }

  private async validateSingleFile(file: File, isRetry = false): Promise<FileValidationResult> {
    const base64 = await this.fileToBase64(file);
    
    const schema = {
      type: Type.OBJECT,
      properties: {
        isReceipt: { type: Type.BOOLEAN },
        confidence: { type: Type.NUMBER },
        reason: { type: Type.STRING }
      },
      required: ["isReceipt", "confidence", "reason"]
    };

    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{
          role: "user",
          parts: [
            { inlineData: { mimeType: file.type, data: base64 } },
            { text: isRetry 
                ? "RETRY: Your previous response was invalid JSON. Is this a supplier receipt or invoice? Return JSON: { isReceipt: boolean, confidence: number, reason: string }"
                : "Is this a supplier receipt or invoice? Return JSON: { isReceipt: boolean, confidence: number, reason: string }" 
            }
          ]
        }],
        config: { 
          responseMimeType: "application/json",
          responseSchema: schema
        }
      });

      let rawText = response.text;
      if (!rawText) throw new Error("Empty response from AI.");

      rawText = rawText.replace(/```json\n?/, "").replace(/```\n?/, "").trim();

      try {
        const res = JSON.parse(rawText);
        const isReceipt = res.isReceipt && res.confidence > 0.6;
        
        return {
          fileName: file.name,
          isReceipt,
          confidence: res.confidence,
          reason: res.reason,
          skipped: !isReceipt,
          classification: isReceipt ? (res.confidence > 0.9 ? "valid_receipt" : "uncertain") : "invalid_non_receipt"
        };
      } catch (parseError) {
        console.error(`JSON Parse failure for ${file.name}. Raw text:`, rawText);
        if (!isRetry) {
          return this.validateSingleFile(file, true);
        }
        throw parseError;
      }
    } catch (error) {
      if (!isRetry) {
        return this.validateSingleFile(file, true);
      }
      return {
        fileName: file.name,
        isReceipt: false,
        confidence: 0,
        reason: "Validation failed after retry.",
        skipped: true,
        classification: "invalid_non_receipt"
      };
    }
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
    });
  }
}
