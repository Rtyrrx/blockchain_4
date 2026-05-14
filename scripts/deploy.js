const fs = require("fs");
const path = require("path");
const { ethers, network } = require("hardhat");

const ONE_DAY = 24 * 60 * 60;
const TWO_DAYS = 2 * ONE_DAY;

function toSerializable(value) {
  if (typeof value === "bigint") {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return value.map(toSerializable);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, toSerializable(entry)])
    );
  }

  return value;
}

function resolveAddress(envValue, fallbackSigner, deployer) {
  if (envValue) {
    return envValue;
  }

  if (fallbackSigner) {
    return fallbackSigner.address;
  }

  return deployer.address;
}

async function main() {
  const signers = await ethers.getSigners();
  const [deployer, fallbackTeam, fallbackAirdrop, fallbackLiquidity] = signers;

  const teamBeneficiary = resolveAddress(process.env.TEAM_BENEFICIARY, fallbackTeam, deployer);
  const communityAirdrop = resolveAddress(
    process.env.COMMUNITY_AIRDROP_WALLET,
    fallbackAirdrop,
    deployer
  );
  const liquidityWallet = resolveAddress(
    process.env.LIQUIDITY_WALLET,
    fallbackLiquidity,
    deployer
  );

  const latestBlock = await ethers.provider.getBlock("latest");
  const vestingStart = BigInt(latestBlock.timestamp + ONE_DAY);
  const chainId = Number((await ethers.provider.getNetwork()).chainId);

  console.log(`Deploying contracts with ${deployer.address} on ${network.name} (chainId=${chainId})`);

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
  const vesting = await TokenVesting.deploy(teamBeneficiary, vestingStart);
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
    communityAirdrop,
    liquidityWallet
  );
  await token.waitForDeployment();

  const MyGovernor = await ethers.getContractFactory("MyGovernor");
  const governor = await MyGovernor.deploy(token.target, timelock.target);
  await governor.waitForDeployment();

  await (await timelock.grantRole(await timelock.PROPOSER_ROLE(), governor.target)).wait();
  await (await timelock.grantRole(await timelock.CANCELLER_ROLE(), governor.target)).wait();
  await (await timelock.renounceRole(await timelock.DEFAULT_ADMIN_ROLE(), deployer.address)).wait();

  const initialTreasuryEth = ethers.parseEther(process.env.TREASURY_INITIAL_ETH || "0");
  if (initialTreasuryEth > 0n) {
    await (
      await deployer.sendTransaction({
        to: treasury.target,
        value: initialTreasuryEth,
      })
    ).wait();
  }

  const deploymentBlock = await ethers.provider.getBlockNumber();

  const deployment = {
    network: network.name,
    chainId,
    deploymentBlock,
    deployedAt: new Date().toISOString(),
    addresses: {
      deployer: deployer.address,
      teamBeneficiary,
      communityAirdrop,
      liquidityWallet,
      timelock: timelock.target,
      vesting: vesting.target,
      treasury: treasury.target,
      token: token.target,
      governor: governor.target,
      box: box.target,
    },
    constructorArgs: {
      timelock: [TWO_DAYS, [], [ethers.ZeroAddress], deployer.address],
      vesting: [teamBeneficiary, vestingStart],
      treasury: [timelock.target],
      box: [timelock.target],
      token: [vesting.target, treasury.target, communityAirdrop, liquidityWallet],
      governor: [token.target, timelock.target],
    },
  };

  const deploymentDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(deploymentDir, { recursive: true });
  fs.writeFileSync(
    path.join(deploymentDir, `${network.name}.json`),
    JSON.stringify(toSerializable(deployment), null, 2)
  );

  const frontendConfig = `window.DAO_CONFIG = ${JSON.stringify(
    {
      chainId,
      network: network.name,
      deploymentBlock,
      contracts: {
        token: token.target,
        governor: governor.target,
        timelock: timelock.target,
        treasury: treasury.target,
        vesting: vesting.target,
        box: box.target,
      },
    },
    null,
    2
  )};\n`;

  const frontendDir = path.join(__dirname, "..", "frontend");
  fs.mkdirSync(frontendDir, { recursive: true });
  fs.writeFileSync(path.join(frontendDir, "config.js"), frontendConfig);

  console.log("Deployment complete:");
  console.table(deployment.addresses);
  console.log(`Saved deployment to deployments/${network.name}.json`);
  console.log("Updated frontend/config.js");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
