// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Match {

    constructor(
    address _managerAddress
    ) {}
    
    // Game status: Initializing, Matchmaking (not enough players), Started (starts the game, adds player details), WaitingForMoves, JudgingMoves, ScoreCheck, Resolving.
    enum GameStatus {
        Initializing,
        Mathmaking,
        Started,
        WaitingForMoves,
        JudgingMoves,
        Resolving
    }

    enum MoveType {
        None,
        Rock,
        Paper,
        Scissors
    }
    
    struct Player {
        address addr;
        int score;
        Move move;
    }

    //State-Variables:

    //Queue 
    address[] public queue;

    //Current game player1, player 2
    Player public player1;
    Player public player2;

    //Functions:

    //InitializeLobby() - starts up the queue and moves to matchmaking status.

    function initializeLobby() external {
        require(status == GameStatus.Initializing, "Already initialized");
        status = GameStatus.Matchmaking;
    }

    //AddToQueue() - Called by manager. Adds player to queue.

    function addToQueue(address _player) external {
        queue.push(_player);
    }

    //QueueCheck() - waits for two players to match up.
    
    function QueueCheck() public view returns (bool) {
        return queue.length >= 2;
    }

    //CreateMatch() - matches two players and adds their details to state variables.
    
    function CreateMatch() external {
        require(queue.length >= 2, "Not enough players");

        player1 = Player(queue[0], 0, Move.None);
        player2 = Player(queue[1], 0, Move.None);

        delete queue;
        roundStartTime = block.timestamp;
    }

    //WaitForMove() - waits for two players to make their moves, timer for 10sec.

    function WaitForMove() public view returns (bool) {
        return block.timestamp <= roundStartTime + MOVE_TIMEOUT;
    }


    //CommitMove() - adds players move to their obj.

    function CommitMove(Move _move) external {
        require(_move != Move.None, "Invalid move");

        if (msg.sender == player1._addr) {
            require(player1._move == Move.None, "Already moved");
            player1._move = _move;
        } else if (msg.sender == player2._addr) {
            require(player2._move == Move.None, "Already moved");
            player2._move = _move;
        } else {
            revert("Not a player");
        }
    }
    //
    //JudgeMoves() - judges the two moves to see who won and adds points to winner score.

    function JudgeMoves() external {
        require(
            player1._move != Move.None && player2._move != Move.None,
            "No moves submitted"
        );

        if (player1._move == player2._move) {
            ResetMoves();
            return;
        }

        bool player1Wins =
            (player1._move == Move.Rock && player2._move == Move.Scissors) ||
            (player1._move == Move.Paper && player2._move == Move.Rock) ||
            (player1._move == Move.Scissors && player2._move == Move.Paper);

        if (player1Wins) {
            player1.score++;
        } else {
            player2.score++;
        }
    }
    //CheckScore() - checks the players score to see if a player has won.

    function CheckScore() internal {
        if (player1.score >= 2) {
            ResolveRound(player1._addr);
        } else if (player2.score >= 2) {
            ResolveRound(player2._addr);
        } else {
            ResetMoves();
        }
    }

    //ResolveRound() - if player has won, assign their eth reward and reset match variables for next game, send players back to manager.
    //               - if player has not won, reset moves and start the next round.

    function ResolveRound(address winner) internal {
        payable(winner).transfer(address(this).balance);

        delete player1;
        delete player2;
    }

    function ResetMoves() internal {
        player1._move = Move.None;
        player2._move = Move.None;
        roundStartTime = block.timestamp;
    }
}
