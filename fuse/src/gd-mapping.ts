import { BigInt, log, Address } from '@graphprotocol/graph-ts'
import {
  // Contract,
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
import { GlobalStatistics, TransactionStatistics, WalletStatistics } from '../generated/schema'

import { fuse, fuse_mainnet, production, production_mainnet, staging, staging_mainnet, test, develop } from '../scripts/releases'

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
let ZERO = BigInt.fromI32(0)

// Change this according to working environment
let contracts = production

export function handleApproval(event: Approval): void { }

export function handleMinterAdded(event: MinterAdded): void { }

export function handleMinterRemoved(event: MinterRemoved): void { }

export function handleOwnershipTransferred(event: OwnershipTransferred): void { }

export function handlePaused(event: Paused): void { }

export function handlePauserAdded(event: PauserAdded): void { }

export function handlePauserRemoved(event: PauserRemoved): void { }

export function handleTransfer(event: Transfer): void {

  let aggregated = TransactionStatistics.load('aggregated')

  if (aggregated == null) {
    aggregated = new TransactionStatistics('aggregated')
  }

  aggregateTransactionStatisticsFromTransfer(event, aggregated)

  let statistics = GlobalStatistics.load('statistics')
  if (statistics == null) {
    statistics = new GlobalStatistics('statistics')
    statistics.transactionStatistics = aggregated.id
    statistics.save()
  }


  let blockTimestamp = parseInt(event.block.timestamp.toString())
  let dayTimestamp = blockTimestamp - (blockTimestamp % (60 * 60 * 24))
  // remove .0 from string
  let dayTimestampStr = dayTimestamp.toString().split('.')[0]
  log.info('got timestamp {}', [dayTimestampStr])
  let dailyStatistics = TransactionStatistics.load(dayTimestampStr)
  if (dailyStatistics == null) {
    dailyStatistics = new TransactionStatistics(dayTimestampStr)
  }
  aggregateTransactionStatisticsFromTransfer(event, dailyStatistics)
  aggregateCitizenFromTransfer(event)

}

export function handleTransfer1(event: Transfer1): void { }

export function handleUnpaused(event: Unpaused): void { }

function aggregateTransactionStatisticsFromTransfer(event: Transfer, statistics: TransactionStatistics | null): void {

  log.info('aggregateTransactionStatisticsFromTransfer event.params.from {}, event.params.to {}, event.params.value {}', [event.params.from.toHex(), event.params.to.toHex(), event.params.value.toString()])

  statistics.transactionsCount = statistics.transactionsCount.plus(BigInt.fromI32(1))
  statistics.transactionsValue = event.params.value.plus(statistics.transactionsValue as BigInt)

  if (!contracts.includes(event.params.to.toHexString()) && !contracts.includes(event.params.from.toHexString())) {
    statistics.transactionsCountClean = statistics.transactionsCountClean.plus(BigInt.fromI32(1))
    statistics.transactionsValueClean = event.params.value.plus(statistics.transactionsValueClean as BigInt)
  }

  if (!statistics.totalInCirculation) {
    statistics.totalInCirculation = ZERO
  }

  if (event.params.to.toHexString() == ZERO_ADDRESS) {
    statistics.totalInCirculation = statistics.totalInCirculation.minus(event.params.value)
  }
  if (event.params.from.toHexString() == ZERO_ADDRESS) {
    statistics.totalInCirculation = statistics.totalInCirculation.plus(event.params.value)
  }

  log.info('aggregated count:{} countClean:{} value:{} valueClean:{}, totalInCirculation:{}', [statistics.transactionsCount.toString(), statistics.transactionsCountClean.toString(), statistics.transactionsValue.toString(), statistics.transactionsValueClean.toString(), statistics.totalInCirculation.toString()])

  statistics.save()

}


function aggregateCitizenFromTransfer(event: Transfer): void {

  log.info('aggregateCitizenFromTransfer event.params.from {}, event.params.to {}, event.params.value {}', [event.params.from.toHex(), event.params.to.toHex(), event.params.value.toString()])

  let citizenFrom = WalletStatistics.load(event.params.from.toHex())
  if (citizenFrom == null) {
    citizenFrom = new WalletStatistics(event.params.from.toHexString())
    citizenFrom.outTransactionsCount = ZERO
    citizenFrom.outTransactionsCountClean = ZERO
    citizenFrom.outTransactionsValue = ZERO
    citizenFrom.outTransactionsValueClean = ZERO
    citizenFrom.inTransactionsCount = ZERO
    citizenFrom.inTransactionsCountClean = ZERO
    citizenFrom.inTransactionsValue = ZERO
    citizenFrom.inTransactionsValueClean = ZERO
    citizenFrom.balance = ZERO
    citizenFrom.totalTransactionsValueClean = ZERO
    citizenFrom.totalTransactionsCount = ZERO
    citizenFrom.totalTransactionsValue = ZERO
    citizenFrom.claimStreak = ZERO
  }

  citizenFrom.outTransactionsCount = citizenFrom.outTransactionsCount.plus(BigInt.fromI32(1))
  citizenFrom.outTransactionsValue = citizenFrom.outTransactionsValue.plus(event.params.value)
  citizenFrom.balance = citizenFrom.balance.minus(event.params.value)
  citizenFrom.totalTransactionsCount = citizenFrom.totalTransactionsCount.plus(BigInt.fromI32(1))
  citizenFrom.totalTransactionsValue = citizenFrom.totalTransactionsValue.plus(event.params.value)

  if (!contracts.includes(event.params.to.toHexString()) && !contracts.includes(event.params.from.toHexString())) {
    citizenFrom.outTransactionsCountClean = citizenFrom.outTransactionsCountClean.plus(BigInt.fromI32(1))
    citizenFrom.outTransactionsValueClean = citizenFrom.outTransactionsValueClean.plus(event.params.value)
    citizenFrom.totalTransactionsCountClean = citizenFrom.totalTransactionsCountClean.plus(BigInt.fromI32(1))
    citizenFrom.totalTransactionsValueClean = citizenFrom.totalTransactionsValueClean.plus(event.params.value)
  }


  citizenFrom.save()

  log.info('aggregateCitizenFromTransfer id {}, inTransactionsCount {}, outTransactionsCount {}, inTransactionsValue{}, outTransactionValue {}, balance {}',
    [
      citizenFrom.id.toString(),
      citizenFrom.inTransactionsCount.toString(),
      citizenFrom.outTransactionsCount.toString(),
      citizenFrom.inTransactionsValue.toString(),
      citizenFrom.outTransactionsValue.toString(),
      citizenFrom.balance.toString()
    ])

  let citizenTo = WalletStatistics.load(event.params.to.toHexString())
  if (citizenTo == null) {
    citizenTo = new WalletStatistics(event.params.to.toHexString())
    citizenTo.outTransactionsCount = ZERO
    citizenTo.outTransactionsCountClean = ZERO
    citizenTo.outTransactionsValue = ZERO
    citizenTo.outTransactionsValueClean = ZERO
    citizenTo.inTransactionsCount = ZERO
    citizenTo.inTransactionsCountClean = ZERO
    citizenTo.inTransactionsValue = ZERO
    citizenTo.inTransactionsValueClean = ZERO
    citizenTo.balance = ZERO
    citizenTo.totalTransactionsValueClean = ZERO
    citizenTo.totalTransactionsCount = ZERO
    citizenTo.totalTransactionsValue = ZERO
    citizenTo.totalTransactionsValueClean = ZERO
    citizenTo.claimStreak = ZERO
  }

  citizenTo.inTransactionsCount = citizenTo.inTransactionsCount.plus(BigInt.fromI32(1))
  citizenTo.inTransactionsValue = citizenTo.inTransactionsValue.plus(event.params.value)
  citizenTo.balance = citizenTo.balance.plus(event.params.value)
  citizenTo.totalTransactionsCount = citizenTo.totalTransactionsCount.plus(BigInt.fromI32(1))
  citizenTo.totalTransactionsValue = citizenTo.totalTransactionsValue.plus(event.params.value)

  if (!contracts.includes(event.params.to.toHexString()) && !contracts.includes(event.params.from.toHexString())) {
    citizenTo.inTransactionsCountClean = citizenTo.inTransactionsCountClean.plus(BigInt.fromI32(1))
    citizenTo.inTransactionsValueClean = citizenTo.inTransactionsValueClean.plus(event.params.value)
    citizenTo.totalTransactionsCountClean = citizenTo.totalTransactionsCountClean.plus(BigInt.fromI32(1))
    citizenTo.totalTransactionsValueClean = citizenTo.totalTransactionsValueClean.plus(event.params.value)
  }

  citizenTo.save()

  log.info('aggregateCitizenToTransfer id {}, inTransactionsCount {}, outTransactionsCount {}, inTransactionsValue{}, outTransactionValue {}, balance {}',
    [
      citizenTo.id.toString(),
      citizenTo.inTransactionsCount.toString(),
      citizenTo.outTransactionsCount.toString(),
      citizenTo.inTransactionsValue.toString(),
      citizenTo.outTransactionsValue.toString(),
      citizenTo.balance.toString()
    ])
}
