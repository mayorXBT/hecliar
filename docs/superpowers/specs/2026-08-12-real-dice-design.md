# Real Dice Design

**Goal:** Replace numeric dice labels with consistent, realistic pip dice while preserving Hecliar's confidentiality boundaries.

## Design

- Visible owner and revealed dice use ivory rounded square tiles with dark circular pips.
- Faces 1–6 use the standard physical-die pip arrangements.
- Hidden opponent dice use the same tile silhouette with one centered `?`.
- Hidden dice render exactly `count` question tiles and receive no dice values.
- Each visible die retains an accessible label such as `Die 1: 5`; pips are decorative.
- The hidden tray retains the accessible label `<count> hidden opponent dice`.
- Dice scale responsively using the existing tray layout and retain a restrained raised edge/shadow.

## Component boundary

`DiceTray` owns visibility and iteration. A private `DieTile` presentation component receives either a known `DieFace` or the hidden state. No game logic, transport, storage, or private/public projection changes.

## Acceptance

- Faces 1–6 render 1–6 pip elements with correct positional classes.
- Hidden mode renders one question tile per hidden die and no pip/value information.
- Existing owner/revealed test IDs and accessible labels remain available.
- Existing game-table privacy and action tests pass.
- Frontend typecheck and production build pass.
