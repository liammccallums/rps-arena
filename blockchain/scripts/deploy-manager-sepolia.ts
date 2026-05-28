import { network } from "hardhat";

const { ethers } = await network.create();

const [deployer] = await ethers.getSigners();
const balance = await ethers.provider.getBalance(deployer.address);

console.log("Deploying Manager to Sepolia...");
console.log("DEPLOYER=" + deployer.address);
console.log("BALANCE_BEFORE_ETH=" + ethers.formatEther(balance));

const manager = await ethers.deployContract("Manager");
await manager.waitForDeployment();

const managerAddress = await manager.getAddress();
const matchCount = await manager.getMatchCount();

console.log("MANAGER_ADDRESS=" + managerAddress);
console.log("MATCH_COUNT=" + matchCount.toString());

for (let i = 0; i < Number(matchCount); i++) {
  const matchAddress = await manager.getMatchAddress(i);
  console.log(`MATCH_${i}_ADDRESS=${matchAddress}`);
}
