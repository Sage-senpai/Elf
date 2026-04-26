// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ShelfAgentStateManager} from "../src/ShelfAgentStateManager.sol";

contract ShelfAgentStateManagerTest is Test {
    ShelfAgentStateManager internal m;

    bytes32 internal constant WS = keccak256("workspace-uuid-fixture");
    address internal agent = address(0xA9E37);
    address internal stranger = address(0xBAD);

    function setUp() public {
        m = new ShelfAgentStateManager();
    }

    function test_RegisterAgent_FirstCallSetsWallet() public {
        vm.prank(agent);
        m.registerAgent(WS);
        ShelfAgentStateManager.AgentState memory s = m.getState(WS);
        assertEq(s.wallet, agent);
        assertEq(s.runCount, 0);
    }

    function test_RegisterAgent_IsIdempotentForSameCaller() public {
        vm.startPrank(agent);
        m.registerAgent(WS);
        m.registerAgent(WS);
        vm.stopPrank();
        assertTrue(m.isRegistered(WS));
    }

    function test_RegisterAgent_RevertsOnWalletConflict() public {
        vm.prank(agent);
        m.registerAgent(WS);

        vm.prank(stranger);
        vm.expectRevert(
            abi.encodeWithSelector(
                ShelfAgentStateManager.WalletConflict.selector, agent, stranger
            )
        );
        m.registerAgent(WS);
    }

    function test_RegisterAgent_RevertsOnZeroWorkspace() public {
        vm.prank(agent);
        vm.expectRevert(ShelfAgentStateManager.InvalidWorkspaceId.selector);
        m.registerAgent(bytes32(0));
    }

    function test_RecordRun_OnlyRegisteredWalletCanCall() public {
        vm.prank(agent);
        m.registerAgent(WS);

        vm.prank(stranger);
        vm.expectRevert(ShelfAgentStateManager.NotAuthorized.selector);
        m.recordRun(WS, keccak256("action"));
    }

    function test_RecordRun_UpdatesStateAndEmitsEvent() public {
        vm.prank(agent);
        m.registerAgent(WS);

        bytes32 action = keccak256("agent-action-1");
        vm.warp(1_700_000_000);

        vm.expectEmit(true, true, false, true);
        emit ShelfAgentStateManager.AgentRan(WS, agent, action, 1_700_000_000, 1);

        vm.prank(agent);
        m.recordRun(WS, action);

        ShelfAgentStateManager.AgentState memory s = m.getState(WS);
        assertEq(s.lastActionHash, action);
        assertEq(s.lastRunAt, 1_700_000_000);
        assertEq(s.runCount, 1);
    }

    function test_RecordRun_AccumulatesRunCount() public {
        vm.prank(agent);
        m.registerAgent(WS);

        for (uint256 i = 1; i <= 5; i++) {
            vm.prank(agent);
            m.recordRun(WS, keccak256(abi.encode(i)));
        }
        assertEq(m.getState(WS).runCount, 5);
    }
}
