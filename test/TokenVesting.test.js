const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");

const { deployDaoFixture } = require("./helpers/daoFixture");

describe("TokenVesting", function () {
  async function fixture() {
    return loadFixture(deployDaoFixture);
  }

  it("stores the vesting beneficiary and start timestamp", async function () {
    const { vesting, teamBeneficiary, vestingStart } = await fixture();

    expect(await vesting.beneficiary()).to.equal(teamBeneficiary.address);
    expect(await vesting.startTimestamp()).to.equal(vestingStart);
  });

  it("has no releasable tokens before vesting starts", async function () {
    const { vesting, token } = await fixture();

    expect(await vesting.releasable(token.target)).to.equal(0n);
  });

  it("releases tokens linearly after half the vesting duration", async function () {
    const { vesting, token, teamBeneficiary, vestingStart } = await fixture();

    const duration = await vesting.VESTING_DURATION();
    await time.increaseTo(vestingStart + Number(duration / 2n) - 1);
    await vesting.release(token.target);

    const expectedHalf = (await token.TEAM_ALLOCATION()) / 2n;
    expect(await token.balanceOf(teamBeneficiary.address)).to.equal(expectedHalf);
    expect(await vesting.released(token.target)).to.equal(expectedHalf);
  });

  it("supports cumulative releases across the schedule", async function () {
    const { vesting, token, teamBeneficiary, vestingStart } = await fixture();

    const duration = await vesting.VESTING_DURATION();
    const quarter = Number(duration / 4n);

    await time.increaseTo(vestingStart + quarter - 1);
    await vesting.release(token.target);

    await time.increaseTo(vestingStart + (quarter * 3) - 1);
    await vesting.release(token.target);

    const expectedReleased = ((await token.TEAM_ALLOCATION()) * 3n) / 4n;
    expect(await token.balanceOf(teamBeneficiary.address)).to.equal(expectedReleased);
    expect(await vesting.released(token.target)).to.equal(expectedReleased);
  });

  it("releases the full amount after the vesting period completes", async function () {
    const { vesting, token, teamBeneficiary, vestingStart } = await fixture();

    const duration = await vesting.VESTING_DURATION();
    await time.increaseTo(vestingStart + Number(duration) + 1);

    await vesting.release(token.target);

    expect(await token.balanceOf(teamBeneficiary.address)).to.equal(await token.TEAM_ALLOCATION());
    expect(await token.balanceOf(vesting.target)).to.equal(0n);
  });

  it("reverts when release is called with nothing vested", async function () {
    const { vesting, token } = await fixture();

    await expect(vesting.release(token.target)).to.be.revertedWith("no tokens due");
  });
});
