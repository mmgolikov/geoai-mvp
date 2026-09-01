import "server-only";

export * from "./candidate-assertion-core";

import { InMemoryCandidateAssertionService } from "./candidate-assertion-core";

/** Server-only singleton. Routes must derive tenant scope and never accept it from clients. */
export const publicPreviewCandidateAssertionService = new InMemoryCandidateAssertionService();
