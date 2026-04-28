// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// RULES CONTRACT
// Removes game logic from Matchmaker. 
contract Rules {
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

    // Function to resolve the match.
    // Using pure, no storage for gas efficiency. 
    function resolve(MoveTypes p1, MoveTypes p2) external pure returns (Result){
        require(p1 != MoveTypes.None && p2 != MoveTypes.None, "Invalid move");

        if (p1 == p2){
            return Result.Draw;
        }

        if (
            (p1 == MoveTypes.Rock && p2 == MoveTypes.Scissors) ||
            (p1 == MoveTypes.Scissors && p2 == MoveTypes.Paper) ||
            (p1 == MoveTypes.Paper && p2 == MoveTypes.Rock)
        ) {
            return Result.Player1Wins;
        }

        return Result.Player2Wins;
        }

    }
