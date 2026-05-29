import { network } from "hardhat";

const { ethers } = await network.connect();

const signers = await ethers.getSigners();
const deployer = signers[7];

const Manager = await ethers.getContractFactory("Manager", deployer);
const manager = await Manager.deploy();
await manager.waitForDeployment();

const address = await manager.getAddress();
console.log("DEPLOYER=" + deployer.address);
console.log("MANAGER_ADDRESS=" + address);
