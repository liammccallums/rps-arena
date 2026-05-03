// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Match.sol"; // Ensure Match.sol is in the same directory

contract Manager {

    address public admin;

    constructor() {
        admin = msg.sender;
    }

    // Mapping to verify if an address is an authorized Match contract
    mapping(address => bool) public isAuthorizedMatch;

    struct MatchInfo {
        address matchAddress;
        uint256 entryFee;
        uint256 currentPlayers; // Tracks how many are currently in that specific match
    }

    MatchInfo[] public matches;
    address[] public globalQueue;

    event MatchCreated(address matchAddress, uint256 index);
    event PlayerAssigned(address player, address matchAddress);
    event PlayersReturned(address p1, address p2);

    /// Deploys 3 Match contracts and stores their info
    function initializeMatches(uint256 _fee) external {
    require(matches.length == 0, "Already initialized");
    
    for (uint i = 0; i < 3; i++) {
        // Pass 'address(this)' so the Match knows who the Manager is
        Match newMatch = new Match(address(this)); 
        address matchAddr = address(newMatch);
        
        matches.push(MatchInfo({
            matchAddress: matchAddr,
            entryFee: _fee,
            currentPlayers: 0
        }));

        isAuthorizedMatch[matchAddr] = true; 
    }
}

    /// Logic to find the best match for a player
    function assignPlayer() external payable {
        // 1. Basic validation (e.g. check entry fee)
        // 2. Find the match with 1 player (waiting for a pair) or the smallest queue

        uint256 targetIndex = 0;
        uint256 minPlayers = matches[0].currentPlayers;

        for (uint i = 0; i < matches.length; i++) {
            // Ideal scenario: Someone is waiting alone (1 player)
            if (matches[i].currentPlayers == 1) {
                targetIndex = i;
                break;
            }
            // Fallback: Find the emptiest match
            if (matches[i].currentPlayers < minPlayers) {
                minPlayers = matches[i].currentPlayers;
                targetIndex = i;
            }
        }

        // Update the state and "send" player info to the Match contract
        matches[targetIndex].currentPlayers += 1;

        // Call a function on the Match contract to register the player
        // Match(matches[targetIndex].matchAddress).addPlayer(msg.sender);

        emit PlayerAssigned(msg.sender, matches[targetIndex].matchAddress);
    }

    // This function is called by the Match contract when a game ends
    function notifyMatchEnded(address player1, address player2) external {
        require(
            isAuthorizedMatch[msg.sender],
            "Only authorized matches can call this"
        );

        // 1. Reset the player count for this match in our records
        for (uint i = 0; i < matches.length; i++) {
            if (matches[i].matchAddress == msg.sender) {
                matches[i].currentPlayers = 0;
                break;
            }
        }

        // Player must then re-join the game which will call the assignPlayer function.
        emit PlayersReturned(player1, player2);
    }
}
