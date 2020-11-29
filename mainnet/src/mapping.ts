import { BigInt, ethereum, log, Value } from '@graphprotocol/graph-ts'
import {
  GoodDollar,
  MinterAdded,
  MinterRemoved,
  Paused,
  Unpaused,
  PauserAdded,
  PauserRemoved,
  OwnershipTransferred,
  Transfer,
  Approval,
  Transfer1,
} from '../generated/GoodDollar/GoodDollar'
import { TotalSupplyHistory, GoodDollarToken } from '../generated/schema'

export function handleMinterAdded(event: MinterAdded): void {}

export function handleMinterRemoved(event: MinterRemoved): void {}

export function handlePaused(event: Paused): void {}

export function handleUnpaused(event: Unpaused): void {}

export function handlePauserAdded(event: PauserAdded): void {}

export function handlePauserRemoved(event: PauserRemoved): void {}

export function handleOwnershipTransferred(event: OwnershipTransferred): void {}

export function handleTransfer(event: Transfer): void {
  let tokenContract = GoodDollar.bind(event.address)
  log.debug('got contract', [])
  let token = GoodDollarToken.load('GoodDollar')
  log.debug('got token', [])
  let blockTimestamp = parseInt(event.block.timestamp.toString())
  let dayTimestamp = blockTimestamp - (blockTimestamp % (60 * 60 * 24))
  log.debug('got timestamp {}', [dayTimestamp.toString()])

  if (token == null) {
    log.debug('creating token', [])

    token = new GoodDollarToken('GoodDollar')
  }

  token.totalSupply = tokenContract.totalSupply()
  log.debug('set total supply {}', [token.totalSupply.toString()])
  let dayExists = TotalSupplyHistory.load(dayTimestamp.toString())
  log.debug('got day exists', [])
  let dayId = dayExists ? dayExists.id : ''
  log.debug('event {} - token totalSupply at block {}: {}. dayRecord {}. dayTimestamp {}.', [
    event.transaction.hash.toHex(),
    event.block.number.toString(),
    token.totalSupply.toString(),
    dayId,
    dayTimestamp.toString(),
  ])

  if (dayExists == null) {
    let supplyHistory = new TotalSupplyHistory(dayTimestamp.toString())
    supplyHistory.totalSupply = token.totalSupply
    supplyHistory.blockTimestamp = event.block.timestamp
    supplyHistory.goodDollar = token.id
    supplyHistory.save()
  }
  token.save()
}

export function handleApproval(event: Approval): void {}

export function handleTransfer1(event: Transfer1): void {}
