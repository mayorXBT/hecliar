import { expect } from "chai";
import { toHex, zeroHash, type Hex } from "viem";
import { packByHandleOrder } from "./helpers/inco";

const handle = (value: number) => toHex(value, { size: 32 });
const signature = (value: number) => new Uint8Array([value]);

describe("Inco test helpers", function () {
  it("preserves fixed zero slots without requiring attestations for them", function () {
    const die = handle(1);
    const effectiveCount = handle(2);
    const packed = packByHandleOrder(
      {
        dice: [die, zeroHash],
        effectiveCount,
        effectCodes: [zeroHash],
      },
      [
        {
          handle: die,
          plaintext: { value: 4n },
          covalidatorSignatures: [signature(1)],
        },
        {
          handle: effectiveCount,
          plaintext: { value: 1n },
          covalidatorSignatures: [signature(2)],
        },
      ],
    );

    expect(packed.dieValues).to.deep.equal([4n, 0n]);
    expect(packed.dieSignatures).to.deep.equal([["0x01"], []]);
    expect(packed.effectiveCount).to.equal(1n);
    expect(packed.effectiveCountSignatures).to.deep.equal(["0x02"]);
    expect(packed.effectCodes).to.deep.equal([0n]);
    expect(packed.effectCodeSignatures).to.deep.equal([[]]);
  });

  it("rejects duplicate nonzero requested handles", function () {
    const duplicated = handle(1);
    expect(() =>
      packByHandleOrder(
        {
          dice: [duplicated, duplicated],
          effectiveCount: handle(2),
          effectCodes: [],
        },
        [],
      ),
    ).to.throw("Duplicate requested handle");
  });

  it("rejects missing, duplicate, unsigned, and unexpected attestations", function () {
    const die = handle(1);
    const effectiveCount = handle(2);
    const handles = {
      dice: [die] as readonly Hex[],
      effectiveCount,
      effectCodes: [] as readonly Hex[],
    };
    const attestation = {
      handle: die,
      plaintext: { value: 4n },
      covalidatorSignatures: [signature(1)],
    };

    expect(() => packByHandleOrder(handles, [attestation])).to.throw(
      "Missing attestation",
    );
    expect(() =>
      packByHandleOrder(handles, [attestation, attestation]),
    ).to.throw("Duplicate attestation");
    expect(() =>
      packByHandleOrder(handles, [
        { ...attestation, covalidatorSignatures: [] },
      ]),
    ).to.throw("Missing signatures");
    expect(() =>
      packByHandleOrder(handles, [
        attestation,
        {
          handle: effectiveCount,
          plaintext: { value: 1n },
          covalidatorSignatures: [signature(2)],
        },
        {
          handle: handle(3),
          plaintext: { value: 1n },
          covalidatorSignatures: [signature(3)],
        },
      ]),
    ).to.throw("unexpected handle");
  });
});
