# Hecliar Bounded Automatic Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make automatic Robot and challenge-settlement failures retry idempotently exactly once, then stop in a stable safe-exit state without awarding a false round or entering a retry loop.

**Architecture:** `MatchLifecycle` records an attempt count and lifecycle state per public action-sequence key. `scheduled` and `in-flight` states suppress duplicates; the first failure becomes `retryable` only after authoritative refresh, and a second failure becomes `exhausted`, blocks further scheduling, and exposes only a safe new-match exit. Successful actions remain deduplicated.

**Tech Stack:** React 19, TypeScript, Vitest, React Testing Library, the existing `GameGateway` and `MatchScreen` lifecycle.

## Global Constraints

- The approved source of truth is `docs/superpowers/specs/2026-08-09-hecliar-mvp-design.md`.
- “Robot failure retries idempotently once and then allows a safe exit without awarding a false round.”
- Retry is exposed only after authoritative refresh.
- Pending actions disable duplicates.
- Failed actions never overwrite newer authoritative state.
- No production behavior may be written before a focused test has failed for the expected reason.
- Any unexpected failure must follow `superpowers:systematic-debugging` before a fix is proposed or implemented.
- The retry mechanism must not reveal or persist dice, gadget assignment, gadget target, or Scanner result.

---

## Planned File Structure

```text
frontend/
├── components/game/MatchScreen.tsx   bounded automatic-attempt state and safe-exit UI
└── test/MatchScreen.test.tsx         Robot and settlement retry-budget behavior
```

### Task 1: Bound Automatic Robot and Settlement Recovery

**Files:**
- Modify: `frontend/components/game/MatchScreen.tsx`
- Test: `frontend/test/MatchScreen.test.tsx`

**Interfaces:**
- Consumes: `GameGateway.requestRobotAction(matchId, expectedSequence)` and `GameGateway.settleChallenge(matchId, expectedSequence)`.
- Produces: exactly two automatic calls per unchanged failing sequence (initial attempt plus one retry), followed by a stable safe-exit notice; successful/in-flight calls remain deduplicated.

- [ ] **Step 1: Write failing persistent-Robot recovery test**

Add a focused test beside the existing transient retry test:

```tsx
it("retries a persistently failing Robot action once, then stops with a safe exit", async () => {
  vi.useFakeTimers();
  vi.spyOn(Math, "random").mockReturnValue(0);
  const requestRobotAction = vi.fn().mockRejectedValue(new Error("transport unavailable"));
  render(<MatchScreen
    gateway={gateway({
      getPublicMatch: vi.fn(async () => publicView({ activeSeat: 1 })),
      requestRobotAction,
    })}
    rawMatchId="1"
  />);
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });

  await act(async () => {
    await vi.advanceTimersByTimeAsync(800);
    await vi.advanceTimersByTimeAsync(800);
    await vi.advanceTimersByTimeAsync(8_000);
  });

  expect(requestRobotAction).toHaveBeenCalledTimes(2);
  expect(screen.getByRole("alert")).toHaveTextContent("could not continue after one retry");
  expect(screen.getByRole("link", { name: "Start a new match" })).toBeVisible();
  expect(screen.queryByRole("button", { name: "Refresh table" })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the Robot test to verify RED**

Run:

```powershell
npm --workspace frontend test -- MatchScreen.test.tsx -t "persistently failing Robot"
```

Expected: FAIL because `requestRobotAction` is called more than twice and no stable safe-exit notice appears.

- [ ] **Step 3: Write failing persistent-settlement recovery test**

Add the equivalent branch test using a `resolving-challenge` public projection:

```tsx
it("retries a persistently failing settlement once, then stops without scoring", async () => {
  vi.useFakeTimers();
  const settleChallenge = vi.fn().mockRejectedValue(new Error("verification unavailable"));
  render(<MatchScreen
    gateway={gateway({
      getPublicMatch: vi.fn(async () => publicView({
        status: "resolving-challenge",
        score: [0, 0],
      })),
      settleChallenge,
    })}
    rawMatchId="1"
  />);
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });

  await act(async () => {
    await vi.advanceTimersByTimeAsync(700);
    await vi.advanceTimersByTimeAsync(700);
    await vi.advanceTimersByTimeAsync(7_000);
  });

  expect(settleChallenge).toHaveBeenCalledTimes(2);
  expect(screen.getByRole("alert")).toHaveTextContent("could not continue after one retry");
  expect(screen.getByLabelText("Score you 0, robot 0")).toBeVisible();
  expect(screen.queryByRole("button", { name: "Refresh table" })).not.toBeInTheDocument();
});
```

- [ ] **Step 4: Run the settlement test to verify RED**

Run:

```powershell
npm --workspace frontend test -- MatchScreen.test.tsx -t "persistently failing settlement"
```

Expected: FAIL because the unchanged resolving sequence continues to schedule attempts.

- [ ] **Step 5: Implement the minimal bounded-attempt state**

In `MatchLifecycle`, replace the success-only `Set` with a per-sequence state map, a retry-revision state that deliberately re-runs the scheduling effect after a failed attempt has finished, and an explicit terminal safe-exit flag:

```tsx
type AutomaticAttempt = {
  attempts: number;
  state: "scheduled" | "in-flight" | "retryable" | "succeeded" | "exhausted";
};

const automaticAttempts = useRef(new Map<string, AutomaticAttempt>());
const [automaticRevision, setAutomaticRevision] = useState(0);
const [automaticSafeExit, setAutomaticSafeExit] = useState(false);
```

Before scheduling either automatic branch, share this gate:

```tsx
const prior = automaticAttempts.current.get(attemptKey);
if (prior && prior.state !== "retryable") return;
const attempts = prior?.attempts ?? 0;
if (attempts >= 2) return;
automaticAttempts.current.set(attemptKey, {
  attempts: attempts + 1,
  state: "scheduled",
});
```

Make `runAction` return whether the authoritative action and refresh succeeded:

```tsx
const runAction = useCallback(async (
  label: string,
  work: () => Promise<void>,
  options: { clearPrivate?: boolean; refreshPrivate?: boolean } = {},
): Promise<boolean> => {
  if (pendingRef.current || recoveryRequiredRef.current) return false;
  pendingRef.current = label;
  setPendingAction(label);
  setError(null);
  if (options.clearPrivate) setPrivateSnapshot(null);
  try {
    await work();
    await refresh(options.refreshPrivate ?? true);
    setRecovery(false);
    return true;
  } catch {
    try {
      await refresh(true);
      setRecovery(false);
      setError("That action did not go through. The table was refreshed and is ready to retry.");
    } catch {
      setRecovery(true);
      setError("That action failed and the table could not be refreshed. Refresh before retrying.");
    }
    return false;
  } finally {
    pendingRef.current = null;
    setPendingAction(null);
  }
}, [refresh, setRecovery]);
```

At timer execution, change the matching `scheduled` record to `in-flight` before calling the gateway. After completion, retain success, make only the first failure retryable, and exhaust the second:

```tsx
const scheduled = automaticAttempts.current.get(attemptKey);
if (!scheduled || scheduled.state !== "scheduled") return;
automaticAttempts.current.set(attemptKey, {
  ...scheduled,
  state: "in-flight",
});

const succeeded = await runAction(label, work, options);
const completed = automaticAttempts.current.get(attemptKey);
if (!completed) return;
if (succeeded) {
  automaticAttempts.current.set(attemptKey, {
    ...completed,
    state: "succeeded",
  });
} else if (completed.attempts < 2) {
  automaticAttempts.current.set(attemptKey, {
    ...completed,
    state: "retryable",
  });
  setAutomaticRevision((revision) => revision + 1);
} else {
  automaticAttempts.current.set(attemptKey, {
    ...completed,
    state: "exhausted",
  });
  setAutomaticSafeExit(true);
  setRecovery(true);
  setError(`${label} could not continue after one retry. Start a new match safely.`);
}
```

Include `automaticRevision` in the automatic scheduling effect dependencies. The first failure finishes its authoritative refresh, changes the record from `in-flight` to `retryable`, and increments the revision so the unchanged sequence schedules count `2`. The second failure sets `exhausted`, `automaticSafeExit`, and `recoveryRequired`, so effects stop and controls remain stable. At no point can a render while an action is `scheduled` or `in-flight` reserve the second attempt concurrently.

Update `RecoveryNotice` with an `allowRefresh` boolean and hide its refresh button when the automatic retry budget is exhausted:

```tsx
{allowRefresh && (
  <button
    className="secondary-action"
    type="button"
    disabled={refreshing}
    onClick={onRefresh}
  >
    Refresh table
  </button>
)}
```

Pass `allowRefresh={!automaticSafeExit}`. The existing “Start a new match” link remains the safe exit. Do not change scores or call settlement locally.

- [ ] **Step 6: Run focused recovery tests to verify GREEN**

Run:

```powershell
npm --workspace frontend test -- MatchScreen.test.tsx
```

Expected: all `MatchScreen` tests PASS, including successful automatic progression, transient failure then success, persistent Robot failure, and persistent settlement failure.

- [ ] **Step 7: Run full affected verification**

Run:

```powershell
npm --workspace frontend test
npm --workspace frontend run lint
npm --workspace frontend exec tsc -- --noEmit
npm --workspace frontend run build
git diff --check
```

Expected: all tests, lint, typecheck, build, and whitespace validation exit `0`. Existing environment warnings must be recorded separately and must not be represented as pristine output.

- [ ] **Step 8: Commit**

```powershell
git add frontend/components/game/MatchScreen.tsx frontend/test/MatchScreen.test.tsx
git commit -m "fix: bound automatic match recovery"
```
