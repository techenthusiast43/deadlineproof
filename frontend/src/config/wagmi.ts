import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import type { AppKitNetwork } from "@reown/appkit/networks";
import { QueryClient } from "@tanstack/react-query";
import { http } from "wagmi";
import { botMainnet, botTestnet, TARGET_CHAIN } from "./chains";

export const queryClient = new QueryClient();

const envProjectId = (import.meta.env.VITE_REOWN_PROJECT_ID || "").trim();
export const IS_REOWN_CONFIGURED = envProjectId.length > 0;
const projectId = envProjectId || "00000000000000000000000000000000";

const networks: [AppKitNetwork, ...AppKitNetwork[]] =
  TARGET_CHAIN.id === botMainnet.id ? [botMainnet, botTestnet] : [botTestnet, botMainnet];

export const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  transports: {
    [botTestnet.id]: http(botTestnet.rpcUrls.default.http[0]),
    [botMainnet.id]: http(botMainnet.rpcUrls.default.http[0]),
  },
});

createAppKit({
  adapters: [wagmiAdapter],
  networks,
  defaultNetwork: TARGET_CHAIN,
  projectId,
  themeMode: "dark",
  features: {
    analytics: false,
    email: false,
    socials: false,
  },
  metadata: {
    name: "DeadlineProof",
    description: "On-chain deadline and task accountability dApp on BOT Chain",
    url: typeof window !== "undefined" ? window.location.origin : "https://deadlineproof.local",
    icons: ["https://www.botchain.ai/favicon.ico"],
  },
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;

