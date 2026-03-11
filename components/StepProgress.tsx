
import React from 'react';
import { ProcessingStep } from '../types';
import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react';

interface StepProgressProps {
  currentStep: ProcessingStep;
  error: string | null;
}

export const StepProgress: React.FC<StepProgressProps> = ({ currentStep, error }) => {
  const steps = [
    // Fix: Using RUNNING_OCR instead of the non-existent SCANNING_BARCODES
    { id: ProcessingStep.RUNNING_OCR, label: 'Barcode Scan' },
    { id: ProcessingStep.UNDERSTANDING_INVOICE, label: 'AI Extraction' },
    { id: ProcessingStep.GENERATING_EDI, label: 'EDI Generation' },
    { id: ProcessingStep.GENERATING_PDF, label: 'Barcode Sheet' }
  ];

  const getStepStatus = (stepId: string) => {
    if (error && currentStep === stepId) return 'error';
    if (currentStep === ProcessingStep.COMPLETED) return 'completed';
    
    const stepOrder = Object.values(ProcessingStep);
    const currentIndex = stepOrder.indexOf(currentStep);
    const stepIndex = stepOrder.indexOf(stepId as ProcessingStep);

    if (currentIndex > stepIndex) return 'completed';
    if (currentIndex === stepIndex) return 'active';
    return 'pending';
  };

  return (
    <div className="space-y-4">
      {steps.map((step, index) => {
        const status = getStepStatus(step.id);
        
        return (
          <div key={index} className="flex items-center space-x-3">
            <div className="relative">
              {status === 'completed' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
              {status === 'active' && <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />}
              {status === 'pending' && <Circle className="w-5 h-5 text-slate-200" />}
              {status === 'error' && <XCircle className="w-5 h-5 text-red-500" />}
            </div>
            <span className={`text-sm font-medium ${
              status === 'active' ? 'text-indigo-600' : 
              status === 'completed' ? 'text-slate-900' : 'text-slate-400'
            }`}>
              {step.label}
            </span>
          </div>
        );
      })}
      
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-xs">
          <strong>Process Failed:</strong> {error}
        </div>
      )}
    </div>
  );
};
