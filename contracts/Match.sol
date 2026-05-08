// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// This interface lets Match.sol notify the Manager when a match ends,
// without importing the full Manager contract.
interface IManager {
    function notifyMatchEnded(address player1, address player2) external;
}

contract Match {
    address public immutable manager;

    uint256 public escrowBalance;
    uint256 public roundStartTime;

    uint256 public constant MOVE_TIMEOUT = 5 minutes;
    uint256 public constant WINNING_SCORE = 2;

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

    GameStatus public status;

    address[] public queue;

    Player public player1;
    Player public player2;

    event LobbyInitialized(address matchContract);
    event PlayerAddedToQueue(address player);
    event EscrowDeposited(address player, uint256 amount, uint256 escrowBalance);
    event MatchStarted(address player1, address player2);
    event MoveCommitted(address player);
    event RoundDraw(address player1, address player2);
    event RoundWon(address winner, uint256 player1Score, uint256 player2Score);
    event MatchResolved(address winner, uint256 rewardAmount);
    event MovesReset();

    constructor(address _managerAddress) {
        require(_managerAddress != address(0), "Invalid manager address");

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

    // Starts the lobby and moves the match into matchmaking status.
    function initializeLobby() external onlyManager {
        require(status == GameStatus.Initializing, "Already initialized");

        status = GameStatus.Matchmaking;

        emit LobbyInitialized(address(this));
    }

    // Called by Manager to add a player to this Match contract.
    function addToQueue(address _player) external onlyManager {
        require(_player != address(0), "Invalid player");
        require(status == GameStatus.Matchmaking, "Match not accepting players");
        require(queue.length < 2, "Queue is full");

        for (uint256 i = 0; i < queue.length; i++) {
            require(_player != queue[i], "Player already queued");
        }

        queue.push(_player);

        emit PlayerAddedToQueue(_player);
    }

    // Called by Manager to deposit a player's entry fee into escrow.
    function depositEntryFee(address player) external payable onlyManager {
        require(player != address(0), "Invalid player");
        require(msg.value > 0, "No entry fee sent");
        require(status == GameStatus.Matchmaking, "Escrow closed");

        escrowBalance += msg.value;

        emit EscrowDeposited(player, msg.value, escrowBalance);
    }

    // Returns true if enough players are queued to create a match.
    function QueueCheck() public view returns (bool) {
        return queue.length >= 2;
    }

    // Called by Manager when two players are ready.
    function CreateMatch() external onlyManager {
        require(status == GameStatus.Matchmaking, "Cannot create match now");
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

    // Returns true if the move timer has not expired.
    function WaitForMove() public view returns (bool) {
        return block.timestamp <= roundStartTime + MOVE_TIMEOUT;
    }

    // Players submit moves directly to the Match contract.
    // Once both players have submitted, the round is judged automatically.
    function CommitMove(Move _move) external onlyPlayers {
        require(status == GameStatus.WaitingForMoves, "Not waiting for moves");
        require(WaitForMove(), "Move timeout expired");
        require(_move != Move.None, "Invalid move");

        if (msg.sender == player1.addr) {
            require(player1.move == Move.None, "Already moved");
            player1.move = _move;
        } else {
            require(player2.move == Move.None, "Already moved");
            player2.move = _move;
        }

        emit MoveCommitted(msg.sender);

        if (player1.move != Move.None && player2.move != Move.None) {
            _judgeMoves();
        }
    }

    // Internal judging logic. This is triggered automatically by CommitMove().
    function _judgeMoves() internal {
        require(status == GameStatus.WaitingForMoves, "Not ready to judge");
        require(
            player1.move != Move.None && player2.move != Move.None,
            "Both players must submit moves"
        );

        status = GameStatus.JudgingMoves;

        if (player1.move == player2.move) {
            emit RoundDraw(player1.addr, player2.addr);
            _resetMoves();
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

        _checkScore();
    }

    // Checks whether either player has reached the winning score.
    function _checkScore() internal {
        status = GameStatus.ScoreCheck;

        if (player1.score >= WINNING_SCORE) {
            _resolveMatch(player1.addr);
        } else if (player2.score >= WINNING_SCORE) {
            _resolveMatch(player2.addr);
        } else {
            _resetMoves();
        }
    }

    // Pays escrow to the winner, notifies Manager, and resets this Match.
    function _resolveMatch(address winner) internal {
        require(winner == player1.addr || winner == player2.addr, "Invalid winner");

        status = GameStatus.Resolving;

        address p1 = player1.addr;
        address p2 = player2.addr;

        uint256 rewardAmount = escrowBalance;
        escrowBalance = 0;

        if (rewardAmount > 0) {
            (bool success, ) = payable(winner).call{value: rewardAmount}("");
            require(success, "Reward transfer failed");
        }

        emit MatchResolved(winner, rewardAmount);

        IManager(manager).notifyMatchEnded(p1, p2);

        delete player1;
        delete player2;
        delete queue;

        status = GameStatus.Matchmaking;
    }

    // Resets moves and starts the next round.
    function _resetMoves() internal {
        player1.move = Move.None;
        player2.move = Move.None;

        roundStartTime = block.timestamp;
        status = GameStatus.WaitingForMoves;

        emit MovesReset();
    }
}
