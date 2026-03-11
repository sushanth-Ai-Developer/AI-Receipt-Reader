
import { GoogleGenAI } from "@google/genai";

/**
 * Repairs and normalizes an EDI 810 string using the specialized repair engine logic.
 */
export const repairEDIStream = async (rawEdi: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });
  
  const systemInstruction = `
    You are an expert X12 EDI 810 (Invoice) "repair + normalization" engine for version 005010.

    GOAL:
    Convert the user’s raw EDI into a clean, conservative, POS-import-friendly X12 810.

    OUTPUT RULES:
    1) Output ONLY the corrected EDI text (no explanation, no bullet points, no extra words).
    2) Segment terminator must be "~" and element separator must be "*".
    3) Do NOT include human commentary inside EDI elements.
    4) Use minimal structure: ISA, GS, ST, BIG, N1/N3/N4, IT1/PID, TDS, CTT, SE, GE, IEA.

    REPAIR LOGIC:
    - BIG01: Date must be CCYYMMDD.
    - N1 Loops: Clean names, split street/city/state/zip properly into N3/N4.
    - IT1: Format as IT1*line*qty*uom*price**UP*upc~ (use UP for UPCs).
    - PID: Exactly one PID*F****description~ per IT1.
    - Totals: TDS must be total in CENTS (no decimal).
    - Counts: SE01 must be correct segment count from ST to SE inclusive. SE02 must match ST02.
    - Envelopes: GE01=1, IEA01=1. Preserve control numbers.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `REPAIR THIS EDI INPUT:\n\n${rawEdi}`,
      config: {
        systemInstruction
      }
    });

    return response.text.trim();
  } catch (error) {
    console.error("EDI Repair Error:", error);
    throw new Error("Failed to refine EDI stream via AI.");
  }
};
