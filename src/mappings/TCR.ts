/* eslint-disable prefer-const */ // to satisfy AS compiler

import { BigInt, ipfs, json, Bytes, store, BigDecimal } from '@graphprotocol/graph-ts'
import { parseCSV } from '@graphprotocol/graph-ts/helper-functions'
import {
  Submission,
  Listing,
  Metadata,
  Curator,
  TCR,
} from '../types/schema'
import {
  Deployed,
  Started,
  Bootstrap,
  Buy,
  Sell,
  Submit,
  Commit,
  Reveal,
  Processed,
  Claim,
  TCR as tcrContract,
} from '../types/TCR/TCR'

import { toDecimal, createProject } from './helpers'

// Deploy the TCR
export function handleDeployed(event: Deployed): void {
  let tcr = new TCR('1')
  tcr.tcrAddress = event.address
  tcr.owner = event.params.owner
  tcr.votingDurationSecs = event.params.votingDurationSecs
  tcr.revealDurationSecs = event.params.revealDurationSecs
  tcr.name = event.params.name
  tcr.symbol = event.params.symbol
  tcr.decimals = event.params.decimals
  tcr.bootstrapListAddress = event.params.bootstrapList
  tcr.ready = false
  tcr.memberIndex = BigInt.fromI32(0)
  tcr.currentBallotIndex = BigInt.fromI32(0)
  tcr.save()
}

// Start the TCR
export function handleStarted(event: Started): void {
  let tcr = new TCR('1')
  tcr.startDate = event.block.timestamp
  tcr.save()
}

// TODO Might delete this
export function handleBootstrap(event: Bootstrap): void {

}

// Buy TCR Tokens
// Note, tokenBalance will be updated in tcrToken.ts with Transfer event
export function handleBuy(event: Buy): void {
  let id = event.params.buyer.toHexString()
  let curator = Curator.load(id)
  if (curator == null) {
    curator = new Curator(id)
    curator.votes = []
    curator.tokenBalance = BigDecimal.fromString('0')
    curator.save()
  }
}

// Sell TCR tokens
// Note, tokenBalance will be updated in tcrToken.ts with Transfer event
export function handleSell(event: Sell): void {
  let id = event.params.seller.toHexString()
  let curator = Curator.load(id)
  if (curator == null) {
    curator = new Curator(id)
    curator.votes = []
    curator.tokenBalance = BigDecimal.fromString('0')
    curator.save()
  }
}

// Creating a listing
// Note, tokenBalance will be updated in tcrToken.ts with Transfer event
export function handleSubmit(event: Submit): void {
  let tcr = TCR.load('1')
  let id = event.params.pollId.toHexString()
  let listing = new Listing(id)
  listing.action = event.params.action
  listing.applicant = event.params.owner.toHexString()
  listing.metadataHash = event.params.details
  listing.entry = event.params.entry
  listing.amount = toDecimal(event.params.amount, tcr.decimals)
  listing.tokensClaimed = BigDecimal.fromString('0')
  listing.status = 'Voting'

  // Need to call the contract here since poll data isn't emitted in event
  let contract = tcrContract.bind(event.address)
  let pollData = contract.pollQueue(event.params.pollId)
  listing.startTime = pollData.value0
  listing.endTime = pollData.value1
  listing.revealTime = pollData.value2

  // Need to call the contract here since tally data isn't emitted in event
  let tallyData = contract.tallyQueue(event.params.pollId)
  listing.yesVotes = toDecimal(tallyData.value0, tcr.decimals)
  listing.noVotes = toDecimal(tallyData.value1, tcr.decimals)
  listing.unrevealedAmountTotal = toDecimal(tallyData.value2, tcr.decimals)
  listing.save()

  tcr.currentBallotIndex = event.params.currentPollId
  tcr.save()


  // Take metadataHash and query IPFS and create Metadata
  let metadata = new Metadata(event.params.details)
  let ipfsData = ipfs.cat(event.params.details)
  if (ipfsData !== null) {
    let data = json.fromBytes(ipfsData as Bytes).toObject()
    if (data.get('name')) {
      metadata.name = data.get('name').toString()
    }
    if (data.get('description')) {
      metadata.description = data.get('description').toString()
    }
    if (data.get('logo')) {
      metadata.logo = data.get('logo').toString()
    }
    if (data.get('category')) {
      metadata.category = data.get('category').toString()
    }
    if (data.get('website')) {
      metadata.website = data.get('website').toString()
    }
    if (data.get('blog')) {
      metadata.blog = data.get('blog').toString()
    }
    if (data.get('socialFeed')) {
      metadata.socialFeed = data.get('socialFeed').toString()
    }
    if (data.get('sourceCode')) {
      metadata.sourceCode = data.get('sourceCode').toString()
    }
    if (data.get('categories')) {
      metadata.categories = parseCSV(data.get('categories').toString())
    }
    metadata.save()
  }
}

// Voting on a listing
// Note, tokenBalance will be updated in tcrToken.ts with Transfer event
export function handleCommit(event: Commit): void {
  let id = event.params.pollId.toHexString().concat('-').concat(event.params.voter.toHexString())
  let submission = new Submission(id)
  submission.listing = event.params.pollId.toHexString()
  submission.curator = event.params.voter.toHexString()
  submission.amount = event.params.amount
  submission.claimed = false
  submission.save()

  let tcr = TCR.load('1')
  let listing = Listing.load(event.params.pollId.toHexString())
  listing.unrevealedAmountTotal = listing.unrevealedAmountTotal.plus(toDecimal(event.params.amount, tcr.decimals))
  listing.save()
}

// Revealing your vote on a listing
export function handleReveal(event: Reveal): void {
  let id = event.params.pollId.toHexString().concat('-').concat(event.params.voter.toHexString())
  let submission = new Submission(id)
  submission.vote = event.params.vote
  submission.save()

  let tcr = TCR.load('1')
  let amountDecimals = toDecimal(event.params.amount, tcr.decimals)
  let listing = Listing.load(event.params.pollId.toHexString())
  listing.unrevealedAmountTotal = listing.unrevealedAmountTotal.minus(amountDecimals)
  if (event.params.vote == 1) {
    listing.yesVotes = listing.yesVotes.plus(amountDecimals)
  } else {
    listing.noVotes = listing.noVotes.plus(amountDecimals)
  }
  listing.save()
}

// Finalizing a listing, and creating a Project
export function handleProcessed(event: Processed): void {
  let tcr = new TCR('1')
  let finishedListingID = tcr.currentBallotIndex
  // Update to the next poll
  tcr.currentBallotIndex = event.params.pollId

  // Update finished listing
  let finishedListing = Listing.load(finishedListingID.toHexString())
  let contract = tcrContract.bind(event.address)
  let results = contract.tcr(finishedListing.entry)
  let valid = results.value2
  valid ? finishedListing.startTime = 'Approved'
    : finishedListing.startTime = 'Rejected'
  finishedListing.save()

  // Update next listing
  let nextListing = Listing.load(event.params.pollId.toHexString())
  let pollData = contract.pollQueue(event.params.pollId)
  nextListing.startTime = pollData.value0
  nextListing.endTime = pollData.value1
  nextListing.revealTime = pollData.value2
  
  let metadata = Metadata.load(finishedListing.metadataHash)
  // Create project
  if (valid) {
    createProject(metadata, finishedListing, event.block.timestamp.toI32())
  } else {
    if (finishedListing.action == 'Remove') {
      // We must remove it as a project if this ballot was for removal
      // If it was for acceptance, it never existed in the subgraph
      // so there is no need to remove anything
      if (metadata.category == 'Dapp') {
        store.remove('DappProject', finishedListingID.toHexString())
      } else if (metadata.category = 'Finance') {
        store.remove('FinanceProject', finishedListingID.toHexString())
      } else if (metadata.category = 'ServiceProvider') {
        store.remove('ServiceProviderProject', finishedListingID.toHexString())
      }
    }
  }
}

// Claiming back tokens if you voted correctly
// Note, tokenBalance will be updated in tcrToken.ts with Transfer event
export function handleClaim(event: Claim): void {
  let id = event.params.pollId.toHexString().concat('-').concat(event.params.voter.toHexString())
  let submission = new Submission(id)
  submission.claimed = true
  submission.save()

  let tcr = TCR.load('1')
  let listing = Listing.load(event.params.pollId.toHexString())
  listing.tokensClaimed = listing.tokensClaimed.plus(toDecimal(event.params.amount, tcr.decimals))
  listing.save()
}