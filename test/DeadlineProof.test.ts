import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import type { DeadlineProof } from "../typechain-types";

const Status = {
  Pending: 0n,
  Submitted: 1n,
  Verified: 2n,
  Cancelled: 3n,
  Overdue: 4n,
} as const;

describe("DeadlineProof", function () {
  async function deployFixture() {
    const [creator, assignee, outsider] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("DeadlineProof");
    const contract = (await factory.deploy()) as unknown as DeadlineProof;
    await contract.waitForDeployment();
    return { contract, creator, assignee, outsider };
  }

  async function futureDeadline(offsetSeconds = 3600): Promise<number> {
    const latest = await time.latest();
    return latest + offsetSeconds;
  }

  describe("createTask", function () {
    it("creates tasks with incrementing unique IDs and emits TaskCreated", async function () {
      const { contract, creator, assignee } = await deployFixture();
      const deadline = await futureDeadline(3600);

      await expect(contract.connect(creator).createTask(assignee.address, "Audit smart contract", deadline))
        .to.emit(contract, "TaskCreated")
        .withArgs(1n, creator.address, assignee.address, "Audit smart contract", deadline);

      const task1 = await contract.getTask(1n);
      expect(task1.id).to.equal(1n);
      expect(task1.creator).to.equal(creator.address);
      expect(task1.assignedTo).to.equal(assignee.address);
      expect(task1.title).to.equal("Audit smart contract");
      expect(task1.deadline).to.equal(BigInt(deadline));
      expect(task1.completedAt).to.equal(0n);
      expect(task1.status).to.equal(Status.Pending);

      const maxTitle = "a".repeat(120);
      await expect(contract.connect(creator).createTask(assignee.address, maxTitle, deadline + 60))
        .to.emit(contract, "TaskCreated")
        .withArgs(2n, creator.address, assignee.address, maxTitle, deadline + 60);

      expect(await contract.taskCount()).to.equal(2n);
    });

    it("validates assignee, title length, and future deadline", async function () {
      const { contract, creator, assignee } = await deployFixture();
      const latest = await time.latest();
      const validDeadline = latest + 3600;

      await expect(
        contract.connect(creator).createTask(ethers.ZeroAddress, "Valid title", validDeadline)
      ).to.be.revertedWithCustomError(contract, "InvalidAssignee");

      await expect(
        contract.connect(creator).createTask(assignee.address, "", validDeadline)
      ).to.be.revertedWithCustomError(contract, "EmptyTitle");

      await expect(
        contract.connect(creator).createTask(assignee.address, "x".repeat(121), validDeadline)
      ).to.be.revertedWithCustomError(contract, "TitleTooLong");

      await expect(
        contract.connect(creator).createTask(assignee.address, "Past deadline", latest)
      ).to.be.revertedWithCustomError(contract, "InvalidDeadline");
    });
  });

  describe("submitCompletion", function () {
    it("allows only the assigned wallet to submit completion before or at deadline", async function () {
      const { contract, creator, assignee, outsider } = await deployFixture();
      const deadline = await futureDeadline(3600);
      await contract.connect(creator).createTask(assignee.address, "Ship UI", deadline);

      await expect(contract.connect(creator).submitCompletion(1n)).to.be.revertedWithCustomError(
        contract,
        "NotAssignee"
      );
      await expect(contract.connect(outsider).submitCompletion(1n)).to.be.revertedWithCustomError(
        contract,
        "NotAssignee"
      );

      await time.setNextBlockTimestamp(deadline);
      await expect(contract.connect(assignee).submitCompletion(1n))
        .to.emit(contract, "CompletionSubmitted")
        .withArgs(1n, assignee.address, deadline);

      const task = await contract.getTask(1n);
      expect(task.status).to.equal(Status.Submitted);
      expect(task.completedAt).to.equal(BigInt(deadline));

      await expect(contract.connect(assignee).submitCompletion(1n)).to.be.revertedWithCustomError(
        contract,
        "AlreadySubmitted"
      );
    });

    it("prevents completion submissions after the deadline", async function () {
      const { contract, creator, assignee } = await deployFixture();
      const deadline = await futureDeadline(3600);
      await contract.connect(creator).createTask(assignee.address, "Late submission", deadline);

      await time.increaseTo(deadline + 1);

      await expect(contract.connect(assignee).submitCompletion(1n)).to.be.revertedWithCustomError(
        contract,
        "DeadlinePassed"
      );
    });
  });

  describe("verifyCompletion", function () {
    it("allows only creator to verify a submitted task and blocks modification afterwards", async function () {
      const { contract, creator, assignee, outsider } = await deployFixture();
      const deadline = await futureDeadline(3600);
      await contract.connect(creator).createTask(assignee.address, "Deploy contract", deadline);

      // Cannot verify before submission
      await expect(contract.connect(creator).verifyCompletion(1n)).to.be.revertedWithCustomError(
        contract,
        "TaskNotSubmitted"
      );

      await contract.connect(assignee).submitCompletion(1n);

      // Only creator can verify
      await expect(contract.connect(assignee).verifyCompletion(1n)).to.be.revertedWithCustomError(
        contract,
        "NotCreator"
      );
      await expect(contract.connect(outsider).verifyCompletion(1n)).to.be.revertedWithCustomError(
        contract,
        "NotCreator"
      );

      await expect(contract.connect(creator).verifyCompletion(1n))
        .to.emit(contract, "TaskVerified")
        .withArgs(1n, creator.address);

      const task = await contract.getTask(1n);
      expect(task.status).to.equal(Status.Verified);
      expect(task.completedAt).to.be.gt(0n);

      // Verified task cannot be modified
      await expect(contract.connect(assignee).submitCompletion(1n)).to.be.revertedWithCustomError(
        contract,
        "TaskFinalized"
      );
      await expect(contract.connect(creator).verifyCompletion(1n)).to.be.revertedWithCustomError(
        contract,
        "TaskFinalized"
      );
      await expect(contract.connect(creator).cancelTask(1n)).to.be.revertedWithCustomError(
        contract,
        "TaskFinalized"
      );
    });
  });

  describe("cancelTask", function () {
    it("allows only creator to cancel pending, overdue, or submitted tasks and prevents further changes", async function () {
      const { contract, creator, assignee, outsider } = await deployFixture();
      const deadline = await futureDeadline(1000);
      await contract.connect(creator).createTask(assignee.address, "Task A", deadline);
      await contract.connect(creator).createTask(assignee.address, "Task B", deadline + 500);

      await expect(contract.connect(assignee).cancelTask(1n)).to.be.revertedWithCustomError(
        contract,
        "NotCreator"
      );
      await expect(contract.connect(outsider).cancelTask(1n)).to.be.revertedWithCustomError(
        contract,
        "NotCreator"
      );

      // Cancel Task 1 while Submitted
      await contract.connect(assignee).submitCompletion(1n);
      await expect(contract.connect(creator).cancelTask(1n))
        .to.emit(contract, "TaskCancelled")
        .withArgs(1n, creator.address);

      expect((await contract.getTask(1n)).status).to.equal(Status.Cancelled);

      // Cancelled task cannot be modified
      await expect(contract.connect(assignee).submitCompletion(1n)).to.be.revertedWithCustomError(
        contract,
        "TaskFinalized"
      );
      await expect(contract.connect(creator).verifyCompletion(1n)).to.be.revertedWithCustomError(
        contract,
        "TaskFinalized"
      );
      await expect(contract.connect(creator).cancelTask(1n)).to.be.revertedWithCustomError(
        contract,
        "TaskFinalized"
      );

      // Creator can still cancel an overdue Pending task (Task 2)
      await time.increaseTo(deadline + 600);
      expect((await contract.getTask(2n)).status).to.equal(Status.Overdue);
      await expect(contract.connect(creator).cancelTask(2n))
        .to.emit(contract, "TaskCancelled")
        .withArgs(2n, creator.address);
      expect((await contract.getTask(2n)).status).to.equal(Status.Cancelled);
    });
  });

  describe("getTask, getMyTasks, and dynamic Overdue calculation", function () {
    it("reverts getTask for non-existent IDs", async function () {
      const { contract } = await deployFixture();
      await expect(contract.getTask(0n)).to.be.revertedWithCustomError(contract, "TaskNotFound");
      await expect(contract.getTask(99n)).to.be.revertedWithCustomError(contract, "TaskNotFound");
    });

    it("computes Overdue dynamically from block.timestamp and returns deduplicated user tasks", async function () {
      const { contract, creator, assignee, outsider } = await deployFixture();
      const base = await time.latest();

      // Task 1: creator -> assignee (will become overdue)
      await contract.connect(creator).createTask(assignee.address, "Overdue Task", base + 100);
      // Task 2: self-assigned by creator (should appear only once in creator's getMyTasks)
      await contract.connect(creator).createTask(creator.address, "Self Task", base + 500);
      // Task 3: creator -> assignee, submitted before deadline (must NOT become Overdue later)
      await contract.connect(creator).createTask(assignee.address, "Submitted On Time", base + 200);
      // Task 4: outsider -> outsider (must NOT appear in creator/assignee lists)
      await contract.connect(outsider).createTask(outsider.address, "Outsider Task", base + 300);

      await contract.connect(assignee).submitCompletion(3n);

      // Initially: Task 1 Pending, Task 2 Pending, Task 3 Submitted
      let creatorTasks = await contract.connect(creator).getMyTasks();
      expect(creatorTasks.map((t) => t.id)).to.deep.equal([1n, 2n, 3n]);
      expect(creatorTasks[0].status).to.equal(Status.Pending);

      let assigneeTasks = await contract.connect(assignee).getMyTasks();
      expect(assigneeTasks.map((t) => t.id)).to.deep.equal([1n, 3n]);

      let outsiderTasks = await contract.connect(outsider).getMyTasks();
      expect(outsiderTasks.map((t) => t.id)).to.deep.equal([4n]);

      // Advance time past Task 1 & Task 3 deadlines without sending any transaction
      await time.increaseTo(base + 250);

      creatorTasks = await contract.connect(creator).getMyTasks();
      expect(creatorTasks[0].status).to.equal(Status.Overdue); // Task 1 became Overdue dynamically
      expect(creatorTasks[1].status).to.equal(Status.Pending); // Task 2 still before deadline
      expect(creatorTasks[2].status).to.equal(Status.Submitted); // Task 3 remains Submitted

      expect((await contract.getTask(1n)).status).to.equal(Status.Overdue);
    });
  });
});

