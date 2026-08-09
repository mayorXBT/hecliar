# Privacy Map

Hecliar uses Inco Lightning's TEE-based confidential compute on EVM. It is not
FHE or zero knowledge. The official `create-inco-app@0.4.0` contracts smoke
scaffold compiled with its generated `@inco/lightning@1.0.0` and
`@inco/lightning-js@1.0.0`; this workspace pins both packages and both matching
local-node images to `1.0.2` as required by the approved design. Docker is not
available in this development environment, so the `1.0.2` local-node lifecycle
is documented but not yet executed here.

| Secret | Authorized before challenge | Public reveal | Publicly verifiable result |
| --- | --- | --- | --- |
| Seat 0 dice | Seat 0 wallet and contract | Both rolls at challenge | Each die attestation is bound to its handle |
| Seat 1/robot dice | Seat 1/robot wallet and contract | Both rolls at challenge | Each die attestation is bound to its handle |
| Gadget assignment | Owner wallet and contract | Never directly | Applied effect code only |
| Gadget target | Owner wallet and contract | Never directly | Applied effect code only |
| Scanner result | Owner wallet and contract | Never | No public result; owner access is checked onchain |
| Effective count | Contract | Challenge settlement | Attestation bound to the computed count handle |

Allowances are irreversible. Every stored handle needs `allowThis`; `e.reveal`
is irreversible; and the robot is never allowed human handles. Settlement
verifies exact handles before scoring. Enabled gadget rounds assign exactly one
confidential gadget to each side.

## Official scaffold provenance and commands

The source of truth is Inco's current [Build a dApp quickstart](https://docs.inco.org/quickstart/build-a-dapp).
The verified CLI version is `create-inco-app@0.4.0`. On Windows, that CLI
accepts a lowercase relative project name rather than the plan's absolute
temporary path, so the following disposable-parent adaptation was used:

```powershell
$incoSmokeParent = Join-Path $env:TEMP "hecliar-inco-smoke-parent-$([guid]::NewGuid().ToString('N'))"
New-Item -ItemType Directory -Path $incoSmokeParent | Out-Null
Push-Location $incoSmokeParent
npx create-inco-app@0.4.0 hecliar-inco-smoke --template contracts --chain evm --framework hardhat --yes --use-npm
$incoSmoke = Join-Path $incoSmokeParent "hecliar-inco-smoke"
npm --prefix $incoSmoke install
npm --prefix $incoSmoke run compile
Pop-Location
```

The generated contracts-only project was located at
`$incoSmokeParent/hecliar-inco-smoke`. Its install and compile were executed;
the compile completed successfully for 66 Solidity files targeting Cancun.

The Docker-dependent commands below are intentionally recorded as **pending —
not executed** because Docker is unavailable in this environment. They must be
run as one lifecycle on a Docker-capable machine:

```powershell
docker compose -f (Join-Path $incoSmoke "docker-compose.yaml") up -d
npm --prefix $incoSmoke test
docker compose -f (Join-Path $incoSmoke "docker-compose.yaml") down
```

The official monorepo was generated in another disposable parent directory:

```powershell
$scaffoldParent = Join-Path $env:TEMP "hecliar-create-inco-app-parent-$([guid]::NewGuid().ToString('N'))"
New-Item -ItemType Directory -Path $scaffoldParent | Out-Null
Push-Location $scaffoldParent
npx create-inco-app@0.4.0 hecliar-create-inco-app --template monorepo --chain evm --framework hardhat --wallet rainbowkit --yes --use-npm
Pop-Location
```

Its generated locations were
`$scaffoldParent/hecliar-create-inco-app/contracts` and
`$scaffoldParent/hecliar-create-inco-app/frontend`. The current CLI places its
compose file at `contracts/docker-compose.yaml`; this workspace retains that
file and a root compose copy for its declared workspace interface.
