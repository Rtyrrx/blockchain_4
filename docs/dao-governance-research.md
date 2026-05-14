# DAO Governance Research

## 1. Governance Models

### Token-Weighted Voting

Token-weighted voting is the default model used by many DAOs. Voting power is proportional to the number of governance tokens a wallet holds or has delegated to it.

Advantages:

- simple to explain and implement
- aligns governance weight with economic exposure
- integrates naturally with on-chain delegation and snapshots
- works well with treasury control, timelocks, and proposal thresholds

Disadvantages:

- whales can dominate outcomes
- apathetic token holders often delegate to a small set of power brokers
- wealth and influence compound over time
- governance may reflect capital allocation more than community legitimacy

For infrastructure protocols, token-weighted voting remains popular because it is legible, auditable, and easy to automate. The tradeoff is that it tends to centralize influence unless the token distribution is broad and delegate culture is healthy.

### Quadratic Voting

Quadratic voting tries to reduce whale dominance by making additional voting power progressively more expensive. In theory, it lets a larger number of smaller holders express strong preferences without being completely overrun by a single capital-rich actor.

Advantages:

- better reflects intensity of preference
- reduces the raw power of large token holders
- can improve legitimacy for community-oriented decisions

Disadvantages:

- difficult to implement safely without sybil resistance
- a user can split holdings across wallets unless identity or anti-sybil layers exist
- more complex to explain and audit than simple token-weighted voting

Quadratic voting is appealing for public-goods or grants governance, but in fully permissionless settings it is much harder to secure than standard token-weighted voting.

### Conviction Voting

Conviction voting measures support over time rather than in a short fixed window. Instead of a simple yes/no vote during a narrow proposal period, influence accumulates continuously as voters signal support.

Advantages:

- rewards persistent support rather than short-lived mobilization
- can reduce rushed governance decisions
- useful for treasury allocations, grants, and recurring community budgeting

Disadvantages:

- less intuitive for average users
- harder to reason about execution timing
- parameter tuning is non-trivial
- not ideal for urgent binary decisions where a precise execution point matters

Conviction voting is strongest when a DAO is allocating recurring resources or prioritizing initiatives rather than approving discrete code changes.

### Tradeoff Summary

Token-weighted voting is the easiest to operationalize and the hardest to democratize. Quadratic voting is the easiest to justify philosophically and the hardest to secure without identity tooling. Conviction voting is the most process-oriented and best suited to continuous capital allocation rather than one-shot protocol upgrades.

For an on-chain treasury DAO like this assignment, token-weighted voting plus delegation, snapshots, and timelock is the most practical baseline. It is not the fairest possible model, but it is the most production-ready.

## 2. Real-World DAO Proposal Analysis

### Uniswap: Deploy Uniswap V3 to Polygon PoS Chain (UP010)

Uniswap’s Polygon deployment proposal is a strong example of a DAO using governance to authorize protocol expansion to a major new network. The proposal asked the community to approve deployment of Uniswap V3 on Polygon PoS, supported by a proposed Polygon incentive package.

What was proposed:

- authorize Uniswap Labs to deploy Uniswap V3 to Polygon PoS
- accept a support plan that included up to `$20M` in incentives

Turnout and outcome:

- the official Uniswap governance forum records the earlier consensus check at `44M` YES and `500k` NO, after a temperature check with `7.79M` YES and essentially no NO votes
- later reporting on the final on-chain vote described more than `72.6M` votes participating with roughly `99.3%` approval

Interpretation:

- turnout was strong for a DAO governance action tied directly to growth
- community signaling aligned across all phases instead of breaking down between forum discussion and on-chain execution
- the proposal shows how a DAO can coordinate a strategic expansion without relying on a single corporate decision-maker

The important governance lesson is that layered governance can work well: discussion, off-chain temperature checks, consensus checks, and then a final on-chain vote. That structure reduces surprise and makes the final execution step less contentious.

### Aave: Adjust Level 2 Governance Requirements (Proposal 106)

Aave Proposal 106 is interesting because it was not just a treasury or listing proposal; it modified the governance system’s own decision threshold for critical “long executor” actions. That makes it a good example of governance deciding how governance itself should work.

What was proposed:

- reduce the requirements for Aave’s Level 2 governance path
- make it easier for critical but legitimate protocol changes to pass without making the system trivially easy to capture

Turnout and outcome:

- the Aave governance forum reports that after ten days of voting the proposal received about `3.21M` YES votes, roughly `40%` of the AAVE and stkAAVE eligible to vote, and that the proposal passed and entered the timelock
- the same forum thread later notes that Proposal 106 was executed and the new Level 2 executor became active

Interpretation:

- this was a governance “meta” proposal, adjusting the rules of future governance rather than changing a normal protocol parameter
- turnout was high because the proposal affected the future capacity of the DAO to act
- Aave’s process shows a healthy pattern: large changes to governance rules are discussed publicly, pass through formal voting, and are then executed through a timelocked path

Compared with the Uniswap Polygon proposal, Aave Proposal 106 had a more constitutional character. Uniswap governance was authorizing a strategic deployment; Aave governance was recalibrating the operating rules of its own system.

## 3. Governance Attacks

### Beanstalk Governance Attack

The Beanstalk incident is one of the clearest examples of why governance snapshots matter. According to Beanstalk’s own postmortem, the attacker used a flash loan to gain temporary governance power, pass a malicious proposal, and route funds out of the protocol. Beanstalk later moved away from purely autonomous on-chain governance and now relies on Snapshot voting plus a community multisig for execution.

What went wrong:

- voting power could be acquired temporarily with borrowed capital
- governance execution was fast enough that the attack completed before the community could react
- the protocol treated momentary control of governance power as equivalent to legitimate long-term political support

How to prevent it:

- use historical checkpoints for proposal eligibility and voting
- introduce voting delay and timelock windows
- separate proposal creation from execution with review periods
- consider emergency pause or guardian mechanisms for high-severity situations

### Build Finance Hostile Takeover

The Build Finance case is a different failure mode. A U.S. Department of Homeland Security report describes a hostile governance takeover in which an attacker accumulated BUILD governance tokens, proposed taking control of the treasury and mint authority, failed once, then succeeded on a nearly identical proposal when the DAO community missed it because its Discord bot did not surface the vote.

What went wrong:

- the attacker legitimately accumulated enough voting power
- governance monitoring relied too heavily on centralized notification infrastructure
- token holders were not independently watching on-chain proposals

How to prevent it:

- improve proposal monitoring and alerting
- avoid over-reliance on a single off-chain communication channel
- use higher quorum or longer review periods for treasury-sensitive proposals
- separate routine actions from privileged treasury or mint authority changes

Together, Beanstalk and Build Finance show two different governance attack classes:

- borrowed short-term control
- legitimately acquired but malicious majority control

The first is mitigated by snapshots and delays. The second is mitigated mainly by distribution, quorum design, monitoring, and social vigilance.

## 4. Legal Considerations

### Wyoming DAO LLC

Wyoming remains one of the clearest U.S. jurisdictions for DAO legal recognition. The Wyoming Decentralized Autonomous Organization Supplement defines a DAO as an LLC organized under that chapter. The statute also requires the articles to identify the smart contract used to manage or operate the DAO and allows a DAO to be member-managed or algorithmically managed.

Practical significance:

- offers an existing legal wrapper for DAOs
- clarifies disclosure expectations for smart contracts
- provides some legal personality for contracting, taxation, and limited liability analysis

Limitations:

- it does not solve federal securities or commodities questions
- many global DAO participants are outside Wyoming
- the legal entity may not fully match the economic or social reality of a widely distributed token community

### EU MiCA Framework

The EU’s Markets in Crypto-Assets Regulation (MiCA), Regulation (EU) 2023/1114, entered into force in June 2023, with phased application beginning in June 2024 and full application from December 30, 2024. MiCA creates a harmonized regime for crypto-asset issuers and service providers across the EU.

For DAOs, the key point is interpretive: MiCA regulates activities and responsible entities, but it does not create a special DAO corporate form. If a DAO, foundation, issuer, or service provider is effectively offering tokens or crypto services into the EU, MiCA may still apply even if the project markets itself as decentralized.

The practical lesson is that “decentralized” is not a magic legal shield. Regulators generally look at who issued the token, who controls the interface, who profits, and who can make key decisions.

## 5. Future of Governance

### Optimistic Governance

Optimistic governance moves routine actions into a faster path where proposals are assumed acceptable unless challenged during a review window. This is useful for low-risk parameter updates and operational actions where the cost of delay is high.

The upside is speed. The downside is that governance safety increasingly depends on active monitoring and fast challengers.

### veToken Models

Vote-escrowed token models give more governance power to users who lock tokens for longer periods. The design goal is to reward long-term alignment rather than just current balance.

Benefits:

- raises the cost of opportunistic governance capture
- aligns incentives with long-term protocol health

Risks:

- entrenches incumbents
- can become complex and politically hard to reform
- may push influence toward professional delegates and aggregators

### Time-Weighted Voting

Time-weighted voting aims to reward durable commitment by increasing influence for addresses that hold or lock tokens over longer periods. It can reduce governance driven by transient capital, but it is more complex than plain token snapshots and harder for casual users to understand.

## Conclusion

DAO governance is ultimately a tradeoff between efficiency, legitimacy, and capture resistance. Token-weighted voting is still the dominant model because it is simple and automatable, but it is structurally vulnerable to concentration. Quadratic and conviction-style approaches address some fairness concerns, but they introduce either sybil problems or operational complexity.

The strongest lesson from real-world DAOs is that security is not only about smart contracts. Good governance requires:

- broad token distribution
- active delegates
- reliable proposal monitoring
- timelocks and public review windows
- clear separation between low-risk and high-risk governance actions

In other words, the code can be correct and the DAO can still fail politically. Robust DAO design combines secure contracts with durable institutional processes.

## Sources

1. Uniswap Governance Proposal UP010: https://gov.uniswap.org/t/governance-proposal-up010-deploy-uniswap-v3-to-polygon-pos-chain/15459
2. Uniswap consensus check: https://gov.uniswap.org/t/consensus-check-deploy-uniswap-v3-to-polygon-pos-chain/15262
3. Cointelegraph recap of the final Uniswap Polygon vote: https://cointelegraph.com/news/uniswap-v3-contracts-deployment-on-polygon-approved-with-99-3-consensus
4. Aave Proposal 106 discussion and execution updates: https://governance.aave.com/t/rfc-aave-governance-adjust-level-2-requirements-long-executor/8693
5. Aave governance process documentation: https://governance.aave.com/t/aave-governance-process-document-v1/18577
6. Beanstalk governance exploit postmortem: https://bean.money/blog/beanstalk-governance-exploit
7. Beanstalk governance documentation: https://docs.bean.money/almanac/governance/beanstalk
8. U.S. DHS report covering Build Finance and governance attacks: https://www.dhs.gov/sites/default/files/2023-09/08.%20Combatting%20Illicit%20Activity%20Phase%202_508_0.pdf
9. Wyoming DAO statute: https://wyoleg.gov/NXT/gateway.dll/Statutes%2F2021%20Titles%2F879%2F1045%2F1046
10. MiCA official regulation text: https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX%3A32023R1114
