import { BigInt, log } from '@graphprotocol/graph-ts'
import {
  Contract,
  Approval,
  MinterAdded,
  MinterRemoved,
  OwnershipTransferred,
  Paused,
  PauserAdded,
  PauserRemoved,
  Transfer,
  Transfer1,
  Unpaused,
} from '../generated/GoodDollar/GoodDollar'
import { TransactionStatistics } from '../generated/schema'

export function handleApproval(event: Approval): void {}

export function handleMinterAdded(event: MinterAdded): void {}

export function handleMinterRemoved(event: MinterRemoved): void {}

export function handleOwnershipTransferred(event: OwnershipTransferred): void {}

export function handlePaused(event: Paused): void {}

export function handlePauserAdded(event: PauserAdded): void {}

export function handlePauserRemoved(event: PauserRemoved): void {}

export function handleTransfer(event: Transfer): void {
  let statistics = TransactionStatistics.load('txStatistics')
  if (statistics == null) {
    statistics = new TransactionStatistics('txStatistics')
  }
  let count = statistics.transactionsCount.plus(BigInt.fromI32(1))
  let value = event.params.value
  if (statistics.transactionsValue !== null) {
    value = value.plus(statistics.transactionsValue as BigInt)
  }
  log.info('count:{} value:{}', [count.toString(), value.toString()])
  statistics.transactionsCount = count
  statistics.transactionsValue = value
  statistics.save()
}

export function handleTransfer1(event: Transfer1): void {}

export function handleUnpaused(event: Unpaused): void {}
