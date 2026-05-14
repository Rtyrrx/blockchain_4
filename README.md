# Assignment 4: DAO & On-chain Governance System

This repository contains a full Hardhat implementation of the assignment requirements:

- `contracts/GovernanceToken.sol` with `ERC20Votes` and `ERC20Permit`
- `contracts/TokenVesting.sol` for linear 12-month team vesting
- `contracts/MyGovernor.sol` with OpenZeppelin Governor + Timelock integration
- `contracts/Treasury.sol` and `contracts/Box.sol`
- `test/` with 27 passing tests
- `scripts/deploy.js` and `scripts/verify.js`
- `frontend/index.html` and `frontend/app.js`
- `docs/` with the audit report, research document, execution log, diagram, and manual checklist

## Quick Start

1. Install dependencies:

```powershell
npm install
```

2. Compile and test:

```powershell
npm run compile
npm test
```

3. Run a local node in one terminal:

```powershell
npm run node
```

4. Deploy the full DAO stack from a second terminal:

```powershell
npm run deploy:local
```

5. Serve the frontend from a third terminal:

```powershell
npm run serve:frontend
```

6. Open `http://localhost:8080` in a browser and connect MetaMask.

## Sepolia Deployment

1. Copy `.env.example` to `.env`.
2. Fill in `SEPOLIA_RPC_URL`, `PRIVATE_KEY`, and `ETHERSCAN_API_KEY`.
3. Optionally set:
   - `TEAM_BENEFICIARY`
   - `COMMUNITY_AIRDROP_WALLET`
   - `LIQUIDITY_WALLET`
   - `TREASURY_INITIAL_ETH`

Then run:

```powershell
npm run deploy:sepolia
npm run verify:sepolia
```

Deployment artifacts are written to `deployments/<network>.json`. The deploy script also updates `frontend/config.js`.

## Assignment Mapping

- Part 1: `contracts/GovernanceToken.sol`, `contracts/TokenVesting.sol`, `test/GovernanceToken.test.js`, `test/TokenVesting.test.js`, `docs/token-distribution-diagram.md`
- Part 2: `contracts/MyGovernor.sol`, OpenZeppelin `TimelockController`, `test/GovernanceLifecycle.test.js`, `docs/governance-execution-log.md`
- Part 3: `contracts/Treasury.sol`, `contracts/Box.sol`, `test/GovernanceLifecycle.test.js`
- Part 4: `frontend/index.html`, `frontend/app.js`
- Part 5: `scripts/deploy.js`, `scripts/verify.js`, `docs/security-audit-report.md`, `docs/deployment-checklist.md`
- Part 6: `docs/dao-governance-research.md`
- Part 7: `docs/manual-submission-steps.md`
