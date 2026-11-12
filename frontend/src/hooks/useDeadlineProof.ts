import { useEffect, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { decodeEventLog } from "viem";
import {
  useAccount,
  useChainId,
  usePublicClient,
  useReadContract,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import { TARGET_CHAIN } from "../config/chains";
import {
  CONTRACT_ADDRESS,
  DEADLINE_PROOF_ABI,
  IS_CONTRACT_CONFIGURED,
  parseContractError,
} from "../config/contract";
import { Task, TaskStatus, TxFeedback } from "../types/task";

function mapRawTask(raw: {
  id: bigint;
  creator: `0x${string}`;
  assignedTo: `0x${string}`;
  title: string;
  deadline: bigint | number;
  completedAt: bigint | number;
  status: number;
}): Task {
  return {
    id: BigInt(raw.id),
    creator: raw.creator,
    assignedTo: raw.assignedTo,
    title: raw.title,
    deadline: Number(raw.deadline),
    completedAt: Number(raw.completedAt),
    status: Number(raw.status) as TaskStatus,
  };
}

/**
 * Tracks current Unix seconds synced periodically with BOT Chain block timestamps
 * so dynamic overdue status matches on-chain block.timestamp closely.
 */
export function useChainNowSeconds() {
  const publicClient = usePublicClient({ chainId: TARGET_CHAIN.id });
  const [offsetSeconds, setOffsetSeconds] = useState(0);
  const [localNow, setLocalNow] = useState(() => Math.floor(Date.now() / 1000));

  const syncChainTime = useCallback(async () => {
    if (!publicClient) return;
    try {
      const block = await publicClient.getBlock({ blockTag: "latest" });
      const local = Math.floor(Date.now() / 1000);
      setOffsetSeconds(Number(block.timestamp) - local);
      setLocalNow(local);
    } catch {
      // Fall back to local wall clock if RPC is momentarily unreachable
    }
  }, [publicClient]);

  useEffect(() => {
    syncChainTime();
    const tick = window.setInterval(() => {
      setLocalNow(Math.floor(Date.now() / 1000));
    }, 5000);
    const resync = window.setInterval(syncChainTime, 30000);

    return () => {
      window.clearInterval(tick);
      window.clearInterval(resync);
    };
  }, [syncChainTime]);

  return { nowSeconds: localNow + offsetSeconds, syncChainTime };
}

export function useMyTasks() {
  const { address } = useAccount();

  const query = useReadContract({
    address: IS_CONTRACT_CONFIGURED ? (CONTRACT_ADDRESS as `0x${string}`) : undefined,
    abi: DEADLINE_PROOF_ABI,
    functionName: "getMyTasks",
    account: address,
    chainId: TARGET_CHAIN.id,
    query: {
      enabled: Boolean(address && IS_CONTRACT_CONFIGURED),
      refetchInterval: 20000,
    },
  });

  const tasks: Task[] = (query.data ?? [])
    .map(mapRawTask)
    .sort((a, b) => Number(b.id - a.id));

  return {
    ...query,
    tasks,
  };
}

export function useTaskDetails(taskId?: bigint) {
  const query = useReadContract({
    address: IS_CONTRACT_CONFIGURED ? (CONTRACT_ADDRESS as `0x${string}`) : undefined,
    abi: DEADLINE_PROOF_ABI,
    functionName: "getTask",
    args: taskId !== undefined ? [taskId] : undefined,
    chainId: TARGET_CHAIN.id,
    query: {
      enabled: Boolean(taskId !== undefined && taskId > 0n && IS_CONTRACT_CONFIGURED),
      retry: false,
      refetchInterval: 15000,
    },
  });

  return {
    ...query,
    task: query.data ? mapRawTask(query.data) : undefined,
  };
}

export function useTaskActions() {
  const { address, isConnected } = useAccount();
  const walletChainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient({ chainId: TARGET_CHAIN.id });
  const queryClient = useQueryClient();

  const [feedback, setFeedback] = useState<TxFeedback | null>(null);
  const [isPending, setIsPending] = useState(false);

  const ensureReady = useCallback(async () => {
    if (!IS_CONTRACT_CONFIGURED || !CONTRACT_ADDRESS) {
      throw new Error(
        "Contract address is not configured yet. Deploy DeadlineProof and set VITE_CONTRACT_ADDRESS."
      );
    }
    if (!isConnected || !address) {
      throw new Error("Connect your wallet first.");
    }
    if (walletChainId !== TARGET_CHAIN.id) {
      await switchChainAsync({ chainId: TARGET_CHAIN.id });
    }
    if (!publicClient) {
      throw new Error("RPC client unavailable for BOT Chain.");
    }
  }, [address, isConnected, publicClient, switchChainAsync, walletChainId]);

  const runContractWrite = useCallback(
    async <T = undefined>(
      action: string,
      writeFn: () => Promise<`0x${string}`>,
      onConfirmed?: (receipt: Awaited<ReturnType<NonNullable<typeof publicClient>["waitForTransactionReceipt"]>>) => T
    ): Promise<{ hash: `0x${string}`; extra?: T } | null> => {
      setIsPending(true);
      setFeedback({
        state: "signing",
        action,
        message: "Confirm the transaction in your wallet...",
      });

      try {
        await ensureReady();
        const hash = await writeFn();

        setFeedback({
          state: "confirming",
          action,
          txHash: hash,
          message: `Submitted to ${TARGET_CHAIN.name}. Waiting for confirmation...`,
        });

        const receipt = await publicClient!.waitForTransactionReceipt({ hash });
        if (receipt.status !== "success") {
          throw new Error("Transaction reverted on-chain.");
        }

        const extra = onConfirmed ? onConfirmed(receipt) : undefined;
        await queryClient.invalidateQueries();

        setFeedback({
          state: "success",
          action,
          txHash: hash,
          message: "Transaction confirmed on-chain.",
        });

        return { hash, extra };
      } catch (err) {
        setFeedback({
          state: "error",
          action,
          message: parseContractError(err),
        });
        return null;
      } finally {
        setIsPending(false);
      }
    },
    [ensureReady, publicClient, queryClient]
  );

  const createTask = useCallback(
    async (assignedTo: `0x${string}`, title: string, deadline: number) => {
      return runContractWrite<bigint | undefined>(
        "Create Task",
        () =>
          writeContractAsync({
            address: CONTRACT_ADDRESS as `0x${string}`,
            abi: DEADLINE_PROOF_ABI,
            functionName: "createTask",
            args: [assignedTo, title, BigInt(deadline)],
            chainId: TARGET_CHAIN.id,
          }),
        (receipt) => {
          for (const log of receipt.logs) {
            try {
              const decoded = decodeEventLog({
                abi: DEADLINE_PROOF_ABI,
                data: log.data,
                topics: log.topics,
              });
              if (decoded.eventName === "TaskCreated") {
                return decoded.args.taskId;
              }
            } catch {
              // Ignore non-matching logs
            }
          }
          return undefined;
        }
      );
    },
    [runContractWrite, writeContractAsync]
  );

  const submitCompletion = useCallback(
    (taskId: bigint) =>
      runContractWrite("Submit Completion", () =>
        writeContractAsync({
          address: CONTRACT_ADDRESS as `0x${string}`,
          abi: DEADLINE_PROOF_ABI,
          functionName: "submitCompletion",
          args: [taskId],
          chainId: TARGET_CHAIN.id,
        })
      ),
    [runContractWrite, writeContractAsync]
  );

  const verifyCompletion = useCallback(
    (taskId: bigint) =>
      runContractWrite("Verify Completion", () =>
        writeContractAsync({
          address: CONTRACT_ADDRESS as `0x${string}`,
          abi: DEADLINE_PROOF_ABI,
          functionName: "verifyCompletion",
          args: [taskId],
          chainId: TARGET_CHAIN.id,
        })
      ),
    [runContractWrite, writeContractAsync]
  );

  const cancelTask = useCallback(
    (taskId: bigint) =>
      runContractWrite("Cancel Task", () =>
        writeContractAsync({
          address: CONTRACT_ADDRESS as `0x${string}`,
          abi: DEADLINE_PROOF_ABI,
          functionName: "cancelTask",
          args: [taskId],
          chainId: TARGET_CHAIN.id,
        })
      ),
    [runContractWrite, writeContractAsync]
  );

  return {
    feedback,
    clearFeedback: () => setFeedback(null),
    isPending,
    createTask,
    submitCompletion,
    verifyCompletion,
    cancelTask,
  };
}

