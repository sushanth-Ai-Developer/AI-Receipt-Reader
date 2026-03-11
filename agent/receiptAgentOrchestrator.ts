
import { ReceiptWorkflowState, createInitialState } from "./workflowState";
import { ReceiptDecisionRouter } from "./receiptDecisionRouter";
import { ReceiptToolExecutor } from "./receiptToolExecutor";
import { AgentAction } from "./schema";

export class ReceiptAgentOrchestrator {
  private router: ReceiptDecisionRouter;
  private executor: ReceiptToolExecutor;

  constructor() {
    this.router = new ReceiptDecisionRouter();
    this.executor = new ReceiptToolExecutor();
  }

  async start(files: File[], sessionId: string, onUpdate: (state: ReceiptWorkflowState) => void): Promise<ReceiptWorkflowState> {
    let state = createInitialState(files, sessionId);
    onUpdate(state);

    while (!state.isTerminal) {
      if (state.iterationCount >= state.maxIterations) {
        state.isTerminal = true;
        state.errorMessage = "Processing timeout.";
        break;
      }

      try {
        const decision = await this.router.getDecision(state);
        
        state.logs.push({
          iteration: state.iterationCount,
          action: decision.decision,
          reason: decision.reason,
          timestamp: new Date().toISOString()
        });

        if (decision.decision === AgentAction.NOTIFY_NOT_A_RECEIPT) {
          state.isTerminal = true;
          state.userStatusMessage = "No valid receipt images were found.";
          onUpdate(state);
          break;
        }

        if ([AgentAction.STOP_WITH_REASON, AgentAction.REQUEST_REUPLOAD].includes(decision.decision)) {
          state.isTerminal = true;
          state.userStatusMessage = decision.reason;
          onUpdate(state);
          break;
        }

        const updates = await this.executor.execute(decision, state);
        state = {
          ...state,
          ...updates,
          iterationCount: state.iterationCount + 1
        };

        onUpdate(state);

        if (decision.decision === AgentAction.GENERATE_EXPORTS) {
          state.isTerminal = true;
          onUpdate(state);
          break;
        }
      } catch (error) {
        console.error("Orchestrator Loop Error:", error);
        state.warnings.push(`Error in ${state.iterationCount}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        state.iterationCount++;
        onUpdate(state);
        
        if (state.iterationCount >= state.maxIterations) {
          state.isTerminal = true;
          state.errorMessage = "Max iterations reached after errors.";
          onUpdate(state);
          break;
        }
      }
    }

    return state;
  }
}
