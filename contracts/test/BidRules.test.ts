import { expect } from "chai";
import hre from "hardhat";

describe("BidRules", function () {
  it("accepts only the PRD ordering", async function () {
    const harness = await hre.viem.deployContract("BidRulesHarness");

    expect(await harness.read.isHigher([2, 5, 2, 6])).to.equal(true);
    expect(await harness.read.isHigher([2, 5, 3, 1])).to.equal(true);
    expect(await harness.read.isHigher([2, 5, 2, 5])).to.equal(false);
    expect(await harness.read.isHigher([2, 5, 2, 4])).to.equal(false);
  });

  it("accepts only quantities and faces inside the match bounds", async function () {
    const harness = await hre.viem.deployContract("BidRulesHarness");

    expect(await harness.read.isInBounds([1, 1, 4])).to.equal(true);
    expect(await harness.read.isInBounds([8, 6, 4])).to.equal(true);
    expect(await harness.read.isInBounds([0, 1, 4])).to.equal(false);
    expect(await harness.read.isInBounds([9, 1, 4])).to.equal(false);
    expect(await harness.read.isInBounds([1, 0, 4])).to.equal(false);
    expect(await harness.read.isInBounds([1, 7, 4])).to.equal(false);
  });
});
