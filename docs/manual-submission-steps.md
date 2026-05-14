# Manual Submission Steps

This file lists the parts that still require your direct action because they depend on your wallet, browser, screenshots, or testnet account.

## What Is Already Done

- Contracts are implemented.
- Deployment and verification scripts are written.
- Frontend is implemented.
- `27` automated tests pass.
- Security audit report is drafted.
- Research document is drafted.
- Deployment checklist is prepared.
- Token distribution diagram is prepared.

## What You Must Still Do

### 1. Take Screenshots

Follow `docs/governance-execution-log.md` exactly and capture the listed screenshots.

Minimum screenshot set:

1. Hardhat node running
2. Deployment addresses
3. Wallet connected in the frontend
4. Delegation transaction
5. Active proposals list
6. Vote transaction
7. Proposal results after voting ends
8. Proposal queued
9. Proposal executed
10. `Box.retrieve() = 42`
11. Treasury transfer recipient balance

### 2. Record the Demo Video

Record a `10` to `15` minute video showing:

1. Governance token deployment
2. Initial token distribution
3. Delegation between accounts
4. Proposal creation
5. Voting period and vote casting
6. Queue and timelock delay
7. Execution of treasury transfer
8. Execution of `Box.store(42)`
9. Frontend walkthrough
10. Security audit highlights
11. Gas-cost summary

Suggested structure:

- Minute 1-2: project overview and architecture
- Minute 2-4: deployment and token distribution
- Minute 4-7: delegation and proposal lifecycle
- Minute 7-9: treasury and box execution
- Minute 9-11: frontend features
- Minute 11-13: audit findings and governance risk discussion

### 3. Deploy to Sepolia

1. Create `.env` from `.env.example`.
2. Fill in all environment variables.
3. Run:

```powershell
npm run deploy:sepolia
```

4. Save the generated `deployments/sepolia.json`.

### 4. Verify on Etherscan

Run:

```powershell
npm run verify:sepolia
```

Then open each verified contract page and paste the links into `docs/verified-contract-links.md`.

### 5. Run Final Slither Scan for Submission Evidence

Run:

```powershell
slither . --filter-paths "node_modules|test|artifacts|cache"
```

Take one screenshot of the Slither terminal output or save the output to a text file for the ZIP.

### 6. Zip the Submission

Include:

- `contracts/`
- `test/`
- `scripts/`
- `frontend/`
- `docs/`
- `deployments/`
- `hardhat.config.js`
- `package.json`
- `package-lock.json`
- `.env.example`

Do not include:

- `node_modules/`

## Final Pre-Submission Check

1. `npm test` passes
2. all screenshots are present
3. demo video is exported
4. Sepolia contract links are filled in
5. ZIP file opens correctly
