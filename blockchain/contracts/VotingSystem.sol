// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @custom:legacy LEGACY_PUBLIC_VOTE_CONTRACT. Never use for secret elections.
/// @dev `castVote` exposes candidateId in calldata and VoteCast; the transaction sender identifies the wallet.
contract VotingSystem is Ownable {
    enum ElectionStatus { Draft, Scheduled, Active, Paused, Ended, Finalized }

    struct Election {
        uint256 id;
        string name;
        string metadataURI;
        uint64 startsAt;
        uint64 endsAt;
        ElectionStatus status;
        uint256 totalVotes;
        uint64 finalizedAt;
    }

    struct Candidate {
        uint256 id;
        string name;
        string metadataURI;
        uint256 voteCount;
    }

    struct ElectionView {
        uint256 id;
        string name;
        string metadataURI;
        uint64 startsAt;
        uint64 endsAt;
        ElectionStatus status;
        uint256 totalVotes;
        uint64 finalizedAt;
    }

    struct CandidateView {
        uint256 id;
        string name;
        string metadataURI;
    }

    struct CandidateResult {
        uint256 id;
        string name;
        string metadataURI;
        uint256 voteCount;
    }

    uint256 public nextElectionId;
    mapping(uint256 => Election) private elections;
    mapping(uint256 => Candidate[]) private candidates;
    mapping(uint256 => mapping(address => bool)) private eligibleVoters;
    mapping(uint256 => mapping(address => bool)) private voterHasVoted;

    event ElectionCreated(uint256 indexed electionId, string name, string metadataURI);
    event ElectionScheduled(uint256 indexed electionId, uint64 startsAt, uint64 endsAt);
    event ElectionStateChanged(uint256 indexed electionId, ElectionStatus status);
    event CandidateAdded(uint256 indexed electionId, uint256 indexed candidateId, string name, string metadataURI);
    event EligibilityUpdated(uint256 indexed electionId, bytes32 indexed voterCommitment, bool eligible);
    event VoteCast(uint256 indexed electionId, uint256 indexed candidateId);
    event ElectionFinalized(uint256 indexed electionId, uint256 totalVotes, uint64 finalizedAt);

    constructor() Ownable(msg.sender) {}

    modifier existingElection(uint256 electionId) {
        require(electionId < nextElectionId, "Election does not exist");
        _;
    }

    function createElection(string calldata name, string calldata metadataURI) external onlyOwner returns (uint256 electionId) {
        require(bytes(name).length > 0, "Name required");

        electionId = nextElectionId++;
        elections[electionId] = Election({
            id: electionId,
            name: name,
            metadataURI: metadataURI,
            startsAt: 0,
            endsAt: 0,
            status: ElectionStatus.Draft,
            totalVotes: 0,
            finalizedAt: 0
        });
        emit ElectionCreated(electionId, name, metadataURI);
    }

    function scheduleElection(uint256 electionId, uint64 startsAt, uint64 endsAt) external onlyOwner existingElection(electionId) {
        Election storage election = elections[electionId];
        require(election.status == ElectionStatus.Draft, "Election is not a draft");
        require(startsAt > block.timestamp && endsAt > startsAt, "Invalid schedule");
        election.startsAt = startsAt;
        election.endsAt = endsAt;
        election.status = ElectionStatus.Scheduled;
        emit ElectionScheduled(electionId, startsAt, endsAt);
        emit ElectionStateChanged(electionId, ElectionStatus.Scheduled);
    }

    function addCandidate(uint256 electionId, string calldata name, string calldata metadataURI)
        external
        onlyOwner
        existingElection(electionId)
    {
        ElectionStatus status = elections[electionId].status;
        require(status == ElectionStatus.Draft || status == ElectionStatus.Scheduled, "Election locked");
        require(bytes(name).length > 0, "Candidate name required");

        uint256 candidateId = candidates[electionId].length;
        candidates[electionId].push(Candidate({
            id: candidateId,
            name: name,
            metadataURI: metadataURI,
            voteCount: 0
        }));
        emit CandidateAdded(electionId, candidateId, name, metadataURI);
    }

    function setEligibility(uint256 electionId, address voter, bool eligible) external onlyOwner existingElection(electionId) {
        ElectionStatus status = elections[electionId].status;
        require(status == ElectionStatus.Draft || status == ElectionStatus.Scheduled, "Election locked");
        require(voter != address(0), "Invalid voter");

        eligibleVoters[electionId][voter] = eligible;
        emit EligibilityUpdated(electionId, keccak256(abi.encode(electionId, voter)), eligible);
    }

    function startElection(uint256 electionId) external onlyOwner existingElection(electionId) {
        Election storage election = elections[electionId];
        require(election.status == ElectionStatus.Scheduled, "Election is not scheduled");
        require(block.timestamp >= election.startsAt, "Election has not started");
        require(block.timestamp < election.endsAt, "Election has ended");
        require(candidates[electionId].length > 0, "No candidates");
        election.status = ElectionStatus.Active;
        emit ElectionStateChanged(electionId, ElectionStatus.Active);
    }

    function pauseElection(uint256 electionId) external onlyOwner existingElection(electionId) {
        Election storage election = elections[electionId];
        require(election.status == ElectionStatus.Active, "Election is not active");
        require(block.timestamp < election.endsAt, "Voting period has ended");
        election.status = ElectionStatus.Paused;
        emit ElectionStateChanged(electionId, ElectionStatus.Paused);
    }

    function resumeElection(uint256 electionId) external onlyOwner existingElection(electionId) {
        Election storage election = elections[electionId];
        require(election.status == ElectionStatus.Paused, "Election is not paused");
        require(block.timestamp < election.endsAt, "Election has ended");
        election.status = ElectionStatus.Active;
        emit ElectionStateChanged(electionId, ElectionStatus.Active);
    }

    function castVote(uint256 electionId, uint256 candidateId) external existingElection(electionId) {
        Election storage election = elections[electionId];
        require(election.status == ElectionStatus.Active, "Election is not active");
        require(block.timestamp >= election.startsAt && block.timestamp < election.endsAt, "Outside voting window");
        require(eligibleVoters[electionId][msg.sender], "Voter is not eligible");
        require(!voterHasVoted[electionId][msg.sender], "Voter has already voted");
        require(candidateId < candidates[electionId].length, "Invalid candidate");

        voterHasVoted[electionId][msg.sender] = true;
        candidates[electionId][candidateId].voteCount += 1;
        election.totalVotes += 1;
        emit VoteCast(electionId, candidateId);
    }

    function endElection(uint256 electionId) external existingElection(electionId) {
        Election storage election = elections[electionId];
        ElectionStatus status = election.status;
        require(
            status == ElectionStatus.Scheduled || status == ElectionStatus.Active || status == ElectionStatus.Paused,
            "Election cannot end"
        );
        require(block.timestamp >= election.endsAt, "Election is still open");
        election.status = ElectionStatus.Ended;
        emit ElectionStateChanged(electionId, ElectionStatus.Ended);
    }

    function finalizeElection(uint256 electionId) external existingElection(electionId) {
        Election storage election = elections[electionId];
        require(election.status == ElectionStatus.Ended, "Election has not ended");
        election.status = ElectionStatus.Finalized;
        election.finalizedAt = uint64(block.timestamp);
        emit ElectionStateChanged(electionId, ElectionStatus.Finalized);
        emit ElectionFinalized(electionId, election.totalVotes, election.finalizedAt);
    }

    function getElection(uint256 electionId) external view existingElection(electionId) returns (ElectionView memory result) {
        Election storage election = elections[electionId];
        result = ElectionView({
            id: election.id,
            name: election.name,
            metadataURI: election.metadataURI,
            startsAt: election.startsAt,
            endsAt: election.endsAt,
            status: election.status,
            totalVotes: election.status == ElectionStatus.Finalized ? election.totalVotes : 0,
            finalizedAt: election.finalizedAt
        });
    }

    function getElectionStatus(uint256 electionId) external view existingElection(electionId) returns (ElectionStatus) {
        return elections[electionId].status;
    }

    function getCandidate(uint256 electionId, uint256 candidateId)
        external
        view
        existingElection(electionId)
        returns (CandidateView memory result)
    {
        require(candidateId < candidates[electionId].length, "Invalid candidate");
        Candidate storage candidate = candidates[electionId][candidateId];
        result = CandidateView(candidate.id, candidate.name, candidate.metadataURI);
    }

    function getCandidates(uint256 electionId)
        external
        view
        existingElection(electionId)
        returns (CandidateView[] memory result)
    {
        Candidate[] storage electionCandidates = candidates[electionId];
        result = new CandidateView[](electionCandidates.length);
        for (uint256 i = 0; i < electionCandidates.length; i++) {
            Candidate storage candidate = electionCandidates[i];
            result[i] = CandidateView(candidate.id, candidate.name, candidate.metadataURI);
        }
    }

    function hasVoted(uint256 electionId) external view existingElection(electionId) returns (bool) {
        return voterHasVoted[electionId][msg.sender];
    }

    function isEligible(uint256 electionId) external view existingElection(electionId) returns (bool) {
        return eligibleVoters[electionId][msg.sender];
    }

    function getResults(uint256 electionId)
        external
        view
        existingElection(electionId)
        returns (uint256 totalVotes, uint64 finalizedAt, CandidateResult[] memory result)
    {
        Election storage election = elections[electionId];
        require(election.status == ElectionStatus.Finalized, "Results are not finalized");
        Candidate[] storage electionCandidates = candidates[electionId];
        result = new CandidateResult[](electionCandidates.length);
        for (uint256 i = 0; i < electionCandidates.length; i++) {
            Candidate storage candidate = electionCandidates[i];
            result[i] = CandidateResult(candidate.id, candidate.name, candidate.metadataURI, candidate.voteCount);
        }
        return (election.totalVotes, election.finalizedAt, result);
    }
}
