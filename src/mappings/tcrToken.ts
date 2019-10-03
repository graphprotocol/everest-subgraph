/* eslint-disable prefer-const */ // to satisfy AS compiler
import { BigDecimal } from '@graphprotocol/graph-ts'
import { Transfer, TCRToken } from '../types/TCRToken/TCRToken'
import { Curator, Token } from '../types/schema'
import { toDecimal } from './helpers'

const GENESIS_ADDRESS = ' 0x0000000000000000000000000000000000000000'


export function handleTransfer(event: Transfer): void {
  let isBurn = event.params.to.toHex() == GENESIS_ADDRESS
  let isMint = event.params.from.toHex() == GENESIS_ADDRESS
  let curatorTo = event.params.to
  let curatorFrom = event.params.from
  let tokenID = event.address.toHexString()
  let token = Token.load(tokenID)
  let valueDecimals = toDecimal(event.params.value, token.decimals)

  if (token == null) {
    token = new Token(tokenID)
    let contract = TCRToken.bind(event.address)
    token.decimals = contract.decimals()
    token.name = contract.name()
    token.owner = contract.owner()
    token.symbol = contract.symbol()
    token.totalSupply = BigDecimal.fromString('0')
  }

  if (isBurn) {
    let id = curatorFrom.toHexString()
    let curator = Curator.load(id)
    if (curator == null) {
      curator = new Curator(id)
      curator.tokenBalance = BigDecimal.fromString('0')
    }
    curator.tokenBalance = curator.tokenBalance.minus(valueDecimals)
    curator.save()

    token.totalSupply = token.totalSupply.minus(valueDecimals)

  } else if (isMint) {
    let id = curatorTo.toHexString()
    let curator = Curator.load(id)
    if (curator == null) {
      curator = new Curator(id)
      curator.tokenBalance = BigDecimal.fromString('0')
    }
    curator.tokenBalance = curator.tokenBalance.plus(valueDecimals)
    curator.save()

    token.totalSupply = token.totalSupply.plus(valueDecimals)

  } else { // Normal transfer
    let curatorToID = event.params.to.toHex()
    let curatorTo = Curator.load(curatorToID)
    if (curatorTo == null) {
      curatorTo = new Curator(curatorToID)
      curatorTo.tokenBalance = BigDecimal.fromString('0')
    }
    curatorTo.tokenBalance = curatorTo.tokenBalance.plus(valueDecimals)
    curatorTo.save()

    let curatorFromID = event.params.from.toHex()
    let curatorFrom = Curator.load(curatorFromID)
    if (curatorFrom == null) {
      curatorFrom = new Curator(curatorFromID)
      curatorFrom.tokenBalance = BigDecimal.fromString('0')
    }
    curatorFrom.tokenBalance = curatorFrom.tokenBalance.minus(valueDecimals)
    curatorFrom.save()
  }
  token.save()
}