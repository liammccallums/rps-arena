import { network } from "hardhat";

const { ethers } = await network.create();

const [deployer] = await ethers.getSigners();

if (!deployer) {
	throw new Error(
		"No deployer signer is available. Configure the selected network with an account before deploying."
	);
}

const Manager = await ethers.getContractFactory("Manager", deployer);
const manager = await Manager.deploy();
await manager.waitForDeployment();

const address = await manager.getAddress();
console.log("DEPLOYER=" + deployer.address);
console.log("MANAGER_ADDRESS=" + address);
