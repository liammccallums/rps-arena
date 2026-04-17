// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

//MATCHMAKER CONTRACT
//Responsible for match lifecycle, fairness, and state

//Reveal move function

//resolve round function - send moves to Rules.sol Contract for logic handling

//something like this:
/*
if result == P1_WINS:
    winsP1++ // tally of how many matches won in round
else if result == P2_WINS:
    winsP2++
*/

//Write events.

//if 1 round is best of 3 matches:
//function to resolve winner for the round.

contract Matchmaker {
    // Fields / types
    address public player1address;
    address public player2address;

    bool public player1committed;
    bool public player2committed;

    Player public player1;
    Player public player2;

    MatchStatus public status;

    struct Player {
        address playerAddress;
        PlayerStatus status;
        MoveTypes move;
    }

    //Match phase enum: Commit, reveal, resolved
    
    enum MatchStatus {
        Initialising,
        Waiting,
        Revealed,
        Resolved
    }

    // Player status enum: Initialised, Committed, Resolved.
    //Initialised - Match has begun, waiting for commits from both parties.
    //Committed - Both parties have committed their move, calculating winner, announce winner.
    //Resolved - Match finalised, receive their reward.
    enum PlayerStatus {
        Initialised,
        Committed,
        Resolved
    }

    //Move types: one for each move in the game.
    enum MoveTypes {
        None,
        Scissors,
        Paper,
        Rock
    }

    // Constructor
    constructor(address _player1address, address _player2address) {
        player1address = _player1address;
        player2address = _player2address;

        initialiseMatch();
        status = MatchStatus.Initialising;
    }

    //Match setup function
    function initialiseMatch() private {
        player1 = Player(
            player1address,
            PlayerStatus.Initialised,
            MoveTypes.None
        );
        player2 = Player(
            player2address,
            PlayerStatus.Initialised,
            MoveTypes.None
        );
        status = MatchStatus.Waiting;
    }

    //Commit move function
    function CommitMove(uint16 _move) public {
        require(status == MatchStatus.Waiting, "Match must be in waiting status.");
        require(
            msg.sender == player1address || msg.sender == player2address,
            "Only a player can commit a move"
        );
        require(_move >= 1 && _move <= 3,"Move must be Rock, Paper or Scissors");
    
        if (msg.sender == player1address) {
            require(player1.move == MoveTypes.None,"Player 1 has already committed a move");

            if(_move == 1){
                player1.move = MoveTypes.Rock;
            } else if(_move == 2){
                player1.move = MoveTypes.Paper;
            } else if(_move == 3){
                player1.move = MoveTypes.Scissors;
            }

            player1.status = PlayerStatus.Committed;
        } else if (msg.sender == player2address) {
            require(player2.move == MoveTypes.None,"Player 2 has already committed a move");

            if(_move == 1){
                player2.move = MoveTypes.Rock;
            } else if(_move == 2){
                player2.move = MoveTypes.Paper;
            } else if(_move == 3){
                player2.move = MoveTypes.Scissors;
            }

            player2.status = PlayerStatus.Committed;
        }

    }

    // Modifiers?
}
