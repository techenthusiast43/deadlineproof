// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title DeadlineProof
 * @notice Minimal, gas-efficient on-chain task accountability and deadline registry.
 * @dev Overdue state is derived dynamically from block.timestamp in view functions
 *      without requiring state-mutating transactions.
 */
contract DeadlineProof {
    enum Status {
        Pending,
        Submitted,
        Verified,
        Cancelled,
        Overdue
    }

    /// @dev Packed storage representation: 2 fixed slots + title string.
    ///      Task ID is the mapping key, avoiding an extra storage slot.
    struct TaskStorage {
        address creator;
        uint64 deadline;
        Status status;
        address assignedTo;
        uint64 completedAt;
        string title;
    }

    struct Task {
        uint256 id;
        address creator;
        address assignedTo;
        string title;
        uint64 deadline;
        uint64 completedAt;
        Status status;
    }

    uint256 public constant MAX_TITLE_LENGTH = 120;

    uint256 public taskCount;

    mapping(uint256 => TaskStorage) private _tasks;
    mapping(address => uint256[]) private _userTaskIds;

    event TaskCreated(
        uint256 indexed taskId,
        address indexed creator,
        address indexed assignedTo,
        string title,
        uint64 deadline
    );
    event CompletionSubmitted(
        uint256 indexed taskId,
        address indexed assignedTo,
        uint64 completedAt
    );
    event TaskVerified(uint256 indexed taskId, address indexed creator);
    event TaskCancelled(uint256 indexed taskId, address indexed creator);

    error InvalidAssignee();
    error EmptyTitle();
    error TitleTooLong();
    error InvalidDeadline();
    error TaskNotFound();
    error NotAssignee();
    error NotCreator();
    error TaskFinalized();
    error AlreadySubmitted();
    error DeadlinePassed();
    error TaskNotSubmitted();

    /**
     * @notice Creates a new deadline-tracked task assigned to a wallet address.
     * @param assignedTo Wallet responsible for completing the task.
     * @param title Short task title (1 to 120 bytes).
     * @param deadline Unix timestamp (seconds) by which completion must be submitted.
     * @return taskId Unique identifier assigned to the created task.
     */
    function createTask(
        address assignedTo,
        string calldata title,
        uint64 deadline
    ) external returns (uint256 taskId) {
        if (assignedTo == address(0)) revert InvalidAssignee();

        uint256 titleLength = bytes(title).length;
        if (titleLength == 0) revert EmptyTitle();
        if (titleLength > MAX_TITLE_LENGTH) revert TitleTooLong();
        if (deadline <= block.timestamp) revert InvalidDeadline();

        unchecked {
            taskId = ++taskCount;
        }

        _tasks[taskId] = TaskStorage({
            creator: msg.sender,
            deadline: deadline,
            status: Status.Pending,
            assignedTo: assignedTo,
            completedAt: 0,
            title: title
        });

        _userTaskIds[msg.sender].push(taskId);
        if (assignedTo != msg.sender) {
            _userTaskIds[assignedTo].push(taskId);
        }

        emit TaskCreated(taskId, msg.sender, assignedTo, title, deadline);
    }

    /**
     * @notice Submits a completion claim for a pending task before its deadline.
     * @param taskId ID of the task to mark as submitted.
     */
    function submitCompletion(uint256 taskId) external {
        TaskStorage storage task = _getExistingTask(taskId);

        if (msg.sender != task.assignedTo) revert NotAssignee();
        if (task.status == Status.Verified || task.status == Status.Cancelled) {
            revert TaskFinalized();
        }
        if (task.status != Status.Pending) revert AlreadySubmitted();
        if (block.timestamp > task.deadline) revert DeadlinePassed();

        uint64 completedAt = uint64(block.timestamp);
        task.status = Status.Submitted;
        task.completedAt = completedAt;

        emit CompletionSubmitted(taskId, msg.sender, completedAt);
    }

    /**
     * @notice Verifies a submitted task completion claim. Callable only by the creator.
     * @param taskId ID of the task to verify.
     */
    function verifyCompletion(uint256 taskId) external {
        TaskStorage storage task = _getExistingTask(taskId);

        if (msg.sender != task.creator) revert NotCreator();
        if (task.status == Status.Verified || task.status == Status.Cancelled) {
            revert TaskFinalized();
        }
        if (task.status != Status.Submitted) revert TaskNotSubmitted();

        task.status = Status.Verified;

        emit TaskVerified(taskId, msg.sender);
    }

    /**
     * @notice Cancels a task that has not yet been verified or cancelled.
     * @param taskId ID of the task to cancel.
     */
    function cancelTask(uint256 taskId) external {
        TaskStorage storage task = _getExistingTask(taskId);

        if (msg.sender != task.creator) revert NotCreator();
        if (task.status == Status.Verified || task.status == Status.Cancelled) {
            revert TaskFinalized();
        }

        task.status = Status.Cancelled;

        emit TaskCancelled(taskId, msg.sender);
    }

    /**
     * @notice Returns full task details with live overdue status computed from block.timestamp.
     * @param taskId ID of the task to inspect.
     */
    function getTask(uint256 taskId) external view returns (Task memory) {
        TaskStorage storage task = _getExistingTask(taskId);
        return _buildTaskView(taskId, task);
    }

    /**
     * @notice Returns all tasks created by or assigned to the caller, with live overdue status.
     */
    function getMyTasks() external view returns (Task[] memory tasks) {
        uint256[] storage ids = _userTaskIds[msg.sender];
        uint256 length = ids.length;
        tasks = new Task[](length);

        for (uint256 i = 0; i < length; ) {
            uint256 id = ids[i];
            tasks[i] = _buildTaskView(id, _tasks[id]);
            unchecked {
                ++i;
            }
        }
    }

    function _getExistingTask(uint256 taskId) internal view returns (TaskStorage storage task) {
        task = _tasks[taskId];
        if (task.creator == address(0)) revert TaskNotFound();
    }

    function _buildTaskView(
        uint256 taskId,
        TaskStorage storage task
    ) internal view returns (Task memory) {
        Status effectiveStatus = task.status;
        if (effectiveStatus == Status.Pending && block.timestamp > task.deadline) {
            effectiveStatus = Status.Overdue;
        }

        return Task({
            id: taskId,
            creator: task.creator,
            assignedTo: task.assignedTo,
            title: task.title,
            deadline: task.deadline,
            completedAt: task.completedAt,
            status: effectiveStatus
        });
    }
}

