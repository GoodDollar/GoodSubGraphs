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

import { DailyUBI, Citizen } from '../generated/schema'

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
  log.info('got ubicalculated event {}', [event.params.day.toHex()])
  let ubiScheme = UBIScheme.bind(event.address)
  let activeUsers = ubiScheme.activeUsersCount()
  let quota = event.params.dailyUbi
  let pool = activeUsers.times(quota)
  log.info('dailyubi details: active: {} quota: {} pool: {}', [
    activeUsers.toString(),
    quota.toString(),
    pool.toString(),
  ])
  let dailyUbi = new DailyUBI(event.params.day.toString())
  dailyUbi.pool = pool
  dailyUbi.quota = quota
  dailyUbi.activeUsers = activeUsers
  dailyUbi.timestamp = event.block.timestamp
  dailyUbi.save()
}

export function handleUBIClaimed(event: UBIClaimed): void {
  log.info('handleUBIClaimed claimer start {}', [event.params.claimer.toHexString()])
  let citizen = Citizen.load(event.params.claimer.toHex())

  let now = event.block.timestamp

  if (citizen == null) {
    citizen = new Citizen(event.params.claimer.toHex())
  }

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

  citizen.lastClaimed = now
  citizen.save()
}

export function handleUBICycleCalculated(event: UBICycleCalculated): void { }

export function handleUBIEnded(event: UBIEnded): void { }

export function handleUBIStarted(event: UBIStarted): void { }

export function handleWithdrawFromDao(event: WithdrawFromDao): void { }

export function handleWhitelistedAdded(event: WhitelistedAdded): void {
  log.info('handleWhitelistedAdded event.params.account {}', [event.params.account.toHexString()])
  let citizen = Citizen.load(event.params.account.toHex())

  if (citizen == null) {
    citizen = new Citizen(event.params.account.toHex())
    citizen.claimStreak = BigInt.fromI32(1)
    citizen.longestClaimStreak = BigInt.fromI32(1)
  }

  if (citizen.dateJoined == null) {
    citizen.dateJoined = event.block.timestamp
  }

  citizen.isCitizen = true
  log.info('handleWhitelistedAdded citizen.dateJoined {}', [citizen.dateJoined.toString()])

  citizen.save()
}

export function handleWhitelistedRemoved(event: WhitelistedRemoved): void {
  log.info('handleWhitelistedRemoved event.params.account {}', [event.params.account.toHex()])
  let citizen = Citizen.load(event.params.account.toHex())

  if (citizen == null) {
    citizen = new Citizen(event.params.account.toHex())
  }

  // TODO: should claim streak be reset to zero when removing citizen?
  citizen.claimStreak = BigInt.fromI32(0)

  citizen.isCitizen = false

  citizen.save()
}

