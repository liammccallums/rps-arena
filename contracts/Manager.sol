// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Match.sol"; // Ensure Match.sol is in the same directory

contract Manager {
    
    struct MatchInfo {
        address matchAddress;
        uint256 entryFee;
        uint256 currentPlayers; // Tracks how many are currently in that specific match
    }

    MatchInfo[] public matches;
    address[] public globalQueue;

    event MatchCreated(address matchAddress, uint256 index);
    event PlayerAssigned(address player, address matchAddress);

    /// Deploys 3 Match contracts and stores their info
    function initializeMatches(uint256 _fee) external {
        require(matches.length == 0, "Matches already initialized");
        
        for (uint i = 0; i < 3; i++) {
            // This actually deploys a new contract onto the blockchain
            Match newMatch = new Match(); 
            
            matches.push(MatchInfo({
                matchAddress: address(newMatch),
                entryFee: _fee,
                currentPlayers: 0
            }));
            
            emit MatchCreated(address(newMatch), i);
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
}