import { Buy } from '../types/templates/FairAuction/FairAuction'
import { FairAuction, UserInAuction, FairAuctionPriceTracker } from '../types/schema'
import { Address, BigInt, BigDecimal } from '@graphprotocol/graph-ts'
import { TO_DECIMAL_18, ZERO_BD, ZERO_BI, convertWithoutDecimals } from './helpers'
import { FairAuction as FAIR_AUCTION } from '../types/templates/FairAuction/FairAuction'

export function handleBuy(event: Buy): void {
  let userInPresaleEntity = UserInAuction.load(event.params.user.toHex() + '-' + event.address.toHex())

  if (userInPresaleEntity == null) {
    userInPresaleEntity = new UserInAuction(event.params.user.toHex() + '-' + event.address.toHex())
    userInPresaleEntity.value = ZERO_BI
  }

  userInPresaleEntity.user = event.params.user
  userInPresaleEntity.fairAuction = event.address
  userInPresaleEntity.value = userInPresaleEntity.value.plus(BigInt.fromString(event.params.amount.toString()))

  addRaisedFundByPresale(event.address, event.params.amount)
  updatePrice(event.address)
  // updateFDV(event.address)
  updateCircMarketCap(event.address)
  updatePriceTracker(event.params.user, event.address, event.block.timestamp, event.params.amount)

  userInPresaleEntity.save()
}

export function addRaisedFundByPresale(address: Address, newValue: BigInt): void {
  let fairAuction = FairAuction.load(address)
  if (fairAuction == null) {
    fairAuction = new FairAuction(address)
    fairAuction.currentRaised = ZERO_BD
  }
  fairAuction.currentRaised = fairAuction.currentRaised.plus(BigDecimal.fromString(newValue.toString()))
  fairAuction.save()
}

export function updatePrice(address: Address): void {
  let fairAuction = FairAuction.load(address)
  if (fairAuction == null) {
    fairAuction = new FairAuction(address)
    fairAuction.finalPrice = ZERO_BD
  }

  fairAuction.finalPrice = calculatePrice(fairAuction)
  fairAuction.save()
}

export function calculatePrice(fairAuction: FairAuction): BigDecimal {
  // determine the floor price, after the currentRaised > minToRaise, if will goes to price discovery phase (up only)
  let minToRaise = convertWithoutDecimals(fairAuction.minToRaise, fairAuction.saleTokenDecimals)
  let currentRaised = convertWithoutDecimals(fairAuction.currentRaised, fairAuction.saleTokenDecimals)
  if (minToRaise > currentRaised) {
    if (fairAuction.saleTokenDecimals == fairAuction.auctionTokenDecimals) {
      return fairAuction.minToRaise.div(fairAuction.maxTokenToDistribute)
    } else if (fairAuction.saleTokenDecimals < fairAuction.auctionTokenDecimals) {
      return fairAuction.minToRaise.times(TO_DECIMAL_18).div(fairAuction.maxTokenToDistribute)
    } else {
      return fairAuction.minToRaise.div(fairAuction.maxTokenToDistribute).times(TO_DECIMAL_18)
    }
  } else {
    if (fairAuction.saleTokenDecimals == fairAuction.auctionTokenDecimals) {
      return fairAuction.currentRaised.div(fairAuction.maxTokenToDistribute)
    } else if (fairAuction.saleTokenDecimals < fairAuction.auctionTokenDecimals) {
      return fairAuction.currentRaised.times(TO_DECIMAL_18).div(fairAuction.maxTokenToDistribute)
    } else {
      return fairAuction.currentRaised.div(fairAuction.maxTokenToDistribute).times(TO_DECIMAL_18)
    }
  }
}

// export function updateFDV(address: Address): void {
//   let fairAuction = FairAuction.load(address)
//   if (fairAuction == null) {
//     fairAuction = new FairAuction(address)
//     fairAuction.fdv = ZERO_BD
//   }

//   fairAuction.fdv = fairAuction.auctionTokenTotalSupply.times(fairAuction.finalPrice)
//   fairAuction.save()
// }

export function updateCircMarketCap(address: Address): void {
  let fairAuction = FairAuction.load(address)
  if (fairAuction == null) {
    fairAuction = new FairAuction(address)
    fairAuction.circMarketCap = ZERO_BD
  }

  fairAuction.circMarketCap = BigDecimal.fromString(fetchCurrentTokenToDistribute(address).toString()).times(
    BigDecimal.fromString(fairAuction.finalPrice.toString())
  )
  fairAuction.save()
}

export function fetchCurrentTokenToDistribute(address: Address): BigInt {
  let contract = FAIR_AUCTION.bind(address)
  let currentTokenToDistribute = ZERO_BI
  let result = contract.try_tokensToDistribute()
  if (result.reverted) {
  } else {
    currentTokenToDistribute = result.value
  }

  return currentTokenToDistribute
}

export function updatePriceTracker(
  user: Address,
  fairAuctionAddress: Address,
  timestamp: BigInt,
  amount: BigInt
): void {
  let priceTracker = FairAuctionPriceTracker.load(user.toHex() + '-' + timestamp.toString())
  if (priceTracker == null) {
    priceTracker = new FairAuctionPriceTracker(user.toHex() + '-' + timestamp.toString())
    priceTracker.user = user
    priceTracker.timestamp = timestamp
    priceTracker.amount = ZERO_BI
    priceTracker.currentPrice = ZERO_BD
  }

  let fairAuction = FairAuction.load(fairAuctionAddress)
  if (fairAuction == null) {
    fairAuction = new FairAuction(fairAuctionAddress)
    fairAuction.finalPrice = ZERO_BD
  }

  let price = calculatePrice(fairAuction)

  priceTracker.fairAuction = fairAuctionAddress
  priceTracker.amount = amount
  priceTracker.currentPrice = price
  priceTracker.save()
}
