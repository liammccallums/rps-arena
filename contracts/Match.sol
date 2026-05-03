// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Match {
    // Game status: Initializing, Matchmaking (not enough players), Started (starts the game, adds player details), WaitingForMoves, JudgingMoves, ScoreCheck, Resolving.

    //State-Variables:
    //Queue
    //Current game player1, player 2

    //Functions:
    //InitializeLobby() - starts up the queue and moves to matchmaking status.
    //QueueCheck() - waits for two players to match up.
    //
    //CreateMatch() - matches two players and adds their details to state variables.
    //WaitForMove() - waits for two players to make their moves, timer for 10sec.
    //
    //CommitMove() - adds players move to their obj.
    //
    //JudgeMoves() - judges the two moves to see who won and adds points to winner score.
    //
    //CheckScore() - checks the players score to see if a player has won.
    //
    //ResolveRound() - if player has won, assign their eth reward and reset match variables for next game, send players back to manager.
    //               - if player has not won, reset moves and start the next round.
}