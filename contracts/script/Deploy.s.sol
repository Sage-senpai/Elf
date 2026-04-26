// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {ShelfAgentStateManager} from "../src/ShelfAgentStateManager.sol";

/**
 * Deploy ShelfAgentStateManager to 0G Chain (testnet by default).
 *
 *   forge script script/Deploy.s.sol \
 *     --rpc-url $ZG_EVM_RPC \
 *     --private-key $DEPLOYER_PRIVATE_KEY \
 *     --broadcast
 *
 * Set ZG_EVM_RPC=https://evmrpc-testnet.0g.ai for the testnet (chain id
 * 16601). Replace with the mainnet RPC once Elf is live.
 */
contract Deploy is Script {
    function run() external returns (ShelfAgentStateManager m) {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        vm.startBroadcast(deployerKey);
        m = new ShelfAgentStateManager();
        vm.stopBroadcast();

        console2.log("ShelfAgentStateManager deployed at:", address(m));
        console2.log("Add to your .env.local as:");
        console2.log("  SHELF_AGENT_CONTRACT_ADDRESS=", address(m));
    }
}
