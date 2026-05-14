// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract TokenVesting {
    using SafeERC20 for IERC20;

    uint64 public constant VESTING_DURATION = 365 days;

    address public immutable beneficiary;
    uint64 public immutable startTimestamp;
    mapping(address => uint256) public released;

    event ERC20Released(address indexed token, uint256 amount);

    constructor(address beneficiary_, uint64 startTimestamp_) {
        require(beneficiary_ != address(0), "beneficiary is zero");
        beneficiary = beneficiary_;
        startTimestamp = startTimestamp_;
    }

    function releasable(address token) public view returns (uint256) {
        return vestedAmount(token, uint64(block.timestamp)) - released[token];
    }

    function vestedAmount(address token, uint64 timestamp) public view returns (uint256) {
        uint256 totalAllocation = IERC20(token).balanceOf(address(this)) + released[token];
        return _vestingSchedule(totalAllocation, timestamp);
    }

    function release(address token) external {
        uint256 amount = releasable(token);
        require(amount > 0, "no tokens due");

        released[token] += amount;
        IERC20(token).safeTransfer(beneficiary, amount);

        emit ERC20Released(token, amount);
    }

    function _vestingSchedule(uint256 totalAllocation, uint64 timestamp) internal view returns (uint256) {
        if (timestamp <= startTimestamp) {
            return 0;
        }

        uint64 finish = startTimestamp + VESTING_DURATION;
        if (timestamp >= finish) {
            return totalAllocation;
        }

        return (totalAllocation * (timestamp - startTimestamp)) / VESTING_DURATION;
    }
}
