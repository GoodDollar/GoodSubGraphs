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
let oldUbiLastDay = BigInt.fromI32(186)

const oldUBISchemeAddress = '0xaacbaab8571cbeceb46ba85b5981efdb8928545e'
const newUBISchemeAddress = '0xd7ac544f8a570c4d8764c3aabcf6870cbd960d0d'

export function handleActivatedUser(event: ActivatedUser): void {
  // // Entities can be loaded from the store using a string ID; this ID
  // // needs to be unique across all entities of the same type
  // let entity = ExampleEntity.load(event.transaction.from.toHex())
  // // Entities only exist after they have been saved to the store;
  // // `null` checks allow to create entities on demand
  // if (entity == null) {
  //   entity = new ExampleEntity(event.transaction.from.toHex())
  //   // Entity fields can be set using simple assignments
  //   entity.count = BigInt.fromI32(0)
  // }
  // // BigInt and BigDecimal math are supported
  // entity.count = entity.count + BigInt.fromI32(1)
  // // Entity fields can be set based on event parameters
  // entity.account = event.params.account
  // // Entities can be written to the store with `.save()`
  // entity.save()
  // Note: If a handler doesn't require existing field values, it is faster
  // _not_ to load the entity from the store. Instead, create it fresh with
  // `new Entity(...)`, set the fields that should be updated and save the
  // entity back to the store. Fields that were not set or unset remain
  // unchanged, allowing for partial updates to be applied.
  // It is also possible to access smart contracts from mappings. For
  // example, the contract that has emitted the event can be connected to
  // with:
  //
  // let contract = Contract.bind(event.address)
  //
  // The following functions can then be called on this contract to access
  // state variables and other data:
  //
  // - contract.activeUsersCount(...)
  // - contract.claimDistribution(...)
  // - contract.currentCycleLength(...)
  // - contract.currentDay(...)
  // - contract.cycleLength(...)
  // - contract.dailyCyclePool(...)
  // - contract.dailyUBIHistory(...)
  // - contract.dailyUbi(...)
  // - contract.firstClaimPool(...)
  // - contract.fishedUsersAddresses(...)
  // - contract.getClaimAmount(...)
  // - contract.getClaimerCount(...)
  // - contract.getDailyStats(...)
  // - contract.identity(...)
  // - contract.isActive(...)
  // - contract.isOwner(...)
  // - contract.isRegistered(...)
  // - contract.isRegistered(...)
  // - contract.iterationGasLimit(...)
  // - contract.lastClaimed(...)
  // - contract.lastWithdrawDay(...)
  // - contract.maxInactiveDays(...)
  // - contract.owner(...)
  // - contract.periodEnd(...)
  // - contract.periodStart(...)
  // - contract.shouldWithdrawFromDAO(...)
  // - contract.startOfCycle(...)
  // - contract.totalClaimsPerUser(...)
  // - contract.currentDayInCycle(...)
  // - contract.hasClaimed(...)
  // - contract.isNotNewUser(...)
  // - contract.isActiveUser(...)
  // - contract.checkEntitlement(...)
  // - contract.claim(...)
  // - contract.fish(...)
  // - contract.fishMulti(...)
}

export function handleInactiveUserFished(event: InactiveUserFished): void { }

export function handleOwnershipTransferred(event: OwnershipTransferred): void { }

export function handleSchemeEnded(event: SchemeEnded): void { }

export function handleSchemeStarted(event: SchemeStarted): void { }

export function handleTotalFished(event: TotalFished): void { }

export function handleUBICalculated(event: UBICalculated): void {
  log.info('handleUBICalculated event.params.day {}, event.params.dailyUbi {}, event.params.blockNumber {}',
    [
      event.params.day.toString(),
      event.params.dailyUbi.toString(),
      event.params.blockNumber.toString()
    ])

  let ubiScheme = UBIScheme.bind(event.address)
  let activeUsers = ubiScheme.activeUsersCount()
  let quota = event.params.dailyUbi
  let pool = activeUsers.times(quota)
  log.info('dailyubi details: active: {} quota: {} pool: {}', [
    activeUsers.toString(),
    quota.toString(),
    pool.toString(),
  ])

  let currentDay = fixDailyUbiDaysCount(event.address.toHexString(), ubiScheme, oldUBISchemeAddress, newUBISchemeAddress)
  if (currentDay.equals(BigInt.fromI32(-1))) {
    return
  }

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
  log.info('handleUBIClaimed claimer start {}, contract address {}', [event.params.claimer.toHexString(), event.address.toHexString()])
  let citizen = WalletStat.load(event.params.claimer.toHex())

  if (citizen == null) {
    citizen = new WalletStat(event.params.claimer.toHex())
  }

  let isUniqueClaimer = false
  if (citizen.lastClaimed == null) {
    isUniqueClaimer = true
  }

  aggregateCitizenFromUBIClaimed(event, citizen)

  let statistics = GlobalStatistics.load('statistics')
  if (statistics == null) {
    statistics = new GlobalStatistics('statistics')
  }

  aggregateStatisticsFromUBIClaimed(event, statistics, isUniqueClaimer)

  log.info('statistics.uniqueClaimers {}', [statistics.uniqueClaimers.toString()])

  let ubiScheme = UBIScheme.bind(event.address)

  let currentDay = fixDailyUbiDaysCount(event.address.toHexString(), ubiScheme, oldUBISchemeAddress, newUBISchemeAddress)
  if (currentDay.equals(BigInt.fromI32(-1))) {
    return
  }


  let dailyUbi = DailyUBI.load(currentDay.toString())
  if (dailyUbi == null) {
    dailyUbi = new DailyUBI(currentDay.toString())
  }


  aggregateDailyUbiFromUBIClaimed(event, dailyUbi, isUniqueClaimer)

}

export function handleUBICycleCalculated(event: UBICycleCalculated): void { }

export function handleUBIEnded(event: UBIEnded): void { }

export function handleUBIStarted(event: UBIStarted): void { }

export function handleWithdrawFromDao(event: WithdrawFromDao): void { }

export function handleWhitelistedAdded(event: WhitelistedAdded): void {
  log.info('handleWhitelistedAdded event.params.account {}', [event.params.account.toHexString()])
  let citizen = WalletStat.load(event.params.account.toHex())

  if (citizen == null) {
    citizen = new WalletStat(event.params.account.toHex())
    citizen.claimStreak = BigInt.fromI32(0)
  }

  if (citizen.dateJoined == null) {
    citizen.dateJoined = event.block.timestamp
  }

  citizen.isActive = true
  log.info('handleWhitelistedAdded citizen.dateJoined {}', [citizen.dateJoined.toString()])

  citizen.save()
}

export function handleWhitelistedRemoved(event: WhitelistedRemoved): void {
  log.info('handleWhitelistedRemoved event.params.account {}', [event.params.account.toHex()])
  let citizen = WalletStat.load(event.params.account.toHex())

  if (citizen == null) {
    citizen = new WalletStat(event.params.account.toHex())
    citizen.claimStreak = BigInt.fromI32(0)
  }

  citizen.isActive = false

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

  log.info('handleUBIClaimed dailyUbi.id {}, dailyUbi.totalUBIDistributed {}, dailyUbi.uniqueClaimers {}, contract address {}', [dailyUbi.id.toString(), dailyUbi.totalUBIDistributed.toString(), dailyUbi.uniqueClaimers.toString(), event.address.toHexString()])

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

function aggregateCitizenFromUBIClaimed(event: UBIClaimed, citizen: WalletStat | null): void {

  let now = event.block.timestamp

  if (citizen.lastClaimed == null) {
    citizen.lastClaimed = now
  }

  if (citizen.claimStreak == null) {
    citizen.claimStreak = BigInt.fromI32(1)
  }

  if (citizen.longestClaimStreak == null) {
    citizen.longestClaimStreak = BigInt.fromI32(1)
  }

  let yesterday = now.minus(BigInt.fromI32(24 * 60 * 60))

  log.info('handleUBIClaimed claimer {}, citizen.claimStreak {}, citizen.longestClaimStreak {}',
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

  citizen.save()

}

function fixDailyUbiDaysCount(address: String, ubiScheme: UBIScheme, oldUBISchemeAddress: String, newUBISchemeAddress: String): BigInt {
  let currentDay = ubiScheme.currentDay()
  log.info('old currentDay {}, event.address.toHexString {}', [currentDay.toString(), address.toString()])

  // old ubi scheme and we are past the last day of old ubi
  if (address == oldUBISchemeAddress && currentDay.gt(oldUbiLastDay)) {
    log.info('oldUBISchemeAddress past last old ubi day returning {}', [address.toString()])
    currentDay = BigInt.fromI32(-1)
  }

  // we don't count new ubi scheme day 0
  if (address == newUBISchemeAddress && currentDay.equals(ZERO)) {
    log.info('newUBISchemeAddress day 0 returning {}', [address.toString()])
    currentDay = BigInt.fromI32(-1)
  }

  // continue days count of new ubiScheme from where the last ubiScheme stopped
  if (address == newUBISchemeAddress && currentDay.gt(ZERO)) {
    currentDay = currentDay.plus(oldUbiLastDay)
  }

  log.info('new currentDay {}, address.toHexString {}', [currentDay.toString(), address.toString()])
  return currentDay
}
