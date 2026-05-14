const { loadFixture, mine, time } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

const { deployDaoFixture, selfDelegate, delegateTo } = require("./helpers/daoFixture");

const ProposalState = {
  Pending: 0,
  Active: 1,
  Canceled: 2,
  Defeated: 3,
  Succeeded: 4,
  Queued: 5,
  Expired: 6,
  Executed: 7,
};

async function propose(governor, proposer, targets, values, calldatas, description) {
  const tx = await governor.connect(proposer).propose(targets, values, calldatas, description);
  await tx.wait();

  return governor.hashProposal(targets, values, calldatas, ethers.id(description));
}

async function moveToActive(governor) {
  await mine(Number(await governor.votingDelay()) + 1);
}

async function movePastDeadline(governor) {
  await mine(Number(await governor.votingPeriod()) + 1);
}

async function queueProposal(governor, proposalId, targets, values, calldatas, description) {
  await governor.queue(targets, values, calldatas, ethers.id(description));
  expect(await governor.state(proposalId)).to.equal(ProposalState.Queued);
}

async function executeProposal(governor, targets, values, calldatas, description) {
  await governor.execute(targets, values, calldatas, ethers.id(description));
}

describe("Governor + Timelock + Treasury", function () {
  async function fixture() {
    return loadFixture(deployDaoFixture);
  }

  it("uses the assignment governance parameters", async function () {
    const { governor, token } = await fixture();
    const currentBlock = await ethers.provider.getBlockNumber();

    expect(await governor.votingDelay()).to.equal(7_200);
    expect(await governor.votingPeriod()).to.equal(50_400);
    expect(await governor.proposalThreshold()).to.equal((await token.totalSupply()) / 100n);
    expect(await governor.quorum(currentBlock - 1)).to.equal((await token.totalSupply() * 4n) / 100n);
  });

  it("configures the timelock so the governor is the proposer", async function () {
    const { timelock, governor, deployer } = await fixture();

    expect(await timelock.getMinDelay()).to.equal(2 * 24 * 60 * 60);
    expect(await timelock.hasRole(await timelock.PROPOSER_ROLE(), governor.target)).to.equal(true);
    expect(await timelock.hasRole(await timelock.CANCELLER_ROLE(), governor.target)).to.equal(true);
    expect(await timelock.hasRole(await timelock.EXECUTOR_ROLE(), ethers.ZeroAddress)).to.equal(true);
    expect(await timelock.hasRole(await timelock.DEFAULT_ADMIN_ROLE(), deployer.address)).to.equal(false);
  });

  it("prevents accounts below the proposal threshold from creating proposals", async function () {
    const { governor, token, delegatee, box } = await fixture();

    await selfDelegate(token, delegatee);
    await mine(1);

    const calldata = box.interface.encodeFunctionData("store", [99]);

    await expect(
      governor.connect(delegatee).propose([box.target], [0], [calldata], "under threshold proposal")
    )
      .to.be.revertedWithCustomError(governor, "GovernorInsufficientProposerVotes");
  });

  it("runs a full governance proposal that transfers treasury tokens", async function () {
    const { governor, token, treasury, airdropWallet, treasuryRecipient, constants } = await fixture();

    await selfDelegate(token, airdropWallet);
    await mine(1);

    const transferAmount = ethers.parseEther("1500");
    const description = "Transfer governance tokens from the treasury";
    const calldata = treasury.interface.encodeFunctionData("sendERC20", [
      token.target,
      treasuryRecipient.address,
      transferAmount,
    ]);

    const proposalId = await propose(
      governor,
      airdropWallet,
      [treasury.target],
      [0],
      [calldata],
      description
    );

    expect(await governor.state(proposalId)).to.equal(ProposalState.Pending);

    await moveToActive(governor);
    expect(await governor.state(proposalId)).to.equal(ProposalState.Active);

    await governor.connect(airdropWallet).castVote(proposalId, 1);
    await movePastDeadline(governor);

    expect(await governor.state(proposalId)).to.equal(ProposalState.Succeeded);

    await queueProposal(governor, proposalId, [treasury.target], [0], [calldata], description);
    await time.increase(constants.TWO_DAYS + 1);

    await executeProposal(governor, [treasury.target], [0], [calldata], description);

    expect(await governor.state(proposalId)).to.equal(ProposalState.Executed);
    expect(await token.balanceOf(treasuryRecipient.address)).to.equal(transferAmount);
  });

  it("lets a delegated address cast a vote with delegated voting power", async function () {
    const { governor, token, airdropWallet, delegatee, box } = await fixture();

    await delegateTo(token, airdropWallet, delegatee);
    await mine(1);

    const description = "Delegatee stores value in box";
    const calldata = box.interface.encodeFunctionData("store", [7]);
    const proposalId = await propose(
      governor,
      delegatee,
      [box.target],
      [0],
      [calldata],
      description
    );

    await moveToActive(governor);
    await governor.connect(delegatee).castVote(proposalId, 1);
    await movePastDeadline(governor);

    const votes = await governor.proposalVotes(proposalId);
    expect(votes.forVotes).to.equal(await token.COMMUNITY_ALLOCATION());
    expect(await governor.state(proposalId)).to.equal(ProposalState.Succeeded);
  });

  it("records proposal results after the vote ends", async function () {
    const { governor, token, airdropWallet, liquidityWallet, box } = await fixture();

    await selfDelegate(token, airdropWallet);
    await selfDelegate(token, liquidityWallet);
    await mine(1);

    const description = "Mixed vote result proposal";
    const calldata = box.interface.encodeFunctionData("store", [55]);
    const proposalId = await propose(
      governor,
      airdropWallet,
      [box.target],
      [0],
      [calldata],
      description
    );

    await moveToActive(governor);
    await governor.connect(airdropWallet).castVote(proposalId, 1);
    await governor.connect(liquidityWallet).castVote(proposalId, 2);
    await movePastDeadline(governor);

    const votes = await governor.proposalVotes(proposalId);
    expect(votes.forVotes).to.equal(await token.COMMUNITY_ALLOCATION());
    expect(votes.abstainVotes).to.equal(await token.LIQUIDITY_ALLOCATION());
    expect(votes.againstVotes).to.equal(0n);
  });

  it("defeats a proposal when quorum is not reached", async function () {
    const { governor, token, liquidityWallet, box } = await fixture();

    await selfDelegate(token, liquidityWallet);
    await mine(1);

    const description = "Quorum failure proposal";
    const calldata = box.interface.encodeFunctionData("store", [1]);
    const proposalId = await propose(
      governor,
      liquidityWallet,
      [box.target],
      [0],
      [calldata],
      description
    );

    await moveToActive(governor);
    await movePastDeadline(governor);

    expect(await governor.state(proposalId)).to.equal(ProposalState.Defeated);
  });

  it("defeats a proposal when against votes exceed for votes", async function () {
    const { governor, token, airdropWallet, liquidityWallet, box } = await fixture();

    await selfDelegate(token, airdropWallet);
    await selfDelegate(token, liquidityWallet);
    await mine(1);

    const description = "Against votes defeat proposal";
    const calldata = box.interface.encodeFunctionData("store", [2]);
    const proposalId = await propose(
      governor,
      liquidityWallet,
      [box.target],
      [0],
      [calldata],
      description
    );

    await moveToActive(governor);
    await governor.connect(liquidityWallet).castVote(proposalId, 0);
    await governor.connect(airdropWallet).castVote(proposalId, 0);
    await movePastDeadline(governor);

    expect(await governor.state(proposalId)).to.equal(ProposalState.Defeated);
  });

  it("queues and executes a governance call that stores 42 in the box", async function () {
    const { governor, token, airdropWallet, box, constants } = await fixture();

    await selfDelegate(token, airdropWallet);
    await mine(1);

    const description = "Store 42 in Box";
    const calldata = box.interface.encodeFunctionData("store", [42]);
    const proposalId = await propose(
      governor,
      airdropWallet,
      [box.target],
      [0],
      [calldata],
      description
    );

    await moveToActive(governor);
    await governor.connect(airdropWallet).castVote(proposalId, 1);
    await movePastDeadline(governor);
    await queueProposal(governor, proposalId, [box.target], [0], [calldata], description);

    await time.increase(constants.TWO_DAYS + 1);
    await executeProposal(governor, [box.target], [0], [calldata], description);

    expect(await box.retrieve()).to.equal(42);
  });

  it("cannot execute a queued proposal before the timelock delay passes", async function () {
    const { governor, token, airdropWallet, box } = await fixture();

    await selfDelegate(token, airdropWallet);
    await mine(1);

    const description = "Too early execution";
    const calldata = box.interface.encodeFunctionData("store", [11]);
    const proposalId = await propose(
      governor,
      airdropWallet,
      [box.target],
      [0],
      [calldata],
      description
    );

    await moveToActive(governor);
    await governor.connect(airdropWallet).castVote(proposalId, 1);
    await movePastDeadline(governor);
    await queueProposal(governor, proposalId, [box.target], [0], [calldata], description);

    await expect(
      executeProposal(governor, [box.target], [0], [calldata], description)
    ).to.be.reverted;
  });

  it("restricts treasury token transfers to the timelock owner", async function () {
    const { treasury, token, airdropWallet, treasuryRecipient } = await fixture();

    await expect(
      treasury.connect(airdropWallet).sendERC20(token.target, treasuryRecipient.address, ethers.parseEther("1"))
    )
      .to.be.revertedWithCustomError(treasury, "OwnableUnauthorizedAccount")
      .withArgs(airdropWallet.address);
  });

  it("restricts box writes to the timelock owner", async function () {
    const { box, airdropWallet } = await fixture();

    await expect(box.connect(airdropWallet).store(5))
      .to.be.revertedWithCustomError(box, "OwnableUnauthorizedAccount")
      .withArgs(airdropWallet.address);
  });

  it("can transfer ETH from the treasury through governance", async function () {
    const { governor, token, airdropWallet, treasury, ethRecipient, constants } = await fixture();

    await selfDelegate(token, airdropWallet);
    await mine(1);

    const transferAmount = ethers.parseEther("1");
    const description = "Send ETH from treasury";
    const calldata = treasury.interface.encodeFunctionData("sendETH", [
      ethRecipient.address,
      transferAmount,
    ]);

    const balanceBefore = await ethers.provider.getBalance(ethRecipient.address);

    const proposalId = await propose(
      governor,
      airdropWallet,
      [treasury.target],
      [0],
      [calldata],
      description
    );

    await moveToActive(governor);
    await governor.connect(airdropWallet).castVote(proposalId, 1);
    await movePastDeadline(governor);
    await queueProposal(governor, proposalId, [treasury.target], [0], [calldata], description);
    await time.increase(constants.TWO_DAYS + 1);
    await executeProposal(governor, [treasury.target], [0], [calldata], description);

    expect(await governor.state(proposalId)).to.equal(ProposalState.Executed);
    expect(await ethers.provider.getBalance(ethRecipient.address)).to.equal(balanceBefore + transferAmount);
  });
});
