// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Match {

    address public manager;

    constructor(
        address _managerAddress
    ) {
        manager = _managerAddress;
        status = GameStatus.Initializing;
    }

    modifier onlyManager() {
        require(msg.sender == manager, "Only manager");
        _;
    }
    
    // Game status: Initializing, Matchmaking (not enough players), Started (starts the game, adds player details), WaitingForMoves, JudgingMoves, ScoreCheck, Resolving.
    enum GameStatus {
        Initializing,
        Matchmaking,
        Started,
        WaitingForMoves,
        JudgingMoves,
        Resolving
    }

    enum Move {
        None,
        Rock,
        Paper,
        Scissors
    }
    
    struct Player {
        address addr;
        uint256 score;
        Move move;
    }

    //State-Variables:

    GameStatus public status;

    uint256 public roundStartTime;
    uint256 public constant MOVE_TIMEOUT = 10 seconds;

    //Queue 
    address[] public queue;

    //Current game player1, player 2
    Player public player1;
    Player public player2;

    //Functions:

    //InitializeLobby() - starts up the queue and moves to matchmaking status.

    function initializeLobby() external onlyManager {
        require(status == GameStatus.Initializing, "Already initialized");
        status = GameStatus.Matchmaking;
    }

    //AddToQueue() - Called by manager. Adds player to queue.

    function addToQueue(address _player) external onlyManager {
        queue.push(_player);
    }

    //QueueCheck() - waits for two players to match up.
    
    function QueueCheck() public view returns (bool) {
        return queue.length >= 2;
    }

    //CreateMatch() - matches two players and adds their details to state variables.
    
    function CreateMatch() external onlyManager {
        require(queue.length >= 2, "Not enough players");

        player1 = Player(queue[0], 0, Move.None);
        player2 = Player(queue[1], 0, Move.None);

        delete queue;
        roundStartTime = block.timestamp;
        status = GameStatus.WaitingForMoves;
    }

    //WaitForMove() - waits for two players to make their moves, timer for 10sec.

    function WaitForMove() public view returns (bool) {
        return block.timestamp <= roundStartTime + MOVE_TIMEOUT;
    }

    //CommitMove() - adds players move to their obj.

    function CommitMove(Move _move) external {
        require(_move != Move.None, "Invalid move");

        if (msg.sender == player1.addr) {
            require(player1.move == Move.None, "Already moved");
            player1.move = _move;
        } else if (msg.sender == player2.addr) {
            require(player2.move == Move.None, "Already moved");
            player2.move = _move;
        } else {
            revert("Not a player");
        }
    }

    //
    //JudgeMoves() - judges the two moves to see who won and adds points to winner score.

    function JudgeMoves() external onlyManager {
        require(
            player1.move != Move.None && player2.move != Move.None,
            "No moves submitted"
        );

        if (player1.move == player2.move) {
            ResetMoves();
            return;
        }

        bool player1Wins =
            (player1.move == Move.Rock && player2.move == Move.Scissors) ||
            (player1.move == Move.Paper && player2.move == Move.Rock) ||
            (player1.move == Move.Scissors && player2.move == Move.Paper);

        if (player1Wins) {
            player1.score++;
        } else {
            player2.score++;
        }

        CheckScore();
    }

    //CheckScore() - checks the players score to see if a player has won.

    function CheckScore() internal {
        if (player1.score >= 2) {
            ResolveRound(player1.addr);
        } else if (player2.score >= 2) {
            ResolveRound(player2.addr);
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

        status = GameStatus.Matchmaking;

        // Notifies Manager Match has ended
        Manager(manager).notifyMatchEnded(
            player1.addr,
            player2.addr
        );

    }

    function ResetMoves() internal {
        player1.move = Move.None;
        player2.move = Move.None;
        roundStartTime = block.timestamp;
        status = GameStatus.WaitingForMoves;
    }

    receive() external payable {}
}

