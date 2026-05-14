const { loadFixture, mine, time } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

const { deployDaoFixture, selfDelegate, delegateTo } = require("./helpers/daoFixture");

describe("GovernanceToken", function () {
  async function fixture() {
    return loadFixture(deployDaoFixture);
  }

  it("mints the full supply with the required initial distribution", async function () {
    const { token, vesting, treasury, airdropWallet, liquidityWallet } = await fixture();

    expect(await token.totalSupply()).to.equal(await token.INITIAL_SUPPLY());
    expect(await token.balanceOf(vesting.target)).to.equal(await token.TEAM_ALLOCATION());
    expect(await token.balanceOf(treasury.target)).to.equal(await token.TREASURY_ALLOCATION());
    expect(await token.balanceOf(airdropWallet.address)).to.equal(await token.COMMUNITY_ALLOCATION());
    expect(await token.balanceOf(liquidityWallet.address)).to.equal(await token.LIQUIDITY_ALLOCATION());
  });

  it("starts with zero voting power until a holder delegates", async function () {
    const { token, airdropWallet } = await fixture();

    expect(await token.getVotes(airdropWallet.address)).to.equal(0n);
  });

  it("tracks self-delegated voting power", async function () {
    const { token, airdropWallet } = await fixture();

    await selfDelegate(token, airdropWallet);

    expect(await token.getVotes(airdropWallet.address)).to.equal(await token.COMMUNITY_ALLOCATION());
    expect(await token.delegates(airdropWallet.address)).to.equal(airdropWallet.address);
  });

  it("lets a delegatee vote on behalf of a delegator", async function () {
    const { token, airdropWallet, delegatee } = await fixture();

    await delegateTo(token, airdropWallet, delegatee);

    expect(await token.getVotes(delegatee.address)).to.equal(await token.COMMUNITY_ALLOCATION());
    expect(await token.getVotes(airdropWallet.address)).to.equal(0n);
  });

  it("preserves past votes through snapshot lookups", async function () {
    const { token, airdropWallet, liquidityWallet } = await fixture();

    await selfDelegate(token, airdropWallet);
    const snapshotBlock = await ethers.provider.getBlockNumber();

    await token.connect(airdropWallet).transfer(liquidityWallet.address, ethers.parseEther("1000"));

    expect(await token.getPastVotes(airdropWallet.address, snapshotBlock)).to.equal(
      await token.COMMUNITY_ALLOCATION()
    );
    expect(await token.getVotes(airdropWallet.address)).to.equal(
      (await token.COMMUNITY_ALLOCATION()) - ethers.parseEther("1000")
    );
  });

  it("moves delegated voting power when tokens are transferred", async function () {
    const { token, airdropWallet, liquidityWallet } = await fixture();

    await selfDelegate(token, airdropWallet);
    await selfDelegate(token, liquidityWallet);

    await token.connect(airdropWallet).transfer(liquidityWallet.address, ethers.parseEther("2500"));

    expect(await token.getVotes(airdropWallet.address)).to.equal(
      (await token.COMMUNITY_ALLOCATION()) - ethers.parseEther("2500")
    );
    expect(await token.getVotes(liquidityWallet.address)).to.equal(
      (await token.LIQUIDITY_ALLOCATION()) + ethers.parseEther("2500")
    );
  });

  it("supports EIP-2612 permit approvals", async function () {
    const { token, airdropWallet, delegatee } = await fixture();

    const deadline = (await time.latest()) + 3600;
    const chainId = (await ethers.provider.getNetwork()).chainId;
    const nonceBefore = await token.nonces(airdropWallet.address);
    const amount = ethers.parseEther("1234");

    const domain = {
      name: await token.name(),
      version: "1",
      chainId,
      verifyingContract: token.target,
    };

    const types = {
      Permit: [
        { name: "owner", type: "address" },
        { name: "spender", type: "address" },
        { name: "value", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    };

    const values = {
      owner: airdropWallet.address,
      spender: delegatee.address,
      value: amount,
      nonce: nonceBefore,
      deadline,
    };

    const signature = await airdropWallet.signTypedData(domain, types, values);
    const { v, r, s } = ethers.Signature.from(signature);

    await token.permit(airdropWallet.address, delegatee.address, amount, deadline, v, r, s);

    expect(await token.allowance(airdropWallet.address, delegatee.address)).to.equal(amount);
    expect(await token.nonces(airdropWallet.address)).to.equal(nonceBefore + 1n);
  });

  it("updates checkpoints when a holder changes delegate", async function () {
    const { token, airdropWallet, delegatee, againstVoter } = await fixture();

    await delegateTo(token, airdropWallet, delegatee);
    await delegateTo(token, airdropWallet, againstVoter);

    expect(await token.getVotes(delegatee.address)).to.equal(0n);
    expect(await token.getVotes(againstVoter.address)).to.equal(await token.COMMUNITY_ALLOCATION());
    expect(await token.delegates(airdropWallet.address)).to.equal(againstVoter.address);
  });
});
