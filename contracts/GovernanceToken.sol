// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {ERC20Votes} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import {Nonces} from "@openzeppelin/contracts/utils/Nonces.sol";

contract GovernanceToken is ERC20, ERC20Permit, ERC20Votes {
    uint256 public constant INITIAL_SUPPLY = 1_000_000 ether;
    uint256 public constant TEAM_ALLOCATION = (INITIAL_SUPPLY * 40) / 100;
    uint256 public constant TREASURY_ALLOCATION = (INITIAL_SUPPLY * 30) / 100;
    uint256 public constant COMMUNITY_ALLOCATION = (INITIAL_SUPPLY * 20) / 100;
    uint256 public constant LIQUIDITY_ALLOCATION = (INITIAL_SUPPLY * 10) / 100;

    constructor(
        address teamVesting,
        address treasury,
        address communityAirdrop,
        address liquidity
    ) ERC20("DAO Governance Token", "DGT") ERC20Permit("DAO Governance Token") {
        require(teamVesting != address(0), "team vesting is zero");
        require(treasury != address(0), "treasury is zero");
        require(communityAirdrop != address(0), "airdrop is zero");
        require(liquidity != address(0), "liquidity is zero");

        _mint(teamVesting, TEAM_ALLOCATION);
        _mint(treasury, TREASURY_ALLOCATION);
        _mint(communityAirdrop, COMMUNITY_ALLOCATION);
        _mint(liquidity, LIQUIDITY_ALLOCATION);
    }

    function _update(address from, address to, uint256 value) internal override(ERC20, ERC20Votes) {
        super._update(from, to, value);
    }

    function nonces(address owner) public view override(ERC20Permit, Nonces) returns (uint256) {
        return super.nonces(owner);
    }
}
