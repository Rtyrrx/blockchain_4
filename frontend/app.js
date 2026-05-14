const tokenAbi = [
  "function balanceOf(address) view returns (uint256)",
  "function getVotes(address) view returns (uint256)",
  "function delegates(address) view returns (address)",
  "function delegate(address delegatee)",
  "function symbol() view returns (string)",
];

const governorAbi = [
  "function state(uint256 proposalId) view returns (uint8)",
  "function proposalVotes(uint256 proposalId) view returns (uint256 againstVotes, uint256 forVotes, uint256 abstainVotes)",
  "function proposalSnapshot(uint256 proposalId) view returns (uint256)",
  "function proposalDeadline(uint256 proposalId) view returns (uint256)",
  "function quorum(uint256 timepoint) view returns (uint256)",
  "function castVote(uint256 proposalId, uint8 support) returns (uint256)",
  "event ProposalCreated(uint256 proposalId, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 voteStart, uint256 voteEnd, string description)",
];

const stateNames = [
  "Pending",
  "Active",
  "Canceled",
  "Defeated",
  "Succeeded",
  "Queued",
  "Expired",
  "Executed",
];

const ui = {
  connectButton: document.getElementById("connectButton"),
  refreshButton: document.getElementById("refreshButton"),
  networkLabel: document.getElementById("networkLabel"),
  walletAddress: document.getElementById("walletAddress"),
  tokenBalance: document.getElementById("tokenBalance"),
  votingPower: document.getElementById("votingPower"),
  delegateAddress: document.getElementById("delegateAddress"),
  delegateInput: document.getElementById("delegateInput"),
  delegateButton: document.getElementById("delegateButton"),
  delegateStatus: document.getElementById("delegateStatus"),
  proposalList: document.getElementById("proposalList"),
};

const daoConfig = window.DAO_CONFIG || {};
let browserProvider;
let signer;
let account;
let token;
let governor;

function formatAddress(address) {
  if (!address || address === ethers.ZeroAddress) {
    return "Not delegated";
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatTokenAmount(value) {
  return Number(ethers.formatUnits(value, 18)).toLocaleString(undefined, {
    maximumFractionDigits: 4,
  });
}

function setStatus(element, message, isError = false) {
  element.textContent = message;
  element.style.color = isError ? "var(--danger)" : "var(--muted)";
}

function requireConfig() {
  const contracts = daoConfig.contracts || {};
  return Boolean(contracts.token && contracts.governor);
}

async function initContracts() {
  token = new ethers.Contract(daoConfig.contracts.token, tokenAbi, signer);
  governor = new ethers.Contract(daoConfig.contracts.governor, governorAbi, signer);
}

async function connectWallet() {
  if (!window.ethereum) {
    setStatus(ui.delegateStatus, "MetaMask is required to use this dashboard.", true);
    return;
  }

  if (!requireConfig()) {
    setStatus(
      ui.delegateStatus,
      "Run the deployment script first so frontend/config.js contains real contract addresses.",
      true
    );
    return;
  }

  browserProvider = new ethers.BrowserProvider(window.ethereum);
  await browserProvider.send("eth_requestAccounts", []);

  signer = await browserProvider.getSigner();
  account = await signer.getAddress();
  const connectedNetwork = await browserProvider.getNetwork();

  if (Number(connectedNetwork.chainId) !== Number(daoConfig.chainId)) {
    setStatus(
      ui.delegateStatus,
      `Connected to chain ${connectedNetwork.chainId}. Switch MetaMask to chain ${daoConfig.chainId}.`,
      true
    );
  } else {
    setStatus(ui.delegateStatus, "Wallet connected.");
  }

  ui.networkLabel.textContent = `Network: ${daoConfig.network} (chainId ${connectedNetwork.chainId})`;
  ui.walletAddress.textContent = account;
  ui.connectButton.textContent = "Wallet Connected";

  await initContracts();
  await Promise.all([refreshAccountData(), loadProposals()]);
}

async function refreshAccountData() {
  if (!token || !account) {
    return;
  }

  const [balance, votes, delegateAddress, symbol] = await Promise.all([
    token.balanceOf(account),
    token.getVotes(account),
    token.delegates(account),
    token.symbol(),
  ]);

  ui.tokenBalance.textContent = `${formatTokenAmount(balance)} ${symbol}`;
  ui.votingPower.textContent = `${formatTokenAmount(votes)} votes`;
  ui.delegateAddress.textContent = `Delegate: ${formatAddress(delegateAddress)}${
    delegateAddress && delegateAddress !== ethers.ZeroAddress ? ` (${delegateAddress})` : ""
  }`;
}

async function handleDelegate() {
  if (!token || !account) {
    setStatus(ui.delegateStatus, "Connect your wallet first.", true);
    return;
  }

  const delegatee = ui.delegateInput.value.trim();
  if (!ethers.isAddress(delegatee)) {
    setStatus(ui.delegateStatus, "Enter a valid delegate address.", true);
    return;
  }

  setStatus(ui.delegateStatus, "Submitting delegation transaction...");

  try {
    const tx = await token.delegate(delegatee);
    await tx.wait();
    setStatus(ui.delegateStatus, `Delegation confirmed: ${tx.hash}`);
    await refreshAccountData();
  } catch (error) {
    setStatus(ui.delegateStatus, error.shortMessage || error.message, true);
  }
}

async function castVote(proposalId, support) {
  if (!governor) {
    setStatus(ui.delegateStatus, "Connect your wallet first.", true);
    return;
  }

  setStatus(ui.delegateStatus, `Submitting vote for proposal ${proposalId}...`);

  try {
    const tx = await governor.castVote(proposalId, support);
    await tx.wait();
    setStatus(ui.delegateStatus, `Vote confirmed: ${tx.hash}`);
    await Promise.all([refreshAccountData(), loadProposals()]);
  } catch (error) {
    setStatus(ui.delegateStatus, error.shortMessage || error.message, true);
  }
}

async function loadProposals() {
  if (!governor || !browserProvider) {
    return;
  }

  const currentBlock = await browserProvider.getBlockNumber();
  const fromBlock = Math.max(Number(daoConfig.deploymentBlock || 0), currentBlock - 50000);
  const events = await governor.queryFilter(governor.filters.ProposalCreated(), fromBlock, currentBlock);

  if (events.length === 0) {
    ui.proposalList.innerHTML = '<div class="empty">No proposal events found yet.</div>';
    return;
  }

  const cards = await Promise.all(
    events
      .slice()
      .reverse()
      .map(async (event) => {
        const proposalId = event.args.proposalId.toString();
        const state = Number(await governor.state(event.args.proposalId));
        const stateName = stateNames[state] || `Unknown (${state})`;
        const snapshot = await governor.proposalSnapshot(event.args.proposalId);
        const deadline = await governor.proposalDeadline(event.args.proposalId);
        const quorum = await governor.quorum(snapshot);
        const votes = await governor.proposalVotes(event.args.proposalId);
        const isActive = stateName === "Active";
        const resultMarkup =
          stateName === "Pending" || stateName === "Active"
            ? ""
            : `
              <div class="proposal-results">
                <div>For: ${formatTokenAmount(votes.forVotes)}</div>
                <div>Against: ${formatTokenAmount(votes.againstVotes)}</div>
                <div>Abstain: ${formatTokenAmount(votes.abstainVotes)}</div>
                <div>Quorum: ${formatTokenAmount(quorum)}</div>
              </div>
            `;

        const voteButtons = isActive
          ? `
            <div class="vote-row">
              <button class="vote-against" data-proposal-id="${proposalId}" data-support="0">Vote Against</button>
              <button class="vote-for" data-proposal-id="${proposalId}" data-support="1">Vote For</button>
              <button class="vote-abstain" data-proposal-id="${proposalId}" data-support="2">Abstain</button>
            </div>
          `
          : "";

        return `
          <article class="proposal">
            <div class="proposal-head">
              <h3 class="proposal-title">${event.args.description || "Untitled proposal"}</h3>
              <span class="badge">${stateName}</span>
            </div>
            <div class="proposal-meta">
              <div class="mono">Proposal ID: ${proposalId}</div>
              <div class="mono">Proposer: ${event.args.proposer}</div>
              <div class="mono">Snapshot block: ${snapshot.toString()} | Deadline block: ${deadline.toString()}</div>
            </div>
            ${resultMarkup}
            ${voteButtons}
          </article>
        `;
      })
  );

  ui.proposalList.innerHTML = cards.join("");

  ui.proposalList.querySelectorAll("[data-proposal-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      const proposalId = button.getAttribute("data-proposal-id");
      const support = Number(button.getAttribute("data-support"));
      await castVote(proposalId, support);
    });
  });
}

ui.connectButton.addEventListener("click", connectWallet);
ui.refreshButton.addEventListener("click", loadProposals);
ui.delegateButton.addEventListener("click", handleDelegate);

if (window.ethereum) {
  window.ethereum.on("accountsChanged", () => window.location.reload());
  window.ethereum.on("chainChanged", () => window.location.reload());
}
