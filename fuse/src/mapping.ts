import { BigInt, log } from '@graphprotocol/graph-ts'
import {
  UBIScheme,
  ActivatedUser,
  InactiveUserFished,
  OwnershipTransferred,
  SchemeEnded,
  SchemeStarted,
  TotalFished,
  UBICalculated,
  UBIClaimed,
  UBICycleCalculated,
  UBIEnded,
  UBIStarted,
  WithdrawFromDao,
} from '../generated/UBIScheme/UBIScheme'

import { WhitelistedAdded, WhitelistedRemoved } from '../generated/Identity/Identity'

import { DailyUBI, WalletStat, GlobalStatistics } from '../generated/schema'

let ZERO = BigInt.fromI32(0)
const enableLogs = true;


export function handleUBICalculated(event: UBICalculated): void {
  if(enableLogs) log.info('handleUBICalculated event.params.day {}, event.params.dailyUbi {}, event.params.blockNumber {}',
    [
      event.params.day.toString(),
      event.params.dailyUbi.toString(),
      event.params.blockNumber.toString()
    ])

  let ubiScheme = UBIScheme.bind(event.address)
  let activeUsers = ubiScheme.activeUsersCount()
  let quota = event.params.dailyUbi
  let pool = activeUsers.times(quota)
  if(enableLogs) log.info('dailyubi details: active: {} quota: {} pool: {}', [
    activeUsers.toString(),
    quota.toString(),
    pool.toString(),
  ])

  let currentDay = getCurrentDay(event.address.toHexString(), event.block.timestamp)
  //fixDailyUbiDaysCount(event.address.toHexString(), ubiScheme, oldUBISchemeAddress, newUBISchemeAddress)
  if (currentDay.equals(BigInt.fromI32(-1))) {
    return
  }

  //dont use first ubicalculated event of new ubi scheme so it doesnt override the valid
  if(currentDay.equals(OLDUBI_LAST_DAY) && event.address.toHexString() == NEWUBI)
    return

  let dailyUbi = DailyUBI.load(currentDay.toString())
  if (dailyUbi == null) {
    dailyUbi = new DailyUBI(currentDay.toString())
  }
  dailyUbi.ubiSchemeAddress = event.address
  dailyUbi.pool = pool
  dailyUbi.quota = quota
  dailyUbi.activeUsers = activeUsers
  dailyUbi.timestamp = event.block.timestamp
  dailyUbi.save()
}

export function handleUBIClaimed(event: UBIClaimed): void {
  if(enableLogs) log.info('handleUBIClaimed claimer start {}, contract address {}', [event.params.claimer.toHexString(), event.address.toHexString()])
  let citizen = WalletStat.load(event.params.claimer.toHex())
  let isUniqueClaimer = false
  if (citizen == null) {
    citizen = new WalletStat(event.params.claimer.toHexString())
    citizen.dateAppeared = event.block.timestamp
    citizen.lastClaimed = event.block.timestamp
    citizen.claimStreak = BigInt.fromI32(1)
    citizen.longestClaimStreak = BigInt.fromI32(1)
    isUniqueClaimer = true
  } else {
    log.info('handleUBIClaimed claimer found {}, contract address {}', [event.params.claimer.toHexString(), event.address.toHexString()])
  }

  aggregateCitizenFromUBIClaimed(event, citizen as WalletStat)

  let statistics = GlobalStatistics.load('statistics')
  if (statistics == null) {
    statistics = new GlobalStatistics('statistics')
  }

  aggregateStatisticsFromUBIClaimed(event, statistics, isUniqueClaimer)

  if(enableLogs) log.info('statistics.uniqueClaimers {}', [statistics.uniqueClaimers.toString()])

  let currentDay = getCurrentDay(event.address.toHexString(), event.block.timestamp)
  // let currentDay = fixDailyUbiDaysCount(event.address.toHexString(), ubiScheme, oldUBISchemeAddress, newUBISchemeAddress)
  if (currentDay.equals(BigInt.fromI32(-1))) {
    return
  }


  let dailyUbi = DailyUBI.load(currentDay.toString())  //cant be null because event to create day must happened before



  aggregateDailyUbiFromUBIClaimed(event, dailyUbi, isUniqueClaimer)

}

export function handleUBICycleCalculated(event: UBICycleCalculated): void {
  const day = getCurrentDay(event.address.toHexString(), event.block.timestamp)
  let dailyUbi = new DailyUBI(day.toString())

  dailyUbi.cycleLength = event.params.cycleLength
  dailyUbi.balance = event.params.pool
  dailyUbi.pool = event.params.dailyUBIPool
  if(enableLogs) log.info('handleUBICycleCalculated {} {} {}', [dailyUbi.cycleLength.toString(), dailyUbi.balance.toString(), dailyUbi.pool.toString()])

  dailyUbi.save()

 }

export function handleWhitelistedAdded(event: WhitelistedAdded): void {
  if(enableLogs) log.info('handleWhitelistedAdded event.params.account {}', [event.params.account.toHexString()])
  let citizen = WalletStat.load(event.params.account.toHex())

  if (citizen == null) {
    citizen = new WalletStat(event.params.account.toHex())
    citizen.dateAppeared = event.block.timestamp
    citizen.claimStreak = ZERO
  }

  if (citizen.dateJoined == null) {
    citizen.dateJoined = event.block.timestamp
  }

  citizen.isWhitelisted = true
  if(enableLogs) log.info('handleWhitelistedAdded citizen.dateJoined {}', [citizen.dateJoined.toString()])

  citizen.save()
}

export function handleWhitelistedRemoved(event: WhitelistedRemoved): void {
  if(enableLogs) log.info('handleWhitelistedRemoved event.params.account {}', [event.params.account.toHex()])
  let citizen = WalletStat.load(event.params.account.toHex())

  if (citizen == null) {
    citizen = new WalletStat(event.params.account.toHex())
    citizen.dateAppeared = event.block.timestamp
    citizen.claimStreak = ZERO

  }

  citizen.isWhitelisted = false

  citizen.save()
}

function aggregateDailyUbiFromUBIClaimed(event: UBIClaimed, dailyUbi: DailyUBI | null, isUniqueClaimer: boolean): void {
  dailyUbi.ubiSchemeAddress = event.address
  if (dailyUbi.totalUBIDistributed == null) {
    dailyUbi.totalUBIDistributed = event.params.amount
  } else {
    dailyUbi.totalUBIDistributed = dailyUbi.totalUBIDistributed.plus(event.params.amount)
  }

  if (dailyUbi.totalClaims == null) {
    dailyUbi.totalClaims = BigInt.fromI32(1)
  } else {
    dailyUbi.totalClaims = dailyUbi.totalClaims.plus(BigInt.fromI32(1))
  }

  if (isUniqueClaimer == true) {
    if (dailyUbi.uniqueClaimers == null) {
      dailyUbi.uniqueClaimers = BigInt.fromI32(1)
    } else {
      dailyUbi.uniqueClaimers = dailyUbi.uniqueClaimers.plus(BigInt.fromI32(1))
    }

  }

  if(enableLogs) log.info('handleUBIClaimed dailyUbi.id {}, dailyUbi.totalUBIDistributed {}, dailyUbi.uniqueClaimers {}, contract address {}', [dailyUbi.id.toString(), dailyUbi.totalUBIDistributed.toString(), dailyUbi.uniqueClaimers.toString(), event.address.toHexString()])

  dailyUbi.save()
}

function aggregateStatisticsFromUBIClaimed(event: UBIClaimed, statistics: GlobalStatistics | null, isUniqueClaimer: boolean): void {
  if (statistics.totalUBIDistributed == null) {
    statistics.totalUBIDistributed = event.params.amount
  } else {
    statistics.totalUBIDistributed = statistics.totalUBIDistributed.plus(event.params.amount)
  }

  if (isUniqueClaimer == true) {
    if (statistics.uniqueClaimers == null) {
      statistics.uniqueClaimers = BigInt.fromI32(1)
    } else {
      statistics.uniqueClaimers = statistics.uniqueClaimers.plus(BigInt.fromI32(1))
    }

  }

  if (statistics.totalClaims == null) {
    statistics.totalClaims = BigInt.fromI32(1)
  } else {
    statistics.totalClaims = statistics.totalClaims.plus(BigInt.fromI32(1))
  }

  statistics.save()

}

function aggregateCitizenFromUBIClaimed(event: UBIClaimed, citizen: WalletStat): void {

  let now = event.block.timestamp  

  let yesterday = now.minus(BigInt.fromI32(24 * 60 * 60))

  if(enableLogs) log.info('handleUBIClaimed claimer {}, citizen.claimStreak {}, citizen.longestClaimStreak {}',
    [
      event.params.claimer.toHexString(),
      citizen.claimStreak.toString(),
      citizen.longestClaimStreak.toString()
    ])

  if (citizen.lastClaimed.ge(yesterday)) {
    citizen.claimStreak = citizen.claimStreak.plus(BigInt.fromI32(1))
  } else {
    citizen.claimStreak = BigInt.fromI32(1)
  }

  if (citizen.longestClaimStreak.lt(citizen.claimStreak)) {
    citizen.longestClaimStreak = citizen.claimStreak
  }

  citizen.totalClaimedCount = citizen.totalClaimedCount.plus(BigInt.fromI32(1))
  citizen.totalClaimedValue = citizen.totalClaimedValue.plus(event.params.amount)
  citizen.lastClaimed = now

  citizen.save()

}

let OLDUBI_PERIOD_START = BigInt.fromI32(1596195612)
let NEWUBI_PERIOD_START = BigInt.fromI32(1612267200)
let OLDUBI_LAST_DAY = BigInt.fromI32(186)
const OLDUBI = '0xaacbaab8571cbeceb46ba85b5981efdb8928545e'
const NEWUBI = '0xd7ac544f8a570c4d8764c3aabcf6870cbd960d0d'

function getCurrentDay(address: String, eventTime: BigInt): BigInt{
  let currentDay:BigInt
  if (address == OLDUBI) {
    currentDay = eventTime.minus(OLDUBI_PERIOD_START).div(BigInt.fromI32(60*60*24))
    if(currentDay.gt(OLDUBI_LAST_DAY))
      return BigInt.fromI32(-1)
    return currentDay
  }

  currentDay = eventTime.minus(NEWUBI_PERIOD_START).div(BigInt.fromI32(60*60*24))
  currentDay = currentDay.plus(OLDUBI_LAST_DAY)
  return currentDay

}
//depracated
// function fixDailyUbiDaysCount(address: String, ubiScheme: UBIScheme, oldUBISchemeAddress: String, newUBISchemeAddress: String): BigInt {
//   let currentDay = ubiScheme.currentDay()
//   if(enableLogs) log.info('old currentDay {}, event.address.toHexString {}', [currentDay.toString(), address.toString()])

//   // old ubi scheme and we are past the last day of old ubi
//   if (address == oldUBISchemeAddress && currentDay.gt(oldUbiLastDay)) {
//     if(enableLogs) log.info('oldUBISchemeAddress past last old ubi day returning {}', [address.toString()])
//     currentDay = BigInt.fromI32(-1)
//   }

//   // we don't count new ubi scheme day 0
//   if (address == newUBISchemeAddress && currentDay.equals(ZERO)) {
//     if(enableLogs) log.info('newUBISchemeAddress day 0 returning {}', [address.toString()])
//     currentDay = BigInt.fromI32(-1)
//   }

//   // continue days count of new ubiScheme from where the last ubiScheme stopped
//   if (address == newUBISchemeAddress && currentDay.gt(ZERO)) {
//     currentDay = currentDay.plus(oldUbiLastDay)
//   }

//   if(enableLogs) log.info('new currentDay {}, address.toHexString {}', [currentDay.toString(), address.toString()])
//   return currentDay
// }
