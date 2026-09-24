// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract VotingSystem {
    enum ElectionStatus { Draft, Scheduled, Active, Closed, ResultsPublished }

    struct Election {
        uint256 id;
        string name;
        uint64 startsAt;
        uint64 endsAt;
        ElectionStatus status;
        uint256 totalVotes;
    }

    struct Candidate {
        uint256 id;
        string name;
        string party;
        uint256 voteCount;
        bool active;
    }

    address public immutable owner;
    uint256 public nextElectionId;
    mapping(uint256 => Election) public elections;
    mapping(uint256 => Candidate[]) private candidates;
    mapping(uint256 => mapping(address => bool)) public eligibleVoter;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(uint256 => mapping(address => bytes32)) public voteReceipts;

    event ElectionCreated(uint256 indexed electionId, string name, uint64 startsAt, uint64 endsAt);
    event VoterEligibilityUpdated(uint256 indexed electionId, address indexed voter, bool eligible);
    event VoteRecorded(uint256 indexed electionId, bytes32 indexed receipt, uint256 indexed candidateId);
    event ElectionStatusChanged(uint256 indexed electionId, ElectionStatus status);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier existingElection(uint256 electionId) {
        require(electionId < nextElectionId, "Election does not exist");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function createElection(
        string calldata name,
        uint64 startsAt,
        uint64 endsAt
    ) external onlyOwner returns (uint256 electionId) {
        require(bytes(name).length > 0, "Name required");
        require(endsAt > startsAt && endsAt > block.timestamp, "Invalid schedule");

        electionId = nextElectionId++;
        elections[electionId] = Election({
            id: electionId,
            name: name,
            startsAt: startsAt,
            endsAt: endsAt,
            status: ElectionStatus.Scheduled,
            totalVotes: 0
        });
        emit ElectionCreated(electionId, name, startsAt, endsAt);
    }

    function addCandidate(
        uint256 electionId,
        string calldata name,
        string calldata party
    ) external onlyOwner existingElection(electionId) {
        require(elections[electionId].status == ElectionStatus.Draft || elections[electionId].status == ElectionStatus.Scheduled, "Election locked");
        candidates[electionId].push(Candidate({
            id: candidates[electionId].length,
            name: name,
            party: party,
            voteCount: 0,
            active: true
        }));
    }

    function setEligibility(uint256 electionId, address voter, bool eligible) external onlyOwner existingElection(electionId) {
        eligibleVoter[electionId][voter] = eligible;
        emit VoterEligibilityUpdated(electionId, voter, eligible);
    }

    function setElectionStatus(uint256 electionId, ElectionStatus status) external onlyOwner existingElection(electionId) {
        Election storage election = elections[electionId];
        require(status != ElectionStatus.Active || block.timestamp >= election.startsAt, "Election has not started");
        require(status != ElectionStatus.Closed || block.timestamp >= election.endsAt, "Election is still open");
        election.status = status;
        emit ElectionStatusChanged(electionId, status);
    }

    function castVote(uint256 electionId, uint256 candidateId, bytes32 privateReceipt) external existingElection(electionId) {
        Election storage election = elections[electionId];
        require(election.status == ElectionStatus.Active, "Election is not active");
        require(block.timestamp >= election.startsAt && block.timestamp <= election.endsAt, "Outside voting window");
        require(eligibleVoter[electionId][msg.sender], "Voter is not eligible");
        require(!hasVoted[electionId][msg.sender], "Voter has already voted");
        require(candidateId < candidates[electionId].length && candidates[electionId][candidateId].active, "Invalid candidate");
        require(privateReceipt != bytes32(0), "Receipt required");

        hasVoted[electionId][msg.sender] = true;
        voteReceipts[electionId][msg.sender] = privateReceipt;
        candidates[electionId][candidateId].voteCount += 1;
        election.totalVotes += 1;
        emit VoteRecorded(electionId, privateReceipt, candidateId);
    }

    function getCandidates(uint256 electionId) external view existingElection(electionId) returns (Candidate[] memory) {
        return candidates[electionId];
    }
}
