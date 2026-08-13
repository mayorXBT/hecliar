/**
 * The attestation packing now lives in @hecliar/game-logic so the browser, the
 * contract tests and the end-to-end scripts share one implementation. Keeping
 * two hand-synced copies of the code that decides which signed values get
 * submitted for on-chain verification was a bug waiting to happen.
 *
 * Re-exported here so existing imports keep working.
 */
export {
  nonZero,
  packSettlement,
  toFixed12,
  withCovalidatorRetry,
  ZERO_HANDLE,
  type Attestation,
  type ChallengeHandles,
  type ChallengeSettlement,
} from "@hecliar/game-logic";
