export const manifest = Object.freeze({
  version: "v4",
  promptVersion: "v4.0-draft.1",
  status: "draft",
  runnable: true,
  intendedPredecessor: "v3",
  derivedFromImplementedVersion: "v3",
  evidenceBasis:
    "User-provided product principles and five qualitative interview findings; no beta feedback supplied.",
  validationStatus: "mock_contract_tests_only",
  syntheticPersonasAllowed: true,
  blockers: Object.freeze([
    "Live validation requires a configured model provider.",
    "Not yet beta-feedback-driven; real participant feedback is being collected per version and has not been analysed.",
  ]),
} as const);
