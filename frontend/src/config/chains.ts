import { defineChain } from "viem";

/**
 * Verified network parameters from official BOT Chain Developer Documentation:
 * https://dev-docs.botchain.ai/docs/Developers/quick-guide/
 */
export const botTestnet = defineChain({
  id: 968,
  name: "BOT Chain Testnet",
  nativeCurrency: {
    name: "BOT",
    symbol: "BOT",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [import.meta.env.VITE_RPC_URL || "https://rpc.bohr.life"],
    },
  },
  blockExplorers: {
    default: {
      name: "BOTScan Testnet",
      url: import.meta.env.VITE_EXPLORER_URL || "https://scan.bohr.life",
    },
  },
  testnet: true,
});

export const botMainnet = defineChain({
  id: 677,
  name: "BOT Chain",
  nativeCurrency: {
    name: "BOT",
    symbol: "BOT",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.botchain.ai"],
    },
  },
  blockExplorers: {
    default: {
      name: "BOTScan",
      url: "https://scan.botchain.ai",
    },
  },
  testnet: false,
});

export const TARGET_CHAIN =
  Number(import.meta.env.VITE_CHAIN_ID || 968) === 677 ? botMainnet : botTestnet;

export const EXPLORER_BASE_URL = (
  TARGET_CHAIN.blockExplorers?.default.url || "https://scan.bohr.life"
).replace(/\/+$/, "");

export function getTxExplorerUrl(txHash: string): string {
  return `${EXPLORER_BASE_URL}/tx/${txHash}`;
}

export function getAddressExplorerUrl(address: string): string {
  return `${EXPLORER_BASE_URL}/address/${address}`;
}

