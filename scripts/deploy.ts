import { ethers, network, artifacts } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const EXPLORER_BY_CHAIN_ID: Record<number, string> = {
  968: "https://scan.bohr.life",
  677: "https://scan.botchain.ai",
};

async function main() {
  const [deployer] = await ethers.getSigners();
  if (!deployer) {
    throw new Error(
      "No deployer account configured. Set DEPLOYER_PRIVATE_KEY in your root .env file first."
    );
  }

  const net = await ethers.provider.getNetwork();
  const chainId = Number(net.chainId);
  const balance = await ethers.provider.getBalance(deployer.address);
  const explorerBase = EXPLORER_BY_CHAIN_ID[chainId] || "";

  console.log(`\nDeploying DeadlineProof to network: ${network.name} (chainId: ${chainId})`);
  console.log(`Deployer address: ${deployer.address}`);
  console.log(`Deployer balance: ${ethers.formatEther(balance)} BOT`);

  if (balance === 0n) {
    const hint =
      chainId === 968
        ? " Claim test tBOT from https://faucet.botchain.ai/basic first."
        : "";
    throw new Error(`Deployer account has 0 BOT balance.${hint}`);
  }

  const factory = await ethers.getContractFactory("DeadlineProof");
  const contract = await factory.deploy();
  const tx = contract.deploymentTransaction();

  console.log(`Deployment tx submitted: ${tx?.hash ?? "unknown"}`);
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  console.log(`\nDeadlineProof deployed at: ${contractAddress}`);
  if (explorerBase) {
    console.log(`Contract Explorer: ${explorerBase}/address/${contractAddress}`);
    if (tx?.hash) {
      console.log(`Tx Explorer:       ${explorerBase}/tx/${tx.hash}`);
    }
  }

  // Persist deployment metadata & sync ABI/address into frontend config for non-ephemeral networks
  const artifact = await artifacts.readArtifact("DeadlineProof");
  const deploymentPayload = {
    network: network.name,
    chainId,
    contractAddress,
    txHash: tx?.hash ?? "",
    deployedAt: new Date().toISOString(),
  };

  if (network.name !== "hardhat" && network.name !== "localhost") {
    const deploymentsDir = path.join(__dirname, "..", "deployments");
    fs.mkdirSync(deploymentsDir, { recursive: true });
    fs.writeFileSync(
      path.join(deploymentsDir, `${network.name}.json`),
      JSON.stringify(deploymentPayload, null, 2)
    );

    const frontendConfigDir = path.join(__dirname, "..", "frontend", "src", "config");
    if (fs.existsSync(frontendConfigDir)) {
      fs.writeFileSync(
        path.join(frontendConfigDir, "deployment.json"),
        JSON.stringify(
          {
            ...deploymentPayload,
            abi: artifact.abi,
          },
          null,
          2
        )
      );
      console.log(`Synced ABI & deployed address to frontend/src/config/deployment.json`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

