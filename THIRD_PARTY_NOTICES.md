# Third-Party Notices

Hecliar was designed after studying the following public projects. No source
code or assets from these projects have been copied into the product at this
stage.

| Project | Repository | License | Use |
| --- | --- | --- | --- |
| Boloney | https://github.com/Kryha/boloney | Apache-2.0 | Conceptual reference for staged onchain bluffing-game flow and public/private state presentation |
| Dily | https://github.com/Tzook/Dily | No license detected | Study-only reference for room and turn event concepts |
| Gathering Gaia | https://github.com/Christdej/gathering-gaia | MIT | Conceptual reference for create/join, bid controls, and round reveal UX |
| Liar's Dice simulator | https://github.com/andrijast/liars-dice | MIT | Conceptual reference for a narrow robot observation/action contract and simulations |
| Inco confidential deck template | https://github.com/Inco-fhevm/confidential-deck-template | Repository metadata had no detected license at study time | Official Inco conceptual reference for private deal, reveal, and attested settlement |

If implementation later adapts code or assets, this file must record the exact
repository, source path, license, modifications, and required attribution.

## Typefaces

The Table Noir redesign ships three typefaces, fetched and self-hosted at build
time by `next/font/google`. All three are licensed under the SIL Open Font
License 1.1, which permits bundling and redistribution with the reserved-name
and same-license conditions. None has been modified.

| Family | Source | License | Use |
| --- | --- | --- | --- |
| Newsreader | https://github.com/productiontype/Newsreader | SIL OFL 1.1 | Display type, `h1`/`h2` only |
| Archivo | https://github.com/Omnibus-Type/Archivo | SIL OFL 1.1 | Interface and body copy |
| IBM Plex Mono | https://github.com/IBM/plex | SIL OFL 1.1 | Machine state, counts, ciphertext handles |

## Official Inco scaffold provenance

`create-inco-app@0.4.0` generated the official EVM Hardhat + RainbowKit
monorepo source used for this baseline on 2026-08-09. The copied generated
paths are `contracts/**` and `frontend/**`; the current CLI placed its local
node compose file at `contracts/docker-compose.yaml`, and this workspace also
retains a root `docker-compose.yaml` copy for the declared workspace shape.

The generated scaffold contains no top-level `LICENSE`, `NOTICE`, or `COPYING`
file. Its `frontend/package.json` declares `MIT`; no scaffold source or assets
were modified beyond the documented workspace integration, testing tooling,
and required `1.0.2` Inco package/image pins.
