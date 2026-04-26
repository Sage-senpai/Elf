// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title  ShelfAgentStateManager
 * @notice Per-workspace registration + run log for the Elf Shelf Agent.
 *         Each workspace's autonomous agent registers its wallet once,
 *         then records a hash + timestamp every time it runs. The chain
 *         becomes the trust-minimised record of "did the agent actually
 *         run when it was supposed to?" — answering it for any third
 *         party (judge, contributor, regulator) without needing to
 *         trust Elf's database.
 *
 * @dev    Designed minimal on purpose: the actual action payload (which
 *         projects were checked, what notifications were sent) lives in
 *         0G Storage Log. This contract stores only the content-address
 *         of that payload + its timestamp. ~21k gas per run.
 *
 *         workspaceId is a bytes32 so callers can pass either the raw
 *         UUID hash or any other 32-byte identifier the off-chain layer
 *         derives. Off-chain code uses keccak256(uuid_string) by default.
 */
contract ShelfAgentStateManager {
    struct AgentState {
        address wallet;
        uint64 lastRunAt;
        uint64 runCount;
        bytes32 lastActionHash;
    }

    /// @dev workspaceId (keccak256(uuid)) → state
    mapping(bytes32 => AgentState) private _agents;

    event AgentRegistered(bytes32 indexed workspaceId, address indexed wallet);
    event AgentRan(
        bytes32 indexed workspaceId,
        address indexed wallet,
        bytes32 actionHash,
        uint64 timestamp,
        uint64 runCount
    );

    error WalletConflict(address registered, address attempted);
    error NotAuthorized();
    error InvalidWorkspaceId();

    /**
     * @notice Register an agent wallet for a workspace. Idempotent for
     *         the same wallet — re-registering with the same caller is
     *         a no-op. Re-registering with a different caller reverts
     *         with WalletConflict (rotate via off-chain key migration
     *         in v2).
     */
    function registerAgent(bytes32 workspaceId) external {
        if (workspaceId == bytes32(0)) revert InvalidWorkspaceId();
        AgentState storage s = _agents[workspaceId];
        if (s.wallet == address(0)) {
            s.wallet = msg.sender;
            emit AgentRegistered(workspaceId, msg.sender);
            return;
        }
        if (s.wallet != msg.sender) {
            revert WalletConflict(s.wallet, msg.sender);
        }
        // already registered to this wallet — no-op
    }

    /**
     * @notice Record a run. Only the registered wallet may call.
     * @param  workspaceId Same id used at registration.
     * @param  actionHash  Content-address of the run's action payload
     *                     (e.g. the 0G Storage Log root hash for the
     *                     agent_action audit entry written this run).
     */
    function recordRun(bytes32 workspaceId, bytes32 actionHash) external {
        AgentState storage s = _agents[workspaceId];
        if (s.wallet != msg.sender) revert NotAuthorized();
        unchecked {
            s.runCount += 1;
        }
        s.lastRunAt = uint64(block.timestamp);
        s.lastActionHash = actionHash;
        emit AgentRan(workspaceId, msg.sender, actionHash, uint64(block.timestamp), s.runCount);
    }

    /**
     * @notice Read an agent's full state. Returns a zeroed struct if
     *         the workspace has no registered agent.
     */
    function getState(bytes32 workspaceId) external view returns (AgentState memory) {
        return _agents[workspaceId];
    }

    /**
     * @notice Convenience getter: was an agent ever registered for this
     *         workspace?
     */
    function isRegistered(bytes32 workspaceId) external view returns (bool) {
        return _agents[workspaceId].wallet != address(0);
    }
}
