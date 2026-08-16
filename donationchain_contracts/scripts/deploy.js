const hre = require("hardhat");

async function main() {
  const Registry = await hre.ethers.getContractFactory("DonationRegistry");
  const registry = await Registry.deploy();
  await registry.waitForDeployment();
  const address = await registry.getAddress();
  console.log("DonationRegistry deployed to:", address);
  console.log("Network:", hre.network.name);
  console.log("Save this address in donationchain/js/contract-config.js");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
