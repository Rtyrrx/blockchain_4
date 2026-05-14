# Assignment 4 Report: DAO & On-chain Governance System

## What I Did

In this assignment, I built a full DAO governance project with Hardhat. I tried to make it feel like a real small governance system, not just a few random contracts. The main idea was to create a governance token, connect it to a Governor + Timelock setup, control a treasury on-chain, and then make a small frontend where I could interact with the DAO.

The main smart contracts I wrote are:

- [GovernanceToken.sol](contracts/GovernanceToken.sol)  
  Here I created the ERC-20 governance token. I used `ERC20Votes` so token holders can delegate votes, and I also added `ERC20Permit` for gasless approvals.

- [TokenVesting.sol](contracts/TokenVesting.sol)  
  I used this contract for the team allocation, because the assignment asked for a 12-month linear vesting schedule. So instead of sending team tokens directly, I locked them in this contract and release happens over time.

- [MyGovernor.sol](contracts/MyGovernor.sol)  
  This is the main governance contract. I configured the voting delay, voting period, proposal threshold, quorum, and connected it to the timelock.

- [Treasury.sol](contracts/Treasury.sol)  
  I made this contract to hold DAO funds. It can send ERC-20 tokens, send ETH, and execute controlled calls, but only through the timelock/governance flow.

- [Box.sol](contracts/Box.sol)  
  This is a simple controlled contract. I used it to show that governance can change a value on-chain by calling `store(uint256)` and then checking it with `retrieve()`.

## Token Distribution

For the tokenomics part, I followed the required split:

- 40% for team vesting
- 30% for treasury
- 20% for community airdrop
- 10% for liquidity

This logic is inside [GovernanceToken.sol](contracts/GovernanceToken.sol), and the team part is connected to [TokenVesting.sol](contracts/TokenVesting.sol).

## Governance Flow I Implemented

What I really did here was build the full proposal lifecycle, step by step:

1. create a proposal
2. wait for voting delay
3. cast votes
4. wait for voting period to end
5. queue the proposal in the timelock
6. wait for timelock delay
7. execute the proposal

I tested this flow in two real ways:

- governance transferring tokens from the treasury
- governance calling `Box.store(42)`

The governance logic is in [MyGovernor.sol](contracts/MyGovernor.sol), and the full end-to-end behavior is tested in [GovernanceLifecycle.test.js](test/GovernanceLifecycle.test.js).

## Frontend Part

I also built a minimal frontend so the DAO is not only command-line based. The frontend files are:

- [index.html](frontend/index.html)
- [app.js](frontend/app.js)
- [config.js](frontend/config.js)

In the frontend, I added these features:

- connect wallet with MetaMask
- show token balance
- show voting power
- show delegate address
- delegate votes
- load recent proposals
- cast votes for / against / abstain
- show proposal results after voting

I kept it simple, but I still tried to make it look clean and easy to use.

## Testing I Did

I did not want to leave the contracts untested, so I wrote a full test suite and checked the important governance cases.

The test files are:

- [GovernanceToken.test.js](test/GovernanceToken.test.js)
- [TokenVesting.test.js](test/TokenVesting.test.js)
- [GovernanceLifecycle.test.js](test/GovernanceLifecycle.test.js)
- [daoFixture.js](test/helpers/daoFixture.js)

I tested things like:

- initial token distribution
- self-delegation and delegated voting
- vote snapshots
- permit signature flow
- vesting release logic
- proposal threshold checks
- quorum failure
- defeated proposals
- successful proposal execution
- treasury token transfer
- treasury ETH transfer
- `Box.store(42)` through governance

At the end, I got `27` passing tests.

## Deployment Scripts

To make the project more complete, I also wrote scripts for deployment and verification:

- [deploy.js](scripts/deploy.js)
- [verify.js](scripts/verify.js)

The deploy script sets up the contracts in the correct order and also updates the frontend config. I also saved one local deployment output in [hardhat.json](deployments/hardhat.json).

## Research Part

For the theory/research section of the assignment, I wrote my research report here:

- [dao-governance-research.md](docs/dao-governance-research.md)

In that file, I compared governance models, looked at real DAO examples, explained governance attacks like Beanstalk and Build Finance, and also added a short legal/regulation part.

## What I Learned

This assignment was actually bigger than it first looked. At first I thought it would just be "write a token and a governor", but when I started building, I saw that the hard part is connecting everything correctly:

- token voting power has to work with snapshots
- treasury must be controlled only by the timelock
- governor settings must match the assignment rules
- proposal execution needs both voting and delay logic

I also noticed that governance is not only about code. Even if the contracts are correct, a DAO can still have problems if token power is too concentrated or if people do not participate enough.

## How To Run

If someone wants to test my project locally, these are the main commands:

```powershell
npm install
npm run compile
npm test
```

To run the local setup:

```powershell
npm run node
npm run deploy:local
npm run serve:frontend
```

Then open:

```text
http://localhost:8080
```

## Final Note

So yeah, in this assignment I did not only write contracts. I built the full mini DAO flow: token, vesting, governance, treasury control, frontend interaction, deployment scripts, and testing. I also added the research part to explain the bigger idea behind DAO governance, not just the code side.
