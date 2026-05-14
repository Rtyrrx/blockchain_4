// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract Treasury is Ownable {
    using SafeERC20 for IERC20;

    event ETHTransferred(address indexed to, uint256 amount);
    event ERC20Transferred(address indexed token, address indexed to, uint256 amount);
    event CallExecuted(address indexed target, uint256 value, bytes data, bytes returnData);

    constructor(address timelock) Ownable(timelock) {
        require(timelock != address(0), "timelock is zero");
    }

    receive() external payable {}

    function sendETH(address payable to, uint256 amount) external onlyOwner {
        require(to != address(0), "recipient is zero");
        require(address(this).balance >= amount, "insufficient eth");

        (bool success, ) = to.call{value: amount}("");
        require(success, "eth transfer failed");

        emit ETHTransferred(to, amount);
    }

    function sendERC20(address token, address to, uint256 amount) external onlyOwner {
        require(token != address(0), "token is zero");
        require(to != address(0), "recipient is zero");
        IERC20(token).safeTransfer(to, amount);
        emit ERC20Transferred(token, to, amount);
    }

    function execute(address target, uint256 value, bytes calldata data)
        external
        onlyOwner
        returns (bytes memory result)
    {
        require(target != address(0), "target is zero");
        (bool success, bytes memory returnData) = target.call{value: value}(data);
        require(success, "treasury call failed");

        emit CallExecuted(target, value, data, returnData);
        return returnData;
    }
}
