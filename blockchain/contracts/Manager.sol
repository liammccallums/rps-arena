// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Match.sol";

contract Manager {
    address public immutable admin;

    uint256 public constant ENTRY_FEE = 0.001 ether;
    uint256 public constant MATCH_POOL_SIZE = 3;

    struct MatchInfo {
        address matchAddress;
        uint256 entryFee;
        uint256 currentPlayers;
    }

    MatchInfo[] public matches;

    mapping(address => bool) public isAuthorizedMatch;
    mapping(address => bool) public activePlayer;

    event MatchCreated(address matchAddress, uint256 index);
    event PlayerAssigned(address player, address matchAddress);
    event PlayersReturned(address player1, address player2);

    constructor() {
        admin = msg.sender;

        // Automatically deploy and initialise the Match contracts
        // when the Manager contract is deployed.
        _initializeMatches();
    }

    // Deploys a fixed pool of Match contracts with a 0.001 ETH entry fee.
    function _initializeMatches() internal {
        require(matches.length == 0, "Already initialized");

        for (uint256 i = 0; i < MATCH_POOL_SIZE; i++) {
            Match newMatch = new Match(address(this));
            newMatch.initializeLobby();

            address matchAddr = address(newMatch);

            matches.push(MatchInfo({
                matchAddress: matchAddr,
                entryFee: ENTRY_FEE,
                currentPlayers: 0
            }));

            isAuthorizedMatch[matchAddr] = true;

            emit MatchCreated(matchAddr, i);
        }
    }

    // Assigns a player to the best available Match contract.
    // The 0.001 ETH entry fee is deposited into the selected Match escrow.
    function assignPlayer() external payable {
        require(matches.length > 0, "Matches not initialized");
        require(!activePlayer[msg.sender], "Player already active");
        require(msg.value == ENTRY_FEE, "Incorrect entry fee");

        uint256 targetIndex = _findAvailableMatch();

        require(matches[targetIndex].currentPlayers < 2, "No available match");

        address matchAddress = matches[targetIndex].matchAddress;

        matches[targetIndex].currentPlayers++;
        activePlayer[msg.sender] = true;

        Match(matchAddress).addToQueue(msg.sender);
        Match(matchAddress).depositEntryFee{value: msg.value}(msg.sender);

        emit PlayerAssigned(msg.sender, matchAddress);

        if (matches[targetIndex].currentPlayers == 2) {
            Match(matchAddress).CreateMatch();
        }
    }

    // Called only by an authorised Match contract when the game ends.
    function notifyMatchEnded(address player1, address player2) external {
        require(isAuthorizedMatch[msg.sender], "Only authorized matches can call this");

        for (uint256 i = 0; i < matches.length; i++) {
            if (matches[i].matchAddress == msg.sender) {
                matches[i].currentPlayers = 0;
                break;
            }
        }

        activePlayer[player1] = false;
        activePlayer[player2] = false;

        emit PlayersReturned(player1, player2);
    }

    // Finds a Match contract with one waiting player first.
    // If none exist, it selects the least-filled available match.
    function _findAvailableMatch() internal view returns (uint256) {
        uint256 targetIndex = 0;
        uint256 minPlayers = matches[0].currentPlayers;

        for (uint256 i = 0; i < matches.length; i++) {
            if (matches[i].currentPlayers == 1) {
                return i;
            }

            if (matches[i].currentPlayers < minPlayers) {
                minPlayers = matches[i].currentPlayers;
                targetIndex = i;
            }
        }

        return targetIndex;
    }

    // Helper function for Remix testing.
    function getMatchCount() external view returns (uint256) {
        return matches.length;
    }

    // Helper function for Remix testing.
    function getMatchAddress(uint256 index) external view returns (address) {
        require(index < matches.length, "Invalid match index");
        return matches[index].matchAddress;
    }
}
