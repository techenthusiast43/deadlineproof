import { Interface, isAddress } from "ethers";
import deployment from "./deployment.json";

export const DEADLINE_PROOF_ABI = [
  {
    type: "error",
    name: "AlreadySubmitted",
    inputs: [],
  },
  {
    type: "error",
    name: "DeadlinePassed",
    inputs: [],
  },
  {
    type: "error",
    name: "EmptyTitle",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidAssignee",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidDeadline",
    inputs: [],
  },
  {
    type: "error",
    name: "NotAssignee",
    inputs: [],
  },
  {
    type: "error",
    name: "NotCreator",
    inputs: [],
  },
  {
    type: "error",
    name: "TaskFinalized",
    inputs: [],
  },
  {
    type: "error",
    name: "TaskNotFound",
    inputs: [],
  },
  {
    type: "error",
    name: "TaskNotSubmitted",
    inputs: [],
  },
  {
    type: "error",
    name: "TitleTooLong",
    inputs: [],
  },
  {
    type: "event",
    name: "CompletionSubmitted",
    inputs: [
      { name: "taskId", type: "uint256", indexed: true },
      { name: "assignedTo", type: "address", indexed: true },
      { name: "completedAt", type: "uint64", indexed: false },
    ],
  },
  {
    type: "event",
    name: "TaskCancelled",
    inputs: [
      { name: "taskId", type: "uint256", indexed: true },
      { name: "creator", type: "address", indexed: true },
    ],
  },
  {
    type: "event",
    name: "TaskCreated",
    inputs: [
      { name: "taskId", type: "uint256", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "assignedTo", type: "address", indexed: true },
      { name: "title", type: "string", indexed: false },
      { name: "deadline", type: "uint64", indexed: false },
    ],
  },
  {
    type: "event",
    name: "TaskVerified",
    inputs: [
      { name: "taskId", type: "uint256", indexed: true },
      { name: "creator", type: "address", indexed: true },
    ],
  },
  {
    type: "function",
    name: "MAX_TITLE_LENGTH",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "cancelTask",
    stateMutability: "nonpayable",
    inputs: [{ name: "taskId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "createTask",
    stateMutability: "nonpayable",
    inputs: [
      { name: "assignedTo", type: "address" },
      { name: "title", type: "string" },
      { name: "deadline", type: "uint64" },
    ],
    outputs: [{ name: "taskId", type: "uint256" }],
  },
  {
    type: "function",
    name: "getMyTasks",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "tasks",
        type: "tuple[]",
        components: [
          { name: "id", type: "uint256" },
          { name: "creator", type: "address" },
          { name: "assignedTo", type: "address" },
          { name: "title", type: "string" },
          { name: "deadline", type: "uint64" },
          { name: "completedAt", type: "uint64" },
          { name: "status", type: "uint8" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "getTask",
    stateMutability: "view",
    inputs: [{ name: "taskId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "id", type: "uint256" },
          { name: "creator", type: "address" },
          { name: "assignedTo", type: "address" },
          { name: "title", type: "string" },
          { name: "deadline", type: "uint64" },
          { name: "completedAt", type: "uint64" },
          { name: "status", type: "uint8" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "submitCompletion",
    stateMutability: "nonpayable",
    inputs: [{ name: "taskId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "taskCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "verifyCompletion",
    stateMutability: "nonpayable",
    inputs: [{ name: "taskId", type: "uint256" }],
    outputs: [],
  },
] as const;

const contractInterface = new Interface(DEADLINE_PROOF_ABI);

const envAddress = (import.meta.env.VITE_CONTRACT_ADDRESS || "").trim();
const syncedAddress = (deployment.contractAddress || "").trim();
const resolvedAddress = isAddress(envAddress)
  ? envAddress
  : isAddress(syncedAddress)
    ? syncedAddress
    : "";

export const CONTRACT_ADDRESS = resolvedAddress as `0x${string}` | "";
export const IS_CONTRACT_CONFIGURED = isAddress(CONTRACT_ADDRESS);

const CUSTOM_ERROR_MESSAGES: Record<string, string> = {
  InvalidAssignee: "Assigned wallet address cannot be the zero address.",
  EmptyTitle: "Task title cannot be empty.",
  TitleTooLong: "Task title exceeds the 120-byte on-chain limit.",
  InvalidDeadline: "Deadline must be strictly in the future.",
  TaskNotFound: "Task ID was not found on-chain.",
  NotAssignee: "Only the assigned wallet can submit completion for this task.",
  NotCreator: "Only the task creator can verify or cancel this task.",
  TaskFinalized: "Verified or cancelled tasks cannot be modified.",
  AlreadySubmitted: "Completion has already been submitted for this task.",
  DeadlinePassed: "The task deadline has already passed; completion can no longer be submitted.",
  TaskNotSubmitted: "This task cannot be verified until the assignee submits completion.",
};

function extractHexErrorData(err: unknown): string | null {
  if (typeof err !== "object" || err === null) return null;
  const candidate = err as {
    data?: unknown;
    cause?: unknown;
    error?: unknown;
  };
  if (typeof candidate.data === "string" && candidate.data.startsWith("0x")) {
    return candidate.data;
  }
  if (candidate.cause) {
    const nested = extractHexErrorData(candidate.cause);
    if (nested) return nested;
  }
  if (candidate.error) {
    const nested = extractHexErrorData(candidate.error);
    if (nested) return nested;
  }
  return null;
}

export function parseContractError(err: unknown): string {
  const hexData = extractHexErrorData(err);
  if (hexData) {
    try {
      const parsed = contractInterface.parseError(hexData);
      if (parsed && CUSTOM_ERROR_MESSAGES[parsed.name]) {
        return CUSTOM_ERROR_MESSAGES[parsed.name];
      }
    } catch {
      // Ignore if selector is not one of our custom errors
    }
  }

  const message =
    typeof err === "object" && err !== null
      ? ((err as { shortMessage?: string; message?: string }).shortMessage ||
          (err as { message?: string }).message ||
          "Transaction failed")
      : String(err);

  if (/user rejected|user denied|rejected the request/i.test(message)) {
    return "Transaction signature was rejected in your wallet.";
  }

  for (const [errorName, friendly] of Object.entries(CUSTOM_ERROR_MESSAGES)) {
    if (message.includes(errorName)) {
      return friendly;
    }
  }

  if (/insufficient funds/i.test(message)) {
    return "Insufficient BOT balance to pay transaction gas fees. Claim test tBOT from https://faucet.botchain.ai/basic.";
  }

  return message.length > 220 ? `${message.slice(0, 220)}...` : message;
}
