import { network } from "hardhat";

const { ethers } = await network.connect();

const Manager = await ethers.getContractFactory("Manager");
const manager = await Manager.deploy();
await manager.waitForDeployment();

const address = await manager.getAddress();
console.log("MANAGER_ADDRESS=" + address);
