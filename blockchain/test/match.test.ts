import { expect } from "chai";
import { network } from "hardhat";

describe("Manager and Match", function () {
  async function deployFixture() {
    const { ethers } = await network.connect();
    const [admin, player1, player2, outsider] = await ethers.getSigners();

    const Manager = await ethers.getContractFactory("Manager");
    const manager = await Manager.deploy();

    const matchAddress = await manager.getMatchAddress(0);
    const match = await ethers.getContractAt("Match", matchAddress);

    return { ethers, manager, match, admin, player1, player2, outsider };
  }

  async function assignTwoPlayers(manager: any, ethers: any, player1: any, player2: any) {
    await manager.connect(player1).assignPlayer({
      value: ethers.parseEther("0.001"),
    });

    await manager.connect(player2).assignPlayer({
      value: ethers.parseEther("0.001"),
    });
  }

  async function commitAndReveal(
    match: any,
    ethers: any,
    player: any,
    move: number,
    secretText: string
  ) {
    const secret = ethers.encodeBytes32String(secretText);

    const commitment = await match.generateCommitment(
      move,
      secret,
      player.address
    );

    await match.connect(player).CommitMove(commitment);

    return { secret, commitment };
  }

  describe("Deployment", function () {
    it("deploys three match contracts", async function () {
      const { manager } = await deployFixture();

      expect(await manager.getMatchCount()).to.equal(3);
    });

    it("initialises match contracts in matchmaking status", async function () {
      const { match } = await deployFixture();

      expect(await match.status()).to.equal(1);
    });
  });

  describe("Matchmaking", function () {
    it("assigns two players and starts a match", async function () {
      const { ethers, manager, match, player1, player2 } = await deployFixture();

      await assignTwoPlayers(manager, ethers, player1, player2);

      expect(await manager.activePlayer(player1.address)).to.equal(true);
      expect(await manager.activePlayer(player2.address)).to.equal(true);
      expect(await match.status()).to.equal(3);

      const p1 = await match.player1();
      const p2 = await match.player2();

      expect(p1.addr).to.equal(player1.address);
      expect(p2.addr).to.equal(player2.address);
    });

    it("rejects incorrect entry fee", async function () {
      const { ethers, manager, player1 } = await deployFixture();

      await expect(
        manager.connect(player1).assignPlayer({
          value: ethers.parseEther("0.5"),
        })
      ).to.be.revertedWith("Incorrect entry fee");
    });

    it("prevents the same player from joining twice", async function () {
      const { ethers, manager, player1 } = await deployFixture();

      await manager.connect(player1).assignPlayer({
        value: ethers.parseEther("0.001"),
      });

      await expect(
        manager.connect(player1).assignPlayer({
          value: ethers.parseEther("0.001"),
        })
      ).to.be.revertedWith("Player already active");
    });
  });

  describe("Commit reveal", function () {
    it("stores commitments without revealing moves", async function () {
      const { ethers, manager, match, player1, player2 } = await deployFixture();

      await assignTwoPlayers(manager, ethers, player1, player2);

      const p1Secret = ethers.encodeBytes32String("p1-secret");
      const p2Secret = ethers.encodeBytes32String("p2-secret");

      const p1Commitment = await match.generateCommitment(1, p1Secret, player1.address);
      const p2Commitment = await match.generateCommitment(3, p2Secret, player2.address);

      await match.connect(player1).CommitMove(p1Commitment);
      await match.connect(player2).CommitMove(p2Commitment);

      const p1 = await match.player1();
      const p2 = await match.player2();

      expect(p1.commitment).to.equal(p1Commitment);
      expect(p2.commitment).to.equal(p2Commitment);
      expect(p1.move).to.equal(0);
      expect(p2.move).to.equal(0);
      expect(p1.revealed).to.equal(false);
      expect(p2.revealed).to.equal(false);
    });

    it("rejects an invalid reveal", async function () {
      const { ethers, manager, match, player1, player2 } = await deployFixture();

      await assignTwoPlayers(manager, ethers, player1, player2);

      const correctSecret = ethers.encodeBytes32String("correct");
      const wrongSecret = ethers.encodeBytes32String("wrong");
      const p2Secret = ethers.encodeBytes32String("p2-secret");

      const p1Commitment = await match.generateCommitment(1, correctSecret, player1.address);
      const p2Commitment = await match.generateCommitment(3, p2Secret, player2.address);

      await match.connect(player1).CommitMove(p1Commitment);
      await match.connect(player2).CommitMove(p2Commitment);

      await expect(
        match.connect(player1).RevealMove(1, wrongSecret)
      ).to.be.revertedWith("Invalid reveal");
    });
  });

  describe("Scoring and reset", function () {
    it("awards one round to player 1 and resets moves", async function () {
      const { ethers, manager, match, player1, player2 } = await deployFixture();

      await assignTwoPlayers(manager, ethers, player1, player2);

      const p1 = await commitAndReveal(match, ethers, player1, 1, "p1-rock");
      const p2 = await commitAndReveal(match, ethers, player2, 3, "p2-scissors");

      await match.connect(player1).RevealMove(1, p1.secret);
      await match.connect(player2).RevealMove(3, p2.secret);

      const playerOne = await match.player1();
      const playerTwo = await match.player2();

      expect(playerOne.score).to.equal(1);
      expect(playerTwo.score).to.equal(0);
      expect(playerOne.move).to.equal(0);
      expect(playerTwo.move).to.equal(0);
      expect(playerOne.revealed).to.equal(false);
      expect(playerTwo.revealed).to.equal(false);
    });

    it("handles a drawn round and resets without changing score", async function () {
      const { ethers, manager, match, player1, player2 } = await deployFixture();

      await assignTwoPlayers(manager, ethers, player1, player2);

      const p1 = await commitAndReveal(match, ethers, player1, 1, "p1-rock");
      const p2 = await commitAndReveal(match, ethers, player2, 1, "p2-rock");

      await match.connect(player1).RevealMove(1, p1.secret);
      await match.connect(player2).RevealMove(1, p2.secret);

      const playerOne = await match.player1();
      const playerTwo = await match.player2();

      expect(playerOne.score).to.equal(0);
      expect(playerTwo.score).to.equal(0);
      expect(await match.status()).to.equal(3);
    });
  });

  describe("Match resolution and escrow", function () {
    it("runs a full match and pays escrow to the winner", async function () {
      const { ethers, manager, match, player1, player2 } = await deployFixture();

      await assignTwoPlayers(manager, ethers, player1, player2);

      const player1BalanceBefore = await ethers.provider.getBalance(player1.address);

      const round1P1 = await commitAndReveal(match, ethers, player1, 1, "round1-p1");
      const round1P2 = await commitAndReveal(match, ethers, player2, 3, "round1-p2");

      await match.connect(player1).RevealMove(1, round1P1.secret);
      await match.connect(player2).RevealMove(3, round1P2.secret);

      const round2P1 = await commitAndReveal(match, ethers, player1, 2, "round2-p1");
      const round2P2 = await commitAndReveal(match, ethers, player2, 1, "round2-p2");

      await match.connect(player1).RevealMove(2, round2P1.secret);

      const revealTx = await match.connect(player2).RevealMove(1, round2P2.secret);
      const receipt = await revealTx.wait();

      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      const player1BalanceAfter = await ethers.provider.getBalance(player1.address);

      expect(player1BalanceAfter).to.be.greaterThan(player1BalanceBefore);

      expect(await match.escrowBalance()).to.equal(0);
      expect(await match.status()).to.equal(1);

      expect(await manager.activePlayer(player1.address)).to.equal(false);
      expect(await manager.activePlayer(player2.address)).to.equal(false);
    });
  });

  describe("Failure cases", function () {
    it("prevents outsiders from committing moves", async function () {
      const { ethers, manager, match, player1, player2, outsider } = await deployFixture();

      await assignTwoPlayers(manager, ethers, player1, player2);

      const secret = ethers.encodeBytes32String("outsider");
      const commitment = await match.generateCommitment(1, secret, outsider.address);

      await expect(
        match.connect(outsider).CommitMove(commitment)
      ).to.be.revertedWith("Not a player");
    });

    it("prevents duplicate commitments", async function () {
      const { ethers, manager, match, player1, player2 } = await deployFixture();

      await assignTwoPlayers(manager, ethers, player1, player2);

      const secret = ethers.encodeBytes32String("p1-secret");
      const commitment = await match.generateCommitment(1, secret, player1.address);

      await match.connect(player1).CommitMove(commitment);

      await expect(
        match.connect(player1).CommitMove(commitment)
      ).to.be.revertedWith("Already committed");
    });
  });
});