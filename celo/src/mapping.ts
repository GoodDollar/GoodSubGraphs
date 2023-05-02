import { BigInt, log, ethereum, Address } from '@graphprotocol/graph-ts'
import {
  UBIScheme,
  UBICalculated,
  UBIClaimed,
  UBICycleCalculated,
  ActivatedUser,
  InactiveUserFished
} from '../generated/UBIScheme/UBIScheme'

import { GoodDollar } from '../generated/GoodDollar/GoodDollar'

import { WhitelistedAdded, WhitelistedRemoved } from '../generated/Identity/Identity'

import { DailyUBI, WalletStat, GlobalStatistics } from '../generated/schema'

let ZERO = BigInt.fromI32(0)
const enableLogs = false;


export function handleUBICalculated(event: UBICalculated): void {
  if (enableLogs) log.info('handleUBICalculated event.params.day {}, event.params.dailyUbi {}, event.params.blockNumber {}',
    [
      event.params.day.toString(),
      event.params.dailyUbi.toString(),
      event.params.blockNumber.toString()
    ])

  let ubiScheme = UBIScheme.bind(event.address)
  let activeUsers = ubiScheme.activeUsersCount()
  let quota = event.params.dailyUbi
  let pool = activeUsers.times(quota)
  if (enableLogs) log.info('dailyubi details: active: {} quota: {} pool: {}', [
    activeUsers.toString(),
    quota.toString(),
    pool.toString(),
  ])

  let currentDay = getCurrentDay(event.block.timestamp)


  let gd = GoodDollar.bind(Address.fromString("0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A"))
  let dailyUbi = DailyUBI.load(currentDay.toString())
  if (dailyUbi == null) {
    dailyUbi = new DailyUBI(currentDay.toString())
  }
  dailyUbi.ubiSchemeAddress = event.address
  dailyUbi.pool = pool
  dailyUbi.balance = gd.balanceOf(event.address)
  dailyUbi.quota = quota
  dailyUbi.activeUsers = activeUsers
  dailyUbi.timestamp = event.block.timestamp

  dailyUbi.cycleLength = ubiScheme.cycleLength()
  dailyUbi.dayInCycle = ubiScheme.currentDayInCycle()



  dailyUbi.save()
}

export function handleUBIClaimed(event: UBIClaimed): void {
  if (enableLogs) log.info('handleUBIClaimed claimer start {}, contract address {}', [event.params.claimer.toHexString(), event.address.toHexString()])


  aggregateCitizenFromUBIClaimed(event)

  aggregateStatisticsFromUBIClaimed(event)

  aggregateDailyUbiFromUBIClaimed(event)

}


export function handleWhitelistedAdded(event: WhitelistedAdded): void {
  if (enableLogs) log.info('handleWhitelistedAdded event.params.account {}', [event.params.account.toHexString()])
  let citizen = WalletStat.load(event.params.account.toHex())

  if (citizen == null) {
    citizen = new WalletStat(event.params.account.toHex())
    citizen.dateAppeared = event.block.timestamp
    citizen.claimStreak = ZERO
  }

  if (citizen.dateJoined.equals(BigInt.fromI32(0))) {
    citizen.dateJoined = event.block.timestamp
  }

  citizen.isWhitelisted = true
  if (enableLogs) log.info('handleWhitelistedAdded citizen.dateJoined {}', [citizen.dateJoined.toString()])

  citizen.save()

  let day = getCurrentDay(event.block.timestamp)
  let dailyUbi = DailyUBI.load(day.toString())
  if (dailyUbi == null)
    dailyUbi = new DailyUBI(day.toString())

  dailyUbi.newClaimers = dailyUbi.newClaimers.plus(BigInt.fromI32(1))
  dailyUbi.save()

  let statistics = GlobalStatistics.load('statistics')
  if (statistics == null) {
    statistics = new GlobalStatistics('statistics')
  }
  statistics.uniqueClaimers = statistics.uniqueClaimers.plus(BigInt.fromI32(1))
  statistics.save()
}

export function handleWhitelistedRemoved(event: WhitelistedRemoved): void {
  if (enableLogs) log.info('handleWhitelistedRemoved event.params.account {}', [event.params.account.toHex()])
  let citizen = WalletStat.load(event.params.account.toHex())

  if (citizen == null) {
    citizen = new WalletStat(event.params.account.toHex())
    citizen.dateAppeared = event.block.timestamp
    citizen.claimStreak = ZERO

  }

  citizen.isWhitelisted = false

  citizen.save()

  let statistics = GlobalStatistics.load('statistics')
  if (statistics == null) {
    statistics = new GlobalStatistics('statistics')
  }

  statistics.uniqueClaimers = statistics.uniqueClaimers.minus(BigInt.fromI32(1))
  statistics.save()

}

function aggregateDailyUbiFromUBIClaimed(event: UBIClaimed): void {
  let currentDay = getCurrentDay(event.block.timestamp)

  if (currentDay.equals(BigInt.fromI32(-1))) {
    return
  }

  let dailyUbi = DailyUBI.load(currentDay.toString())  //cant be null because event to create day must happened before

  if (dailyUbi) {
    dailyUbi.ubiSchemeAddress = event.address
    dailyUbi.totalUBIDistributed = dailyUbi.totalUBIDistributed.plus(event.params.amount)

    dailyUbi.totalClaims = dailyUbi.totalClaims.plus(BigInt.fromI32(1))

    // if (isUniqueClaimer == true) {
    //   if (dailyUbi.uniqueClaimers == null) {
    //     dailyUbi.uniqueClaimers = BigInt.fromI32(1)
    //   } else {
    //     dailyUbi.uniqueClaimers = dailyUbi.uniqueClaimers.plus(BigInt.fromI32(1))
    //   }

    // }

    if (enableLogs) log.info('handleUBIClaimed dailyUbi.id {}, dailyUbi.totalUBIDistributed {}, dailyUbi.newClaimers {}, contract address {}', [dailyUbi.id.toString(), dailyUbi.totalUBIDistributed.toString(), dailyUbi.newClaimers.toString(), event.address.toHexString()])

    dailyUbi.save()
  }
}

function aggregateStatisticsFromUBIClaimed(event: UBIClaimed): void {
  let statistics = GlobalStatistics.load('statistics')
  if (statistics == null) {
    statistics = new GlobalStatistics('statistics')
  }


  statistics.totalUBIDistributed = statistics.totalUBIDistributed.plus(event.params.amount)


  // if (isUniqueClaimer == true) {
  //   if (statistics.uniqueClaimers == null) {
  //     statistics.uniqueClaimers = BigInt.fromI32(1)
  //   } else {
  //     statistics.uniqueClaimers = statistics.uniqueClaimers.plus(BigInt.fromI32(1))
  //   }

  // }


  statistics.totalClaims = statistics.totalClaims.plus(BigInt.fromI32(1))


  if (enableLogs) log.info('statistics.uniqueClaimers {}', [statistics.uniqueClaimers.toString()])

  statistics.save()

}

function aggregateCitizenFromUBIClaimed(event: UBIClaimed): void {

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
    if (enableLogs) log.info('handleUBIClaimed claimer found {}, contract address {}', [event.params.claimer.toHexString(), event.address.toHexString()])
  }

  let now = event.block.timestamp

  let yesterday = now.minus(BigInt.fromI32(24 * 60 * 60))

  if (enableLogs) log.info('handleUBIClaimed claimer {}, citizen.claimStreak {}, citizen.longestClaimStreak {}',
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

export function handleActivatedUser(event: ActivatedUser): void {
  handleActiveUser(event.params.account, true);
}
export function handleFishedUser(event: InactiveUserFished): void {
  handleActiveUser(event.params.fished_account, false);
}

function handleActiveUser(user: Address, isActive: boolean): void {

  if (enableLogs) log.info("handleActiveUser {} {}", [user.toHexString(), isActive.toString()])

  let citizen = WalletStat.load(user.toHexString())
  if (citizen) {
    citizen.isActiveUser = isActive;
    citizen.save()
  }

}


function getCurrentDay(eventTime: BigInt): BigInt {
  let currentDay: BigInt


  currentDay = eventTime.div(BigInt.fromI32(60 * 60 * 24))
  return currentDay

}
