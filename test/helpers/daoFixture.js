const { time } = require("@nomicfoundation/hardhat-network-helpers");
const { ethers } = require("hardhat");

const ONE_DAY = 24 * 60 * 60;
const TWO_DAYS = 2 * ONE_DAY;

async function deployDaoFixture() {
  const [
    deployer,
    teamBeneficiary,
    airdropWallet,
    liquidityWallet,
    treasuryRecipient,
    delegatee,
    againstVoter,
    abstainVoter,
    ethRecipient,
  ] = await ethers.getSigners();

  const vestingStart = (await time.latest()) + ONE_DAY;

  const TimelockController = await ethers.getContractFactory(
    "@openzeppelin/contracts/governance/TimelockController.sol:TimelockController"
  );
  const timelock = await TimelockController.deploy(
    TWO_DAYS,
    [],
    [ethers.ZeroAddress],
    deployer.address
  );
  await timelock.waitForDeployment();

  const TokenVesting = await ethers.getContractFactory("TokenVesting");
  const vesting = await TokenVesting.deploy(teamBeneficiary.address, vestingStart);
  await vesting.waitForDeployment();

  const Treasury = await ethers.getContractFactory("Treasury");
  const treasury = await Treasury.deploy(timelock.target);
  await treasury.waitForDeployment();

  const Box = await ethers.getContractFactory("Box");
  const box = await Box.deploy(timelock.target);
  await box.waitForDeployment();

  const GovernanceToken = await ethers.getContractFactory("GovernanceToken");
  const token = await GovernanceToken.deploy(
    vesting.target,
    treasury.target,
    airdropWallet.address,
    liquidityWallet.address
  );
  await token.waitForDeployment();

  const MyGovernor = await ethers.getContractFactory("MyGovernor");
  const governor = await MyGovernor.deploy(token.target, timelock.target);
  await governor.waitForDeployment();

  await timelock.grantRole(await timelock.PROPOSER_ROLE(), governor.target);
  await timelock.grantRole(await timelock.CANCELLER_ROLE(), governor.target);
  await timelock.renounceRole(await timelock.DEFAULT_ADMIN_ROLE(), deployer.address);

  await deployer.sendTransaction({
    to: treasury.target,
    value: ethers.parseEther("5"),
  });

  return {
    deployer,
    teamBeneficiary,
    airdropWallet,
    liquidityWallet,
    treasuryRecipient,
    delegatee,
    againstVoter,
    abstainVoter,
    ethRecipient,
    vestingStart,
    token,
    vesting,
    timelock,
    treasury,
    box,
    governor,
    constants: {
      ONE_DAY,
      TWO_DAYS,
    },
  };
}

async function selfDelegate(token, signer) {
  await token.connect(signer).delegate(signer.address);
}

async function delegateTo(token, signer, delegatee) {
  await token.connect(signer).delegate(delegatee.address);
}

module.exports = {
  deployDaoFixture,
  selfDelegate,
  delegateTo,
};
