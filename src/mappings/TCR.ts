/* eslint-disable prefer-const */ // to satisfy AS compiler

import { BigInt, ipfs, json, Bytes } from '@graphprotocol/graph-ts'
import {
  Project,
  Submission,
  Listing,
  Metadata,
  Token,
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

// TODO - the interfaces for app type
// TODO - handle general transfer of the token through token transfer events
  // or just always call the contract for the curator balance

// Deploy the TCR
export function handleDeployed(event: Deployed): void {
  let tcr = new TCR('1')
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
export function handleBuy(event: Buy): void {
  let id = event.params.buyer.toHexString()
  let curator = Curator.load(id)
  if (curator == null) {
    curator = new Curator(id)
    curator.votes = []
    curator.tokenBalance = BigInt.fromI32(0)
  }
  curator.tokenBalance = curator.tokenBalance.plus(event.params.amount)
  curator.save()
}

// Sell TCR tokens
export function handleSell(event: Sell): void {
  let id = event.params.seller.toHexString()
  let curator = Curator.load(id)
  if (curator == null) {
    curator = new Curator(id)
    curator.votes = []
    curator.tokenBalance = BigInt.fromI32(0)
  }
  curator.tokenBalance = curator.tokenBalance.plus(event.params.amount)
  curator.save()
}

// Creating a listing
export function handleSubmit(event: Submit): void {
  let id = event.params.pollId.toHexString()
  let listing = new Listing(id)
  listing.action = event.params.action
  listing.applicant = event.params.owner.toHexString()
  listing.metadataHash = event.params.details
  listing.entry = event.params.entry
  listing.amount = event.params.amount
  listing.status = 'Voting'

  // Need to call the contract here since poll data isn't emitted in event
  let contract = tcrContract.bind(event.address)
  let pollData = contract.pollQueue(event.params.pollId)
  listing.startTime = pollData.value0
  listing.endTime = pollData.value1
  listing.revealTime = pollData.value2

  // Need to call the contract here since tally data isn't emitted in event
  let tallyData = contract.tallyQueue(event.params.pollId)
  listing.yesVotes = tallyData.value0
  listing.noVotes = tallyData.value1
  listing.unrevealedAmountTotal = tallyData.value2
  listing.save()

  let tcr = new TCR('1')
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
    metadata.save()
  }
}

// Voting on a listing
export function handleCommit(event: Commit): void {
  let id = event.params.pollId.toHexString().concat('-').concat(event.params.voter.toHexString())
  let submission = new Submission(id)
  submission.listing = event.params.pollId.toHexString()
  submission.amount = event.params.amount
  submission.claimed = false
  submission.save()

  let listing = Listing.load(event.params.pollId.toHexString())
  listing.unrevealedAmountTotal = listing.unrevealedAmountTotal.plus(event.params.amount)
  listing.save()
}

// Revealing your vote on a listing
export function handleReveal(event: Reveal): void {
  let id = event.params.pollId.toHexString().concat('-').concat(event.params.voter.toHexString())
  let submission = new Submission(id)
  submission.vote = event.params.vote
  submission.save()

  let listing = Listing.load(event.params.pollId.toHexString())
  listing.unrevealedAmountTotal = listing.unrevealedAmountTotal.minus(event.params.amount)
  if (event.params.vote == 1) {
    listing.yesVotes = listing.yesVotes.plus(event.params.amount)
  } else {
    listing.noVotes = listing.noVotes.plus(event.params.amount)
  }
  listing.save()
}

// Finalizing a listing, and creating a Project
export function handleProcessed(event: Processed): void {
  let listing = Listing.load(event.params.pollId.toHexString())
  listing.pr

  let tcr = new TCR('1')
  tcr.currentBallotIndex = event.params.pollId

  let nextListing = Listing.load(event.params.pollId.toHexString())
  // todo - continue here

}

// Claiming back tokens if you voted correctly
export function handleClaim(event: Claim): void {



}