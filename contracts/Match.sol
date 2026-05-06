// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// This interface lets Match.sol call only the Manager function it needs, without importing the full Manager contract.
interface IManager {
    function notifyMatchEnded(address player1, address player2) external;
}

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

    modifier onlyPlayers() {
        require(
            msg.sender == player1.addr || msg.sender == player2.addr,
            "Not a player"
        );
        _;
    }
    
    // Game status: Initializing, Matchmaking (not enough players), Started (starts the game, adds player details), WaitingForMoves, JudgingMoves, ScoreCheck, Resolving.
    enum GameStatus {
        Initializing,
        Matchmaking,
        Started,
        WaitingForMoves,
        JudgingMoves,
        ScoreCheck,
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

    // STATE VARIABLES
    GameStatus public status;

    uint256 public roundStartTime;
    uint256 public constant MOVE_TIMEOUT = 10 seconds;

    // Queue 
    address[] public queue;

    // Current game player1, player 2
    Player public player1;
    Player public player2;

    // Added Events to help with debugging, testing, and showing contract activity in the demo.
    event LobbyInitialized(address matchContract);
    event PlayerAddedToQueue(address player);
    event MatchStarted(address player1, address player2);
    event MoveCommitted(address player);
    event RoundDraw(address player1, address player2);
    event RoundWon(address winner, uint256 player1Score, uint256 player2Score);
    event MatchResolved(address winner, uint256 rewardAmount);
    event MovesReset();

    // FUNCTIONS
    // InitializeLobby() - starts up the queue and moves to matchmaking status.
    function initializeLobby() external onlyManager {
        require(status == GameStatus.Initializing, "Already initialized");

        status = GameStatus.Matchmaking;

        emit LobbyInitialized(address(this));
    }

    // AddToQueue() - Called by manager.
    function addToQueue(address _player) external onlyManager {
        require(_player != address(0), "Invalid player");
        require(status == GameStatus.Matchmaking || status == GameStatus.Initializing, "Match not accepting players");
        require(queue.length < 2, "Queue is full");
        require(_player != queue[0], "Player already queued");

        queue.push(_player);

        emit PlayerAddedToQueue(_player);
    }

    // QueueCheck() - waits for two players to match up.
    function QueueCheck() public view returns (bool) {
        return queue.length >= 2;
    }

    // CreateMatch() - matches two players and adds their details to state variables.
    function CreateMatch() external onlyManager {
        require(status == GameStatus.Matchmaking || status == GameStatus.Initializing, "Cannot create match now");
        require(queue.length >= 2, "Not enough players");
        require(queue[0] != queue[1], "Players must be different");

        status = GameStatus.Started;

        player1 = Player(queue[0], 0, Move.None);
        player2 = Player(queue[1], 0, Move.None);

        delete queue;

        roundStartTime = block.timestamp;
        status = GameStatus.WaitingForMoves;

        emit MatchStarted(player1.addr, player2.addr);
    }

    // WaitForMove() - waits for two players to make their moves, timer for 10sec.
    function WaitForMove() public view returns (bool) {
        return block.timestamp <= roundStartTime + MOVE_TIMEOUT;
    }

    // CommitMove() - adds players move to their object
    // This is a simplified version. Future extention may include commit-reveal functionality. 
    function CommitMove(Move _move) external onlyPlayers {
        require(status == GameStatus.WaitingForMoves, "Not waiting for moves");
        require(WaitForMove(), "Move timeout expired");
        require(_move != Move.None, "Invalid move");

        if (msg.sender == player1.addr) {
            require(player1.move == Move.None, "Already moved");
            player1.move = _move;
        } else if (msg.sender == player2.addr) {
            require(player2.move == Move.None, "Already moved");
            player2.move = _move;
        }

        emit MoveCommitted(msg.sender);
    }

    // JudgeMoves() - judges the two moves to see who won and adds points to winner score.
    function JudgeMoves() external onlyManager {
        require(status == GameStatus.WaitingForMoves, "Not ready to judge");
        require(
            player1.move != Move.None && player2.move != Move.None,
            "Both players must submit moves"
        );

        status = GameStatus.JudgingMoves;

        if (player1.move == player2.move) {
            emit RoundDraw(player1.addr, player2.addr);
            ResetMoves();
            return;
        }

        bool player1Wins =
            (player1.move == Move.Rock && player2.move == Move.Scissors) ||
            (player1.move == Move.Paper && player2.move == Move.Rock) ||
            (player1.move == Move.Scissors && player2.move == Move.Paper);

        if (player1Wins) {
            player1.score++;
            emit RoundWon(player1.addr, player1.score, player2.score);
        } else {
            player2.score++;
            emit RoundWon(player2.addr, player1.score, player2.score);
        }

        CheckScore();
    }

    // CheckScore() - checks the players score to see if a player has won.
    function CheckScore() internal {
        status = GameStatus.ScoreCheck;

        if (player1.score >= 2) {
            ResolveRound(player1.addr);
        } else if (player2.score >= 2) {
            ResolveRound(player2.addr);
        } else {
            ResetMoves();
        }
    }

    // ResolveRound() - if player has won, assign their eth reward and reset match variables for next game, send players back to manager.
    //                - if player has not won, reset moves and start the next round.
    function ResolveRound(address winner) internal {
        require(winner == player1.addr || winner == player2.addr, "Invalid winner");

        status = GameStatus.Resolving;

        // Store player addresses before deleting player data.
        // If we delete first, player1.addr and player2.addr become address(0).
        address p1 = player1.addr;
        address p2 = player2.addr;

        uint256 rewardAmount = address(this).balance;

        if (rewardAmount > 0) {
            (bool success, ) = payable(winner).call{value: rewardAmount}("");
            require(success, "Reward transfer failed");
        }

        emit MatchResolved(winner, rewardAmount);

        // Notifies Manager: Match has ended
        IManager(manager).notifyMatchEnded(p1, p2);

        delete player1;
        delete player2;
        delete queue;

        status = GameStatus.Matchmaking;
    }

    function ResetMoves() internal {
        player1.move = Move.None;
        player2.move = Move.None;

        roundStartTime = block.timestamp;
        status = GameStatus.WaitingForMoves;

        emit MovesReset();
    }

    receive() external payable {}
}
