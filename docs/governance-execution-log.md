# Governance Execution Log

This file is the step-by-step execution script for the screenshot deliverable. It is written for a local Hardhat demonstration because that is the fastest way to produce clean evidence.

## Goal

Capture screenshots for:

1. Token deployment and distribution
2. Vote delegation
3. Proposal creation
4. Active voting
5. Proposal queued in timelock
6. Proposal executed
7. Treasury transfer success
8. `Box.store(42)` success

## Terminal 1: Start Local Chain

```powershell
cd c:\Blockchain4
npm run node
```

Screenshot to take:

- Hardhat node running
- Default local accounts visible

## Terminal 2: Deploy Contracts

```powershell
cd c:\Blockchain4
npm run deploy:local
```

Screenshot to take:

- Deployment table with `timelock`, `token`, `governor`, `treasury`, and `box` addresses

## Terminal 3: Start Frontend

```powershell
cd c:\Blockchain4
npm run serve:frontend
```

Open `http://localhost:8080`.

## MetaMask Setup

1. Add a custom network:
   - Network name: `Hardhat Local`
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Currency symbol: `ETH`
2. Import the Hardhat accounts you want to use from the private keys shown in Terminal 1.
3. Import at least:
   - Community airdrop account
   - Liquidity account
4. Connect MetaMask to the frontend.

Screenshots to take:

- Connected wallet on the dashboard
- Token balance, voting power, and delegate address fields

## Create Demo Proposals

Open a fourth terminal:

```powershell
cd c:\Blockchain4
npx hardhat console --network localhost
```

Paste the following block:

```javascript
const deployment = require("./deployments/localhost.json");
const [deployer, team, airdrop, liquidity, recipient] = await ethers.getSigners();
const token = await ethers.getContractAt("GovernanceToken", deployment.addresses.token);
const governor = await ethers.getContractAt("MyGovernor", deployment.addresses.governor);
const treasury = await ethers.getContractAt("Treasury", deployment.addresses.treasury);
const box = await ethers.getContractAt("Box", deployment.addresses.box);

await token.connect(airdrop).delegate(airdrop.address);
await network.provider.send("evm_mine");

const transferDescription = "Transfer governance tokens from the treasury";
const transferCalldata = treasury.interface.encodeFunctionData("sendERC20", [
  token.target,
  recipient.address,
  ethers.parseEther("1500")
]);

const boxDescription = "Store 42 in Box";
const boxCalldata = box.interface.encodeFunctionData("store", [42]);

await governor.connect(airdrop).propose(
  [treasury.target],
  [0],
  [transferCalldata],
  transferDescription
);

await governor.connect(airdrop).propose(
  [box.target],
  [0],
  [boxCalldata],
  boxDescription
);
```

Screenshot to take:

- Console showing successful proposal creation transactions

## Move Proposals to Active State

In the same console:

```javascript
await network.provider.send("hardhat_mine", ["0x1c21"]);
```

This mines `7201` blocks so proposals move from `Pending` to `Active`.

Refresh the frontend.

Screenshots to take:

- Proposal cards visible on the frontend
- Proposal state displayed as `Active`
- Vote buttons visible

## Delegate and Vote

1. In MetaMask, stay connected as the community airdrop account.
2. In the frontend delegate box, enter the same address or another delegate address and click `Delegate`.
3. Cast a `For` vote on the transfer proposal.
4. Cast a `For` vote on the `Box.store(42)` proposal.

Screenshots to take:

- Successful delegation transaction
- Successful vote transaction hash
- Proposal cards after voting

## End Voting Period

Back in the Hardhat console:

```javascript
await network.provider.send("hardhat_mine", ["0xc4e1"]);
```

This mines `50401` blocks so the voting period ends.

Now queue both proposals:

```javascript
const transferHash = ethers.id(transferDescription);
const boxHash = ethers.id(boxDescription);

await governor.queue([treasury.target], [0], [transferCalldata], transferHash);
await governor.queue([box.target], [0], [boxCalldata], boxHash);
```

Screenshots to take:

- Console showing queue transactions
- Frontend showing proposal results after voting ends

## Advance Timelock and Execute

In the Hardhat console:

```javascript
await network.provider.send("evm_increaseTime", [2 * 24 * 60 * 60 + 1]);
await network.provider.send("evm_mine");

await governor.execute([treasury.target], [0], [transferCalldata], transferHash);
await governor.execute([box.target], [0], [boxCalldata], boxHash);

await box.retrieve();
await token.balanceOf(recipient.address);
```

Expected result:

- `box.retrieve()` returns `42`
- `recipient` balance increases by `1500 DGT`

Screenshots to take:

- Console showing execution transactions
- Console showing `42`
- Console showing recipient token balance

## Suggested Screenshot Filenames

- `01-hardhat-node.png`
- `02-contract-deployment.png`
- `03-wallet-connected.png`
- `04-delegation.png`
- `05-proposals-active.png`
- `06-vote-transaction.png`
- `07-proposal-results.png`
- `08-proposal-queued.png`
- `09-proposal-executed.png`
- `10-box-value-42.png`
- `11-treasury-transfer-success.png`
