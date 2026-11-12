# DeadlineProof

On-chain deadline and task accountability dApp built on **BOT Chain Testnet**.

## Overview

DeadlineProof lets users create deadline-backed tasks assigned to EVM wallet addresses, submit completion claims before deadlines expire, verify deliverables on-chain, and cancel unfinalized tasks. Overdue status is derived dynamically from `block.timestamp` in view calls without requiring an extra transaction.

## Live Deployment (BOT Chain Testnet)

- **Network:** BOT Chain Testnet (Chain ID `968`)
- **Contract Address:** `0xE0B1EBE77001592DE74Eef4F38312FEA7B83F8B6`
- **Deployment Tx:** `0xc8376d6129be4e7ca45ab66cf2d97162db9e68d708c758bb78abc3db82b1b249`
- **Contract Explorer:** https://scan.bohr.life/address/0xE0B1EBE77001592DE74Eef4F38312FEA7B83F8B6
- **Tx Explorer:** https://scan.bohr.life/tx/0xc8376d6129be4e7ca45ab66cf2d97162db9e68d708c758bb78abc3db82b1b249

## Verified BOT Chain Network Parameters

From the official [BOT Chain Developer Docs](https://dev-docs.botchain.ai/docs/Developers/quick-guide/):

| Network | Chain ID | RPC URL | Native Token | Block Explorer |
| :--- | :--- | :--- | :--- | :--- |
| **BOT Chain Testnet** | `968` (`0x3c8`) | `https://rpc.bohr.life` | `BOT` ([Faucet](https://faucet.botchain.ai/basic)) | https://scan.bohr.life/ |
| **BOT Chain Mainnet** | `677` (`0x2a5`) | `https://rpc.botchain.ai` | `BOT` | https://scan.botchain.ai |

> **Note:** Official JSON-RPC documentation notes that `eth_getLogs` is disabled on the public Mainnet endpoint. `DeadlineProof` indexes per-user task IDs directly on-chain (`getMyTasks()`), so task lists and dashboard stats work without event-log scanning.

## Project Structure

- `contracts/DeadlineProof.sol` — Minimal, gas-efficient Solidity smart contract
- `test/DeadlineProof.test.ts` — Hardhat test suite covering permissions, deadlines, transitions, and dynamic overdue status
- `scripts/deploy.ts` — Hardhat deployment script (also syncs ABI & address into `frontend/src/config/deployment.json`)
- `frontend/` — Vite + React + TypeScript + Tailwind CSS + Reown AppKit + Wagmi v2 + Viem + Ethers v6 client

## Prerequisites

- Node.js 20+ and npm
- A dedicated deployer wallet funded with test `tBOT` from https://faucet.botchain.ai/basic
- A Reown Project ID from https://dashboard.reown.com (for WalletConnect/Reown AppKit QR modal; injected browser wallets work too)

> **Windows PowerShell note:** If `npm` fails with an execution policy error for `npm.ps1`, run commands with `npm.cmd` / `npx.cmd` or from Command Prompt (`cmd`).

## Smart Contract Setup, Testing & Deployment

1. Install root Hardhat dependencies:
   ```bash
   npm install
   ```

2. Compile and run the full test suite:
   ```bash
   npm run compile
   npm test
   ```

3. Configure your local root `.env` file:
   ```bash
   cp .env.example .env
   ```
   Add your funded dedicated testnet deployer private key to `DEPLOYER_PRIVATE_KEY` inside `.env`.

4. Deploy `DeadlineProof` to **BOT Chain Testnet (Chain ID 968)**:
   ```bash
   npm run deploy:testnet
   ```
   The deploy script outputs:
   - The deployed contract address
   - The deployment transaction hash and BOTScan link
   - Saves metadata to `deployments/botTestnet.json`
   - Automatically updates `frontend/src/config/deployment.json`

## Frontend Setup & Development

1. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Configure `frontend/.env` (optional if `deployment.json` was synced by the deploy script):
   ```bash
   cp .env.example .env
   ```
   Set `VITE_REOWN_PROJECT_ID` (and optionally `VITE_CONTRACT_ADDRESS`).

3. Start the dev server:
   ```bash
   npm run dev
   ```

4. Production build:
   ```bash
   npm run build
   ```

