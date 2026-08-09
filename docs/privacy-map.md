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
