# AI Receipt-to-Inventory Agent

An LLM-assisted inventory automation agent that converts supplier receipt images into structured inventory data, POS-compatible EDI files, CSV outputs, and printable barcode/price labels.

## Overview

Convenience stores and small retail operations often receive supplier receipts in paper or photo form and manually enter item details into a POS system. This is slow, repetitive, and prone to errors.

This project automates that workflow by processing uploaded receipt images and generating delivery-ready outputs that help store operators move faster from receipt capture to inventory import.

The application uses an LLM-based decision layer to determine the workflow dynamically based on image quality, completeness, number of uploaded images, and extraction confidence.

Sample receipt files are included in this repository so reviewers can test the application quickly without needing to prepare their own inputs.

## Problem Statement

Turning supplier receipts into inventory-ready digital records is usually a manual, repetitive, and error-prone activity. Store operators often need to read receipt images, identify items, quantities, and prices, manually enter them into a POS system, and then create labels for store operations.

This becomes even more difficult when receipt images are blurry, incomplete, split across multiple photos, or inconsistent in format.

This project solves that problem by introducing an AI-assisted agent that reads receipt images and decides what outputs should be generated and in what sequence.

## Key Features

- Upload one or multiple receipt images
- Validate image quality before extraction
- Detect unclear, incomplete, or partially captured receipts
- Request re-upload when confidence falls below threshold
- Enhance difficult or low-quality receipt images
- Stitch multi-image receipts into a single logical receipt
- Group related images using receipt identifiers and extracted context
- Perform OCR and structured text extraction
- Extract item names, quantities, prices, and totals
- Generate inventory summary
- Produce POS-compatible EDI files
- Export structured output into CSV format
- Generate printable barcode and price labels
- LLM-driven orchestration for non-deterministic control flow

## How the Agent Works

This application is built as an agentic workflow rather than a fixed sequential pipeline.

Depending on the uploaded receipt images, the LLM decides:
- whether the image is clear enough for extraction
- whether important receipt sections are missing
- whether the user should be asked to upload the image again
- whether image enhancement is needed before OCR
- whether multiple images belong to the same receipt
- whether images should be stitched together
- whether structured extraction can proceed
- whether outputs should be packaged for export

### Example Decision Flow

1. User uploads one or more receipt images
2. Images are validated for clarity and completeness
3. The LLM evaluates extraction confidence and receipt structure
4. The LLM routes the request to relevant processing steps such as:
   - image validation
   - re-upload handling
   - image enhancement
   - multi-image grouping
   - receipt stitching
   - OCR and line-item extraction
   - EDI generation
   - CSV export
   - label generation
5. Outputs are compiled and made available for download

Because different receipts can trigger different paths, the flow is not rigidly hardcoded.

## Why This Fits the Assignment

This project demonstrates agentic behavior because:
- the workflow is not fixed end-to-end
- the LLM decides the next action based on the uploaded receipt images
- different receipts can trigger different output combinations
- the system dynamically orchestrates multiple downstream processing steps

This makes it more than a simple OCR-based extraction tool. It is an LLM-routed workflow that adapts to the input.

## Example Outputs

- cleaned receipt image
- receipt summary
- extracted itemized inventory data
- POS-compatible EDI file
- CSV export
- printable barcode and price labels

## Sample Inputs

This repository includes sample receipt images for demonstration and testing purposes.

These files help reviewers understand the expected input format and quickly validate the end-to-end workflow of the agent, including:
- image validation
- confidence-based re-upload prompting
- image enhancement
- receipt stitching
- OCR and structured extraction
- EDI generation
- CSV export
- label generation

### Sample Files

- `sample_receipt_1.jpg`
- `sample_receipt_2.jpg`
- `sample_receipt_3.jpg`
- `sample_receipt_4.jpg`
- `sample_receipt_5.jpg`

### How to Use the Sample Files

1. Launch the application
2. Upload one or more files from the `samples/receipts/` folder
3. Click **Generate**
4. Review the generated outputs

## Tech Stack

Update this section to match your actual implementation.

Example stack:
- Python
- FastAPI or Flask
- OpenAI, Azure OpenAI, or Gemini
- LangChain or LangGraph
- OCR engine
- OpenCV or Pillow
- Pandas
- Barcode or label generation tools
- React, Next.js, or Streamlit
- Docker
