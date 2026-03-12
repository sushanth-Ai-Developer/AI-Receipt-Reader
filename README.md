# AI Receipt-to-Inventory Agent

An LLM-controlled inventory automation agent that converts supplier receipt images into structured inventory data, POS-compatible exports, EDI outputs, CSV files, and printable barcode/price labels.

## Overview

Convenience stores and small retail operations often receive supplier receipts in paper or photo form and manually enter item details into a POS system. This is slow, repetitive, and prone to errors.

This project automates that workflow by processing uploaded receipt images and generating inventory-ready outputs that help store operators move faster from receipt capture to structured import.

The application uses an **LLM-controlled orchestration layer** rather than a fixed sequential pipeline. Instead of blindly processing every upload the same way, the model evaluates the workflow state and decides what should happen next, such as validating whether a file is actually a receipt, skipping invalid files, extracting good receipts, and generating downstream outputs.

Sample receipt files are included in this repository so reviewers can test the application quickly without needing to prepare their own inputs.

## Problem Statement

Turning supplier receipts into inventory-ready digital records is usually a manual, repetitive, and error-prone activity. Store operators often need to:
- read supplier receipts manually
- identify items, quantities, and prices
- enter them into a POS or inventory system
- create labels or downstream files
- deal with blurry images, mixed batches, and unrelated uploads

This project solves that problem by introducing an AI-assisted receipt-processing agent that validates uploaded files, processes valid receipts, skips invalid inputs safely, and generates structured outputs for downstream operational use.

## Key Features

- Upload one or multiple receipt images
- Validate whether each uploaded file is actually a receipt
- Skip invalid or non-receipt files safely
- Mixed-batch support for valid and invalid uploads
- Image quality evaluation before processing
- Re-upload request for poor or incomplete receipt images
- Per-file receipt processing to reduce truncation risk and improve reliability
- OCR and structured receipt extraction
- Extract item names, quantities, prices, totals, and header details
- Generate inventory summary
- Generate CSV export
- Generate EDI output from structured receipt data
- Generate printable barcode / price labels
- Persistent warnings for skipped files and file-level failures
- LLM-controlled orchestration for non-deterministic control flow
- Agent reasoning / workflow status visibility

## How the Agent Works

This application is built as an **agentic workflow** rather than a fixed sequential pipeline.

Depending on the uploaded files and current workflow state, the LLM decides:
- whether each uploaded file is actually a receipt
- whether invalid files should be skipped
- whether the batch contains valid receipts worth processing
- whether image enhancement or retry behavior is needed
- whether extraction should proceed
- whether outputs should be generated
- whether the workflow should stop safely with a reason

### Example Decision Flow

1. User uploads one or more files
2. Each file is validated to determine whether it is a receipt
3. Invalid files are skipped with warnings
4. Valid receipt files continue into extraction
5. Receipts are processed one at a time for more reliable extraction
6. Structured inventory data is generated
7. CSV, EDI, and labels are created for successful receipts
8. The user reviews outputs and warnings

Because different uploads can trigger different paths, the workflow is not rigidly hardcoded.

## Why This Fits the Assignment

This project demonstrates agentic behavior because:
- the workflow is not fixed end-to-end
- the LLM decides the next action based on uploaded input and workflow state
- different inputs trigger different paths
- invalid uploads are rejected or skipped safely
- mixed batches are handled selectively
- exports are generated only for successful receipt extractions

This makes it more than a simple OCR utility. It is an LLM-routed receipt automation workflow that adapts to the input.

## Example Outputs

- receipt validation result
- skipped-file warnings
- receipt summary
- extracted itemized inventory data
- CSV export
- EDI output
- printable barcode and price labels

## Sample Inputs

This repository includes sample receipt images and supporting QA material for demonstration and testing purposes.

These files help reviewers understand the expected input format and quickly validate the end-to-end workflow of the agent, including:
- receipt validation
- mixed-batch handling
- OCR and structured extraction
- CSV generation
- EDI generation
- label generation
- skipped invalid file warnings

### Sample Files

- `sample_receipt_1.jpg`
- `sample_receipt_2.jpg`
- `sample_receipt_3.jpg`
- `sample_receipt_4.jpg`
- `sample_receipt_5.jpg`

### QA Report

- `qa_report_ai_receipt_inventory_manager.pdf`

### How to Use the Sample Files

1. Launch the application
2. Upload one or more files from the `samples/receipts/` folder
3. Click **Generate**
4. Review the generated outputs, warnings, and exports

### Note

The sample receipt images and QA document are included only for demonstration purposes. Any sensitive or vendor-specific information should be removed or anonymized before sharing.

## Practical Use Case

This project is designed for convenience stores and similar retail environments where supplier receipts are still received as paper slips or image captures and inventory entry is largely manual.

By converting receipt images into structured digital outputs, the application helps reduce manual effort, improve consistency, and accelerate downstream POS / inventory workflows.

## Tech Stack

### Frontend
- React
- TypeScript
- Vite
- HTML5
- CSS3
- Responsive Web UI

### AI / LLM Layer
- Google Gemini
- `@google/genai`
- Gemini Flash family
- LLM-controlled orchestration
- Structured JSON extraction
- Prompt-engineered validation and routing
- AI-assisted EDI refinement / repair

### Agent Architecture
- Agentic orchestration pattern
- Receipt decision router
- Tool executor
- Workflow state management
- Per-file validation results
- Persistent warnings and audit trail

### Receipt / Inventory Processing
- Receipt validation
- Per-file receipt classification
- Mixed-batch handling
- Image resizing / preprocessing
- OCR and structured receipt extraction
- One-file-at-a-time extraction flow
- Inventory data normalization
- Code / UPC validation
- Numeric and pricing normalization

### Export / Output
- CSV generation
- EDI 810 generation
- EDI repair / cleanup
- Barcode / logistics label generation
- Structured downloadable outputs

### Utilities / Validation
- JSON sanitization
- Response schema enforcement
- Error handling and retry logic
- Batch-safe processing
- File-level warning handling

### Application Design
- Modular service-based architecture
- State-driven UI updates
- Backward-compatible UI binding for exports
- Resilient mixed-batch processing
- Per-receipt export handling

### Testing / QA
- Manual testing
- Antigravity QA automation
- Regression testing
- Mixed-batch validation testing
- LLM control-flow validation
- Export validation for CSV / EDI / labels
