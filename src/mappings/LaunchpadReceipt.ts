import { BigInt, BigDecimal, store, Address, Bytes } from '@graphprotocol/graph-ts'
import { Transfer as TransferEvent } from '../types/LaunchpadReceipt/LaunchpadReceipt'
import { User, PluginTotalSupply } from '../types/schema'
import { ADDRESS_ZERO, ONE_BI } from './helpers'

export function handleTransfer(transfer: TransferEvent): void {
  if (transfer.params.from == ADDRESS_ZERO) {
    updateUserBalance(transfer.params.to, true, transfer.params.value)
    updateTotalSupply(transfer.address, true, transfer.params.value)
  }

  if (transfer.params.to == ADDRESS_ZERO) {
    updateUserBalance(transfer.params.from, false, transfer.params.value)
    updateTotalSupply(transfer.address, false, transfer.params.value)
  }
}

export function updateUserBalance(userAddress: Bytes, inOrOut: boolean, value: BigInt): void {
  let finalUser = User.load(userAddress)
  if (finalUser == null) {
    finalUser = new User(userAddress)
    finalUser.balance = BigInt.fromI32(0)
  }

  if (inOrOut) {
    finalUser.balance = finalUser.balance.plus(value)
  } else {
    finalUser.balance = finalUser.balance.minus(value)
  }

  finalUser.save()
}

export function updateTotalSupply(address: Bytes, allocate: boolean, value: BigInt): void {
  let plugin = PluginTotalSupply.load(address)
  if (plugin == null) {
    plugin = new PluginTotalSupply(address)
    plugin.totalSupply = BigInt.fromI32(0)
  }

  if (allocate) {
    plugin.totalSupply = plugin.totalSupply.plus(value)
  } else {
    plugin.totalSupply = plugin.totalSupply.minus(value)
  }

  plugin.save()
}
