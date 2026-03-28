const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const networkName = hre.network.name;

  const configuredOwner = process.env.DONATION_ADMIN_ADDRESS || "";
  const ownerAddress = hre.ethers.isAddress(configuredOwner) ? configuredOwner : deployer.address;

  console.log("Deploying Donation contract...");
  console.log("Network:", networkName);
  console.log("Deployer:", deployer.address);
  console.log("Owner:", ownerAddress);

  const Donation = await hre.ethers.getContractFactory("Donation");
  const contract = await Donation.deploy(ownerAddress);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("Donation contract deployed at:", address);

  const artifact = await hre.artifacts.readArtifact("Donation");

  const deploymentOutput = {
    network: networkName,
    address,
    deployer: deployer.address,
    owner: ownerAddress,
    deployedAt: new Date().toISOString(),
    abi: artifact.abi,
  };

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(deploymentsDir, { recursive: true });

  const outputFile = path.join(deploymentsDir, `${networkName}.donation.json`);
  fs.writeFileSync(outputFile, JSON.stringify(deploymentOutput, null, 2));
  console.log("Deployment artifact saved:", outputFile);

  const frontendAbiDir = path.join(__dirname, "..", "..", "frontend", "src", "lib", "contracts");
  fs.mkdirSync(frontendAbiDir, { recursive: true });

  const frontendAbiFile = path.join(frontendAbiDir, "donationAbi.json");
  fs.writeFileSync(frontendAbiFile, JSON.stringify(artifact.abi, null, 2));
  console.log("Frontend ABI updated:", frontendAbiFile);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});