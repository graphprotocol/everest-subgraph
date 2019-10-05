import { Address, BigDecimal, BigInt } from '@graphprotocol/graph-ts/index'
import { DAppProject, FinanceProject, Metadata, ServiceProviderProject } from '../types/schema'

export function toDecimal(value: BigInt, decimals: u32): BigDecimal {
  let precision = BigInt.fromI32(10)
    .pow(<u8>decimals)
    .toBigDecimal()

  return value.divDecimal(precision)
}

export function createProject(metadata: Metadata, listing: Listing, timestamp: i32): void {
  let project: DAppProject | FinanceProject | ServiceProviderProject

  if (metadata.category == "Dapp"){
    project = new DAppProject(listing.id)
    project.dappCategories = metadata.categories
  } else if (metadata.category == "Finance") {
    project = new FinanceProject(listing.id)
    project.financeCategories = metadata.categories
  } else if (metadata.category == "ServiceProvider") {
    project = new ServiceProviderProject(listing.id)
    project.serviceProviderCategories = metadata.categories
  }
  project.owner = Address.fromString(listing.applicant)
  project.name = metadata.name
  project.description = metadata.description
  project.logo = metadata.logo
  project.website = metadata.website
  project.blog = metadata.blog
  project.socialFeed = metadata.socialFeed
  project.sourceCode = metadata.sourceCode
  project.createdAt = timestamp
  project.updatedAt = timestamp
  project.save()
}