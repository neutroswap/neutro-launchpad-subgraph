import { Address, BigInt, Bytes, BigDecimal } from '@graphprotocol/graph-ts'
import { FairAuctionCreation as FairAuctionCreationEvent } from '../types/FairAuctionFactory/FairAuctionFactory'
import { FairAuction as FairAuctionTemplate } from '../types/templates'
import { FairAuctionFactory, FairAuction } from '../types/schema'
import { FairAuction as FAIR_AUCTION } from '../types/FairAuctionFactory/FairAuction'
import { ERC20 } from '../types/FairAuctionFactory/ERC20'
import { ZERO_BD, ZERO_BI } from './helpers'

export function handleFairAuctionCreation(event: FairAuctionCreationEvent): void {
  let fairAuctionFactory = FairAuctionFactory.load(event.address.toHex())
  if (fairAuctionFactory == null) {
    fairAuctionFactory = new FairAuctionFactory(event.address.toHex())
  }

  fairAuctionFactory.save()

  let fairAuction = FairAuction.load(event.params.fairAuction)
  if (fairAuction == null) {
    fairAuction = new FairAuction(event.params.fairAuction)
    fairAuction.name = fetchTokenName(event.params.projectToken1)
    fairAuction.projectToken1 = fetchTokenName(event.params.projectToken1)
    fairAuction.projectToken2 = fetchTokenName(event.params.projectToken2)
    fairAuction.presaleType = 'Whitelist Fair Auction'
    fairAuction.hardcap = BigDecimal.fromString(event.params.hardCap.toString())
    fairAuction.minToRaise = BigDecimal.fromString(event.params.minToRaise.toString())
    fairAuction.wlStage = true

    // if (event.params.maxTokenToDistribute == BigInt.zero()) {
    //   fairAuction.maxTokenToDistribute = fetchMaxToRaiseInGrailPresale(event.params.fairAuction)
    // } else {
    fairAuction.maxTokenToDistribute = BigDecimal.fromString(event.params.maxTokenToDistribute.toString())
    // }
    fairAuction.auctionTokenDecimals = fetchTokenDecimals(event.params.projectToken1)
    fairAuction.saleToken = event.params.saleToken
    fairAuction.saleTokenDecimals = fetchTokenDecimals(event.params.saleToken)
    fairAuction.startTime = event.params.startTime
    fairAuction.endTime = event.params.endTime
    fairAuction.auctionTokenTotalSupply = BigDecimal.fromString(
      fetchTotalSupplyToken(event.params.projectToken1).toString()
    )
    fairAuction.finalPrice = ZERO_BD
    fairAuction.currentRaised = ZERO_BD
    fairAuction.circMarketCap = ZERO_BD
    // fairAuction.fdv = ZERO_BD

    fairAuction.fairAuctionFactory = event.address.toHex()
  }

  FairAuctionTemplate.create(event.params.fairAuction)
  fairAuction.save()
}

export function fetchTokenName(token: Address): string {
  let contract = ERC20.bind(token)
  let tokenName = ''
  let result = contract.try_name()
  if (result.reverted) {
  } else {
    tokenName = result.value
  }
  return tokenName
}

export function fetchTotalSupplyToken(token: Address): BigInt {
  let contract = ERC20.bind(token)
  let totalSupply = ZERO_BI
  let result = contract.try_totalSupply()
  if (result.reverted) {
  } else {
    totalSupply = result.value
  }
  return totalSupply
}

export function fetchTokenDecimals(token: Address): BigInt {
  let contract = ERC20.bind(token)
  let decimals = ZERO_BI
  let result = contract.try_decimals()
  if (result.reverted) {
  } else {
    decimals = BigInt.fromI32(result.value)
  }
  return decimals
}

export function fetchMinToRaise(address: Address): BigInt {
  let contract = FAIR_AUCTION.bind(address)
  let minToRaise = ZERO_BI
  let result = contract.try_MIN_TOTAL_RAISED_FOR_MAX_PROJECT_TOKEN()
  if (result.reverted) {
  } else {
    minToRaise = result.value
  }
  return minToRaise
}
