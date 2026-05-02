// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IRules {
    enum MoveTypes {
        None,
        Rock,
        Paper,
        Scissors
    }

    enum Result {
        Draw,
        Player1Wins,
        Player2Wins
    }

    function resolve(MoveTypes p1, MoveTypes p2) external pure returns (Result);
}

//MATCHMAKER CONTRACT
//Responsible for match lifecycle, fairness, and state

//Write events.

//if 1 round is best of 3 matches:
//function to resolve winner for the round.

contract Matchmaker {
    IRules public rules;

    // Fields / types
    address public player1address;
    address public player2address;

    bool public player1committed;
    bool public player2committed;

    Player public player1;
    Player public player2;

    MatchStatus public status;

    string public winner;

    // struct Match {
    //     address player1address;
    //     address player2address;
    //     uint16 rounds;
    //     uint16 limit;
    //     MatchStatus status;
    // }

    struct Player {
        address playerAddress;
        PlayerStatus status;
        MoveTypes move;
        uint16 score;
    }

    //Match phase enum: Commit, reveal, resolved

    enum MatchStatus {
        Initialising,
        Waiting,
        Revealed,
        Resolved,
        Completed
    }

    // Player status enum: Initialised, Committed, Resolved.
    //Initialised - Match has begun, waiting for commits from both parties.
    //Committed - Both parties have committed their move, calculating winner, announce winner.
    //Resolved - Match finalised, receive their reward.
    enum PlayerStatus {
        Initialised,
        Queued,
        Committed,
        Resolved
    }

    //Move types: one for each move in the game.
    enum MoveTypes {
        None,
        Rock,
        Paper,
        Scissors
    }

    // Constructor
    constructor(
        address _player1address,
        address _player2address,
        address _rulesAddress
    ) {
        player1address = _player1address;
        player2address = _player2address;
        rules = IRules(_rulesAddress);

        initialiseMatch();
        status = MatchStatus.Initialising;
    }

    function nextStage() external {
        if(status == MatchStatus.Initialising){
            initialiseMatch();
        }
        else if(status == MatchStatus.Waiting){
            while(player1.move == MoveTypes.None || player2.move == MoveTypes.None){}
            status = MatchStatus.Revealed;
        }
        else if(status == MatchStatus.Revealed){
            resolveRound();
        }
        else if(status == MatchStatus.Resolved){
            CheckScore();
        }
    }

    //Match setup function
    function initialiseMatch() private {
        player1 = Player(
            player1address,
            PlayerStatus.Initialised,
            MoveTypes.None,
            0
        );
        player2 = Player(
            player2address,
            PlayerStatus.Initialised,
            MoveTypes.None,
            0
        );
        status = MatchStatus.Waiting;
    }

    //Commit move function
    function CommitMove(uint16 _move) public {
        require(
            status == MatchStatus.Waiting,
            "Match must be in waiting status."
        );
        require(
            msg.sender == player1address || msg.sender == player2address,
            "Only a player can commit a move"
        );
        require(
            _move >= 1 && _move <= 3,
            "Move must be Rock, Paper or Scissors"
        );

        if (msg.sender == player1address) {
            require(
                player1.move == MoveTypes.None,
                "Player 1 has already committed a move"
            );

            if (_move == 1) {
                player1.move = MoveTypes.Rock;
            } else if (_move == 2) {
                player1.move = MoveTypes.Paper;
            } else if (_move == 3) {
                player1.move = MoveTypes.Scissors;
            }

            player1.status = PlayerStatus.Committed;
        } else if (msg.sender == player2address) {
            require(
                player2.move == MoveTypes.None,
                "Player 2 has already committed a move"
            );

            if (_move == 1) {
                player2.move = MoveTypes.Rock;
            } else if (_move == 2) {
                player2.move = MoveTypes.Paper;
            } else if (_move == 3) {
                player2.move = MoveTypes.Scissors;
            }

            player2.status = PlayerStatus.Committed;
        }
    }

    //Resolve the round
    function resolveRound() private {
        require(
            player1committed && player2committed,
            "Both players must commit first"
        );
        require(status == MatchStatus.Waiting, "Match already resolved");

        IRules.Result result = rules.resolve(IRules.MoveTypes(uint8(player1.move)), IRules.MoveTypes(uint8(player2.move)));

        if (result == IRules.Result.Player1Wins) {
            player1.score++;
        } else if (result == IRules.Result.Player2Wins) {
            player2.score++;
        }

        status = MatchStatus.Resolved;
        player1.status = PlayerStatus.Resolved;
        player2.status = PlayerStatus.Resolved;
    }

    function CheckScore() private {
        if (player1.score == 2) {winner = "Player1";}
        if (player2.score == 2) {winner = "Player2";}
        else {
            //Initialise next round of the game
        }
    }

    function restartRound() private {
        player1.move = MoveTypes.None;
        player2.move = MoveTypes.None;

    }

    // Modifiers?
}