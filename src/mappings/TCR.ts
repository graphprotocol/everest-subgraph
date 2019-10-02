/* eslint-disable prefer-const */ // to satisfy AS compiler

import {BigInt,Address} from '@graphprotocol/graph-ts'
import {
  Project,
  Submission,
  Listing,
  Metadata,
  Poll,
  Token,
  Curator,
  TCR
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
  Claim
} from '../types/TCR/TCR'


export function handleDeployed(event: Deployed): void {
  let tcr = new TCR("1")
  tcr.owner = event.params.owner
  tcr.votingDurationSecs = event.params.votingDurationSecs
  tcr.revealDurationSecs = event.params.revealDurationSecs
  tcr.name = event.params.name
  tcr.symbol = event.params.symbol
  tcr.decimals = event.params.decimals
  tcr.bootstrapListAddress = event.params.bootstrapList
  tcr.started = false
  tcr.save()
}


export function handleStarted(event: Started): void {
  let tcr = new TCR("1")
  tcr.started = true
  tcr.save()

}

// Might delete this
export function handleBootstrap(event: Bootstrap): void {

}

export function handleBuy(event: Buy): void {
  let id = event.params.buyer.toHexString()
  let curator = Curator.load(id)
  if (curator == null){
    curator = new Curator(id)
    curator.votes = []
    curator.tokenBalance = BigInt.fromI32(0)
  }
  curator.tokenBalance = curator.tokenBalance.plus(event.params.amount)
  curator.save()
}

export function handleSell(event: Sell): void {
  let id = event.params.seller.toHexString()
  let curator = Curator.load(id)
  if (curator == null){
    curator = new Curator(id)
    curator.votes = []
    curator.tokenBalance = BigInt.fromI32(0)
  }
  curator.tokenBalance = curator.tokenBalance.plus(event.params.amount)
  curator.save()
}

// TODO - handle general transfer of the token through token transfer events
// or just always call the contract for the curator balance

export function handleSubmit(event: Submit): void {

  // creates a listing (basically a ballot)
  // creates a poll
  // creates a tally, but we dont have that in schema yet....
    // maybe kind of like a vote?

}

export function handleCommit(event: Commit): void {

  // you commit tokens to a ballot/listing (dont vote yet)

}

export function handleReveal(event: Reveal): void {

  // this is where you vote

}

export function handleProcessed(event: Processed): void {

  // decide if it wins or loses

}

export function handleClaim(event: Claim): void {

  // claim back your tokens if you won

}