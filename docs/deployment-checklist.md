# Deployment Checklist

## Pre-Deployment

1. Review `.env` values:
   - `SEPOLIA_RPC_URL`
   - `PRIVATE_KEY`
   - `ETHERSCAN_API_KEY`
   - `TEAM_BENEFICIARY`
   - `COMMUNITY_AIRDROP_WALLET`
   - `LIQUIDITY_WALLET`
   - `TREASURY_INITIAL_ETH`
2. Confirm the three distribution addresses are correct.
3. Confirm the deployer wallet has enough testnet ETH.
4. Run tests again:

```powershell
npm test
```

5. Run Slither again:

```powershell
slither . --filter-paths "node_modules|test|artifacts|cache"
```

## Deployment Order

The deploy script already follows this order:

1. `TimelockController`
2. `TokenVesting`
3. `Treasury`
4. `Box`
5. `GovernanceToken`
6. `MyGovernor`
7. grant proposer and canceller roles to the governor
8. renounce deployer admin role on the timelock
9. optionally seed the treasury with ETH

## Sepolia Deployment Commands

```powershell
npm run deploy:sepolia
npm run verify:sepolia
```

## Post-Deployment Verification

Check each of the following on Etherscan or in a console:

1. Governor parameters:
   - voting delay = `7200`
   - voting period = `50400`
   - proposal threshold = `1%` of supply
   - quorum = `4%` of supply
2. Timelock delay:
   - `172800` seconds
3. Timelock roles:
   - governor has `PROPOSER_ROLE`
   - governor has `CANCELLER_ROLE`
   - executor role is open to `address(0)`
   - deployer no longer has `DEFAULT_ADMIN_ROLE`
4. Ownership:
   - `Treasury.owner()` equals timelock address
   - `Box.owner()` equals timelock address
5. Distribution:
   - vesting contract holds `400,000 DGT`
   - treasury holds `300,000 DGT`
   - airdrop wallet holds `200,000 DGT`
   - liquidity wallet holds `100,000 DGT`

## Hardhat Console Verification Snippets

```javascript
const deployment = require("./deployments/sepolia.json");
const governor = await ethers.getContractAt("MyGovernor", deployment.addresses.governor);
const timelock = await ethers.getContractAt("@openzeppelin/contracts/governance/TimelockController.sol:TimelockController", deployment.addresses.timelock);
const treasury = await ethers.getContractAt("Treasury", deployment.addresses.treasury);
const box = await ethers.getContractAt("Box", deployment.addresses.box);
const token = await ethers.getContractAt("GovernanceToken", deployment.addresses.token);

await governor.votingDelay();
await governor.votingPeriod();
await governor.proposalThreshold();
await timelock.getMinDelay();
await treasury.owner();
await box.owner();
await token.balanceOf(deployment.addresses.treasury);
```

## Monitoring Plan

Watch these events and metrics after deployment:

### Events

- `ProposalCreated`
- `ProposalQueued`
- `ProposalExecuted`
- `VoteCast`
- `CallScheduled`
- `CallExecuted`
- `ETHTransferred`
- `ERC20Transferred`
- `ValueChanged`

### Metrics

- voter turnout per proposal
- percentage of supply delegated
- concentration of voting power among top delegates
- treasury token balance
- treasury ETH balance
- number of failed proposals
- number of proposals that miss quorum
- average time from proposal creation to execution

## Verified Contract Links

After running verification, paste the links into `docs/verified-contract-links.md`.
