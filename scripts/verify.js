const fs = require("fs");
const path = require("path");
const { network, run } = require("hardhat");

function readDeployment(networkName) {
  const filePath = path.join(__dirname, "..", "deployments", `${networkName}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing deployment file: ${filePath}. Run the deploy script first.`);
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

async function verifyContract(address, constructorArguments, contractName) {
  try {
    await run("verify:verify", {
      address,
      constructorArguments,
    });
    console.log(`Verified ${contractName}: ${address}`);
  } catch (error) {
    const message = error.message || String(error);
    if (message.includes("Already Verified")) {
      console.log(`${contractName} already verified: ${address}`);
      return;
    }

    throw error;
  }
}

async function main() {
  const deployment = readDeployment(network.name);

  await verifyContract(
    deployment.addresses.timelock,
    deployment.constructorArgs.timelock,
    "TimelockController"
  );
  await verifyContract(
    deployment.addresses.vesting,
    deployment.constructorArgs.vesting,
    "TokenVesting"
  );
  await verifyContract(
    deployment.addresses.treasury,
    deployment.constructorArgs.treasury,
    "Treasury"
  );
  await verifyContract(
    deployment.addresses.box,
    deployment.constructorArgs.box,
    "Box"
  );
  await verifyContract(
    deployment.addresses.token,
    deployment.constructorArgs.token,
    "GovernanceToken"
  );
  await verifyContract(
    deployment.addresses.governor,
    deployment.constructorArgs.governor,
    "MyGovernor"
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
