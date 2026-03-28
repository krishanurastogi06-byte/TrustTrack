require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");

const sepoliaRpcUrl = process.env.SEPOLIA_RPC_URL || process.env.ETHEREUM_RPC_URL || "";
const rawPrivateKey = process.env.DEPLOYER_PRIVATE_KEY || "";
const normalizedPrivateKey = rawPrivateKey.startsWith("0x") ? rawPrivateKey.slice(2) : rawPrivateKey;
const validPrivateKey = /^[0-9a-fA-F]{64}$/.test(normalizedPrivateKey)
  ? `0x${normalizedPrivateKey}`
  : "";

module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    sepolia: {
      url: sepoliaRpcUrl,
      accounts: validPrivateKey ? [validPrivateKey] : [],
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || "",
  },
};