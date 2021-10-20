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
  Unpaused,
} from '../generated/GoodDollar/GoodDollar'
import { GlobalStatistics, TransactionStat, WalletStat } from '../generated/schema'

import { fuse, fuse_mainnet, production, production_mainnet, staging, staging_mainnet, test, develop } from '../scripts/releases'

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
let ZERO = BigInt.fromI32(0)
const enableLogs = false;

// Change this according to working environment
let contracts = production

export function handleTransfer(event: Transfer): void {

  if(enableLogs) log.info('handleTransferEvent event.params.from {}, event.params.to {}, event.params.value {}, event.transaction.hash {}', [event.params.from.toHex(), event.params.to.toHex(), event.params.value.toString(), event.transaction.hash.toHex()])

  let aggregated = TransactionStat.load('aggregated')

  if (aggregated == null) {
    aggregated = new TransactionStat('aggregated')
  }

  aggregateTransactionStatFromTransfer(event, aggregated)

  let statistics = GlobalStatistics.load('statistics')
  if (statistics == null) {
    statistics = new GlobalStatistics('statistics')
    statistics.TransactionStat = aggregated.id
    statistics.save()
  }


  let blockTimestamp = parseInt(event.block.timestamp.toString())
  let dayTimestamp = blockTimestamp - (blockTimestamp % (60 * 60 * 24))
  // remove .0 from string
  let dayTimestampStr = dayTimestamp.toString().split('.')[0]
  if(enableLogs) log.info('got timestamp {}', [dayTimestampStr])
  let dailyStatistics = TransactionStat.load(dayTimestampStr)
  if (dailyStatistics == null) {
    dailyStatistics = new TransactionStat(dayTimestampStr)
    dailyStatistics.dayStartBlockNumber = event.block.number
  }
  aggregateTransactionStatFromTransfer(event, dailyStatistics)
  aggregateCitizenFromTransfer(event)

}

function aggregateTransactionStatFromTransfer(event: Transfer, statistics: TransactionStat | null): void {

  if(enableLogs) log.info('aggregateTransactionStatFromTransfer event.params.from {}, event.params.to {}, event.params.value {}, event.transaction.hash {}', [event.params.from.toHex(), event.params.to.toHex(), event.params.value.toString(), event.transaction.hash.toHex()])

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

  if(enableLogs) log.info('aggregated count:{} countClean:{} value:{} valueClean:{}, totalInCirculation:{}', [statistics.transactionsCount.toString(), statistics.transactionsCountClean.toString(), statistics.transactionsValue.toString(), statistics.transactionsValueClean.toString(), statistics.totalInCirculation.toString()])

  statistics.save()

}


function aggregateCitizenFromTransfer(event: Transfer): void {

  if(enableLogs) log.info('aggregateCitizenFromTransfer event.params.from {}, event.params.to {}, event.params.value {}', [event.params.from.toHex(), event.params.to.toHex(), event.params.value.toString()])

  let citizenFrom = WalletStat.load(event.params.from.toHex())
  if (citizenFrom == null) {
    citizenFrom = new WalletStat(event.params.from.toHexString())
    citizenFrom.dateAppeared = event.block.timestamp
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
  citizenFrom.lastTransactionFrom = event.block.timestamp 

  if (!contracts.includes(event.params.to.toHexString()) && !contracts.includes(event.params.from.toHexString())) {
    citizenFrom.outTransactionsCountClean = citizenFrom.outTransactionsCountClean.plus(BigInt.fromI32(1))
    citizenFrom.outTransactionsValueClean = citizenFrom.outTransactionsValueClean.plus(event.params.value)
    citizenFrom.totalTransactionsCountClean = citizenFrom.totalTransactionsCountClean.plus(BigInt.fromI32(1))
    citizenFrom.totalTransactionsValueClean = citizenFrom.totalTransactionsValueClean.plus(event.params.value)
  }


  citizenFrom.save()

  if(enableLogs) log.info('aggregateCitizenFromTransfer id {}, inTransactionsCount {}, outTransactionsCount {}, inTransactionsValue{}, outTransactionValue {}, balance {}',
    [
      citizenFrom.id.toString(),
      citizenFrom.inTransactionsCount.toString(),
      citizenFrom.outTransactionsCount.toString(),
      citizenFrom.inTransactionsValue.toString(),
      citizenFrom.outTransactionsValue.toString(),
      citizenFrom.balance.toString()
    ])

  let citizenTo = WalletStat.load(event.params.to.toHexString())
  if (citizenTo == null) {
    citizenTo = new WalletStat(event.params.to.toHexString())
    citizenTo.dateAppeared = event.block.timestamp
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
  citizenTo.lastTransactionTo = event.block.timestamp 

  if (!contracts.includes(event.params.to.toHexString()) && !contracts.includes(event.params.from.toHexString())) {
    citizenTo.inTransactionsCountClean = citizenTo.inTransactionsCountClean.plus(BigInt.fromI32(1))
    citizenTo.inTransactionsValueClean = citizenTo.inTransactionsValueClean.plus(event.params.value)
    citizenTo.totalTransactionsCountClean = citizenTo.totalTransactionsCountClean.plus(BigInt.fromI32(1))
    citizenTo.totalTransactionsValueClean = citizenTo.totalTransactionsValueClean.plus(event.params.value)
  }

  citizenTo.save()

  if(enableLogs) log.info('aggregateCitizenToTransfer id {}, inTransactionsCount {}, outTransactionsCount {}, inTransactionsValue{}, outTransactionValue {}, balance {}',
    [
      citizenTo.id.toString(),
      citizenTo.inTransactionsCount.toString(),
      citizenTo.outTransactionsCount.toString(),
      citizenTo.inTransactionsValue.toString(),
      citizenTo.outTransactionsValue.toString(),
      citizenTo.balance.toString()
    ])
}
