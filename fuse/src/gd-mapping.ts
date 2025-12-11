import { BigInt, log, Address } from '@graphprotocol/graph-ts'
import {
  Transfer,
} from '../generated/GoodDollar/GoodDollar'
import { GlobalStatistics, TransactionStat, WalletStat } from '../generated/schema'

import { allAddresses } from '../scripts/releases'

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
let ZERO = BigInt.fromI32(0)
const enableLogs = false;

// excluding contract TXs for clean count
let contracts:Array<string> = allAddresses

export function initCitizen(id: string): WalletStat {
  const citizen = new WalletStat(id)

  citizen.balance = ZERO
  citizen.claimStreak = ZERO
  citizen.dateAppeared = ZERO
  citizen.dateJoined = ZERO
  citizen.isActiveUser = false
  citizen.isWhitelisted = false
  citizen.lastClaimed = ZERO
  citizen.lastTransactionFrom = ZERO
  citizen.lastTransactionTo = ZERO
  citizen.longestClaimStreak = ZERO
  citizen.totalClaimedCount = ZERO
  citizen.totalClaimedValue = ZERO
  citizen.totalTransactionsCount = ZERO
  citizen.totalTransactionsCountClean = ZERO
  citizen.totalTransactionsValue = ZERO
  citizen.totalTransactionsValueClean = ZERO
  citizen.outTransactionsCount = ZERO
  citizen.outTransactionsCountClean = ZERO
  citizen.outTransactionsValue = ZERO
  citizen.outTransactionsValueClean = ZERO
  citizen.inTransactionsCount = ZERO
  citizen.inTransactionsCountClean = ZERO
  citizen.inTransactionsValue = ZERO
  citizen.inTransactionsValueClean = ZERO

  return citizen
}
export function initStatistics(statistics: TransactionStat): void {
  statistics.dayStartBlockNumber = ZERO
  statistics.transactionsCount = ZERO
  statistics.transactionsCountClean = ZERO
  statistics.transactionsValue = ZERO
  statistics.transactionsValueClean = ZERO
  statistics.totalInCirculation = ZERO

} 
export function handleTransfer(event: Transfer): void {

  if(enableLogs) log.info('handleTransferEvent event.params.from {}, event.params.to {}, event.params.value {}, event.transaction.hash {}', [event.params.from.toHex(), event.params.to.toHex(), event.params.value.toString(), event.transaction.hash.toHex()])

  let aggregated = TransactionStat.load('aggregated')

  if (aggregated == null) {
    aggregated = new TransactionStat('aggregated')    
    initStatistics(aggregated)
    aggregated.dayStartBlockNumber = event.block.number
  }

  aggregateTransactionStatFromTransfer(event, aggregated)

  let statistics = GlobalStatistics.load('statistics')
  if (statistics == null) {
    statistics = new GlobalStatistics('statistics')
    statistics.TransactionStat = aggregated.id
    statistics.uniqueClaimers = ZERO
    statistics.totalUBIDistributed = ZERO
    statistics.totalClaims = ZERO
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
    initStatistics(dailyStatistics)
    dailyStatistics.dayStartBlockNumber = event.block.number    
  }
  aggregateTransactionStatFromTransfer(event, dailyStatistics)
  
  aggregateCitizenFromTransfer(event)

}

function aggregateTransactionStatFromTransfer(event: Transfer, statistics: TransactionStat): void {

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
    citizenFrom = initCitizen(event.params.from.toHexString())
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
    citizenTo = initCitizen(event.params.to.toHexString())
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
