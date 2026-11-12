import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

function getAccounts(): string[] {
  const raw = process.env.DEPLOYER_PRIVATE_KEY?.trim();
  if (!raw) return [];
  const normalized = raw.startsWith("0x") ? raw : `0x${raw}`;
  // Ignore invalid placeholder strings so compile/test never fail without .env
  if (!/^0x[0-9a-fA-F]{64}$/.test(normalized)) return [];
  return [normalized];
}

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      evmVersion: "paris",
    },
  },
  networks: {
    hardhat: {},
    botTestnet: {
      url: process.env.BOT_TESTNET_RPC_URL || "https://rpc.bohr.life",
      chainId: 968,
      accounts: getAccounts(),
    },
    botMainnet: {
      url: process.env.BOT_MAINNET_RPC_URL || "https://rpc.botchain.ai",
      chainId: 677,
      accounts: getAccounts(),
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;

