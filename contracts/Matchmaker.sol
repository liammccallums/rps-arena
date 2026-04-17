// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


//MATCHMAKER CONTRACT
//Responsible for match lifecycle, fairness, and state

//Match phase enum?: Commit, reveal, resolved

//Move types enum? : rock, paper, scissors

//Match setup function 

//Commit move funciton

//Reveal move function

//resolve round function - send moves to Rules.sol Contract for logic handling

//something like this:
/*
if result == P1_WINS:
    winsP1++ // tally of how many matches won in round
else if result == P2_WINS:
    winsP2++
*/

//if 1 round is best of 3 matches:
//function to resolve winner for the round. 



contract Matchmaker{
    // Fields / types
    address public player1;
    address public player2;
    
    // Constructor
    constructor (address _player1, address _player2){
        player1 = _player1;
        player2 = _player2;

    }


    // Modifiers? 


    
}