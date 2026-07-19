import { localCreate, localGet, localList, localUpdate } from "@/src/lib/repositories/local-json-store";
import {
  pilotWorkflowCaveat,
  type ClientInputItem,
  type PilotDeliverableStatus,
  type PilotWorkflow
} from "@/src/types/pilot-workflow";

const workflowStore = "pilot-workflows";
const clientInputStore = "pilot-client-inputs";
const deliverableStore = "pilot-deliverables";

type WorkflowInput = Omit<PilotWorkflow, "caveat"> & { caveat?: string };
type ClientInputInput = Omit<ClientInputItem, "caveat"> & { caveat?: string };
type DeliverableInput = Omit<PilotDeliverableStatus, "caveat"> & { caveat?: string };

export async function listPilotWorkflows(filters: { projectId?: string | null; projectKey?: string | null; limit?: number } = {}) {
  return localList<PilotWorkflow>(workflowStore, filters);
}

export async function createPilotWorkflow(input: WorkflowInput) {
  return localCreate<PilotWorkflow>(workflowStore, {
    ...input,
    caveat: input.caveat ?? pilotWorkflowCaveat
  });
}

export async function updatePilotWorkflow(id: string, patch: Partial<PilotWorkflow>) {
  return localUpdate<PilotWorkflow>(workflowStore, id, {
    ...patch,
    caveat: patch.caveat ?? pilotWorkflowCaveat
  });
}

export async function listPilotClientInputs(filters: { projectId?: string | null; projectKey?: string | null; limit?: number } = {}) {
  return localList<ClientInputItem>(clientInputStore, filters);
}

export async function getPilotClientInput(id: string) {
  return localGet<ClientInputItem>(clientInputStore, id);
}

export async function createPilotClientInput(input: ClientInputInput) {
  return localCreate<ClientInputItem>(clientInputStore, {
    ...input,
    caveat: input.caveat ?? pilotWorkflowCaveat
  });
}

export async function updatePilotClientInput(id: string, patch: Partial<ClientInputItem>) {
  return localUpdate<ClientInputItem>(clientInputStore, id, {
    ...patch,
    caveat: patch.caveat ?? pilotWorkflowCaveat
  });
}

export async function listPilotDeliverables(filters: { projectId?: string | null; projectKey?: string | null; limit?: number } = {}) {
  return localList<PilotDeliverableStatus>(deliverableStore, filters);
}

export async function getPilotDeliverable(id: string) {
  return localGet<PilotDeliverableStatus>(deliverableStore, id);
}

export async function createPilotDeliverable(input: DeliverableInput) {
  return localCreate<PilotDeliverableStatus>(deliverableStore, {
    ...input,
    caveat: input.caveat ?? pilotWorkflowCaveat
  });
}

export async function updatePilotDeliverable(id: string, patch: Partial<PilotDeliverableStatus>) {
  return localUpdate<PilotDeliverableStatus>(deliverableStore, id, {
    ...patch,
    caveat: patch.caveat ?? pilotWorkflowCaveat
  });
}
