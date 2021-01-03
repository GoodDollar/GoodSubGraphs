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
import { Statistics, TransactionStatistics, Citizen } from '../generated/schema'

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

  let txStatistics = TransactionStatistics.load('txStatistics')

  if (txStatistics == null) {
    txStatistics = new TransactionStatistics('txStatistics')
  }

  aggregateTransactionStatisticsFromTransfer(event, txStatistics)

  let statistics = Statistics.load('statistics')
  if (statistics == null) {
    statistics = new Statistics('statistics')
    statistics.transactionStatistics = txStatistics.id
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

  log.info('txStatistics count:{} countClean:{} value:{} valueClean:{}, totalInCirculation:{}', [statistics.transactionsCount.toString(), statistics.transactionsCountClean.toString(), statistics.transactionsValue.toString(), statistics.transactionsValueClean.toString(), statistics.totalInCirculation.toString()])

  statistics.save()

}

function aggregateCitizenFromTransfer(event: Transfer): void {

  log.info('event.params.from {}, event.params.to {}, event.params.value {}', [event.params.from.toHex(), event.params.to.toHex(), event.params.value.toString()])

  if (!contracts.includes(event.params.from.toHexString())) {
    let citizenFrom = Citizen.load(event.params.from.toHex())
    if (citizenFrom == null) {
      citizenFrom = new Citizen(event.params.from.toHexString())
      citizenFrom.outTransactions = ZERO
      citizenFrom.outTransactionsClean = ZERO
      citizenFrom.outTransactionsValue = ZERO
      citizenFrom.outTransactionsValueClean = ZERO
      citizenFrom.inTransactions = ZERO
      citizenFrom.inTransactionsClean = ZERO
      citizenFrom.inTransactionsValue = ZERO
      citizenFrom.inTransactionsValueClean = ZERO
      citizenFrom.balance = ZERO
      citizenFrom.totalTransactionsValueClean = ZERO
      citizenFrom.totalTransactions = ZERO
      citizenFrom.totalTransactionsValue = ZERO
      citizenFrom.claimStreak = ZERO
    }

    citizenFrom.outTransactions = citizenFrom.outTransactions.plus(BigInt.fromI32(1))
    citizenFrom.outTransactionsValue = citizenFrom.outTransactionsValue.plus(event.params.value)
    citizenFrom.balance = citizenFrom.balance.minus(event.params.value)
    citizenFrom.totalTransactions = citizenFrom.totalTransactions.plus(BigInt.fromI32(1))
    citizenFrom.totalTransactionsValue = citizenFrom.totalTransactionsValue.plus(event.params.value)

    if (!contracts.includes(event.params.to.toHexString()) && !contracts.includes(event.params.from.toHexString())) {
      citizenFrom.outTransactionsClean = citizenFrom.outTransactionsClean.plus(BigInt.fromI32(1))
      citizenFrom.outTransactionsValueClean = citizenFrom.outTransactionsValueClean.plus(event.params.value)
      citizenFrom.totalTransactionsClean = citizenFrom.totalTransactionsClean.plus(BigInt.fromI32(1))
      citizenFrom.totalTransactionsValueClean = citizenFrom.totalTransactionsValueClean.plus(event.params.value)
    }


    citizenFrom.save()

    log.info('aggregateCitizenFromTransfer id {}, inTransactions {}, outTransactions {}, inTransactionsValue{}, outTransactionValue {}, balance {}',
      [
        citizenFrom.id.toString(),
        citizenFrom.inTransactions.toString(),
        citizenFrom.outTransactions.toString(),
        citizenFrom.inTransactionsValue.toString(),
        citizenFrom.outTransactionsValue.toString(),
        citizenFrom.balance.toString()
      ])
  }

  if (!contracts.includes(event.params.to.toHexString())) {
    let citizenTo = Citizen.load(event.params.to.toHexString())
    if (citizenTo == null) {
      citizenTo = new Citizen(event.params.to.toHexString())
      citizenTo.outTransactions = ZERO
      citizenTo.outTransactionsClean = ZERO
      citizenTo.outTransactionsValue = ZERO
      citizenTo.outTransactionsValueClean = ZERO
      citizenTo.inTransactions = ZERO
      citizenTo.inTransactionsClean = ZERO
      citizenTo.inTransactionsValue = ZERO
      citizenTo.inTransactionsValueClean = ZERO
      citizenTo.balance = ZERO
      citizenTo.totalTransactionsValueClean = ZERO
      citizenTo.totalTransactions = ZERO
      citizenTo.totalTransactionsValue = ZERO
      citizenTo.totalTransactionsValueClean = ZERO
      citizenTo.claimStreak = ZERO
    }

    citizenTo.inTransactions = citizenTo.inTransactions.plus(BigInt.fromI32(1))
    citizenTo.inTransactionsValue = citizenTo.inTransactionsValue.plus(event.params.value)
    citizenTo.balance = citizenTo.balance.plus(event.params.value)
    citizenTo.totalTransactions = citizenTo.totalTransactions.plus(BigInt.fromI32(1))
    citizenTo.totalTransactionsValue = citizenTo.totalTransactionsValue.plus(event.params.value)

    if (!contracts.includes(event.params.to.toHexString()) && !contracts.includes(event.params.from.toHexString())) {
      citizenTo.inTransactionsClean = citizenTo.inTransactionsClean.plus(BigInt.fromI32(1))
      citizenTo.inTransactionsValueClean = citizenTo.inTransactionsValueClean.plus(event.params.value)
      citizenTo.totalTransactionsClean = citizenTo.totalTransactionsClean.plus(BigInt.fromI32(1))
      citizenTo.totalTransactionsValueClean = citizenTo.totalTransactionsValueClean.plus(event.params.value)
    }

    citizenTo.save()

    log.info('aggregateCitizenToTransfer id {}, inTransactions {}, outTransactions {}, inTransactionsValue{}, outTransactionValue {}, balance {}',
      [
        citizenTo.id.toString(),
        citizenTo.inTransactions.toString(),
        citizenTo.outTransactions.toString(),
        citizenTo.inTransactionsValue.toString(),
        citizenTo.outTransactionsValue.toString(),
        citizenTo.balance.toString()
      ])
  }
}
