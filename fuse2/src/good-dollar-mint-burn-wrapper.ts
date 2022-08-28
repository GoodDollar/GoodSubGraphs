import {
  AdminChanged as AdminChangedEvent,
  BeaconUpgraded as BeaconUpgradedEvent,
  Burned as BurnedEvent,
  Minted as MintedEvent,
  MinterSet as MinterSetEvent,
  Paused as PausedEvent,
  RoleAdminChanged as RoleAdminChangedEvent,
  RoleGranted as RoleGrantedEvent,
  RoleRevoked as RoleRevokedEvent,
  SendOrMint as SendOrMintEvent,
  Unpaused as UnpausedEvent,
  Upgraded as UpgradedEvent
} from "../generated/GoodDollarMintBurnWrapper/GoodDollarMintBurnWrapper"
import {
  AdminChanged,
  BeaconUpgraded,
  Burned,
  Minted,
  MinterSet,
  Paused,
  RoleAdminChanged,
  RoleGranted,
  RoleRevoked,
  SendOrMint,
  Unpaused,
  Upgraded
} from "../generated/schema"

export function handleAdminChanged(event: AdminChangedEvent): void {
  let entity = new AdminChanged(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity.previousAdmin = event.params.previousAdmin
  entity.newAdmin = event.params.newAdmin
  entity.save()
}

export function handleBeaconUpgraded(event: BeaconUpgradedEvent): void {
  let entity = new BeaconUpgraded(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity.beacon = event.params.beacon
  entity.save()
}

export function handleBurned(event: BurnedEvent): void {
  let entity = new Burned(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity.to = event.params.to
  entity.amount = event.params.amount
  entity.save()
}

export function handleMinted(event: MintedEvent): void {
  let entity = new Minted(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity.to = event.params.to
  entity.amount = event.params.amount
  entity.save()
}

export function handleMinterSet(event: MinterSetEvent): void {
  let entity = new MinterSet(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity.minter = event.params.minter
  entity.totalMintCap = event.params.totalMintCap
  entity.perTxCap = event.params.perTxCap
  entity.bps = event.params.bps
  entity.rewardsRole = event.params.rewardsRole
  entity.isUpdate = event.params.isUpdate
  entity.save()
}

export function handlePaused(event: PausedEvent): void {
  let entity = new Paused(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity.role = event.params.role
  entity.save()
}

export function handleRoleAdminChanged(event: RoleAdminChangedEvent): void {
  let entity = new RoleAdminChanged(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity.role = event.params.role
  entity.previousAdminRole = event.params.previousAdminRole
  entity.newAdminRole = event.params.newAdminRole
  entity.save()
}

export function handleRoleGranted(event: RoleGrantedEvent): void {
  let entity = new RoleGranted(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity.role = event.params.role
  entity.account = event.params.account
  entity.sender = event.params.sender
  entity.save()
}

export function handleRoleRevoked(event: RoleRevokedEvent): void {
  let entity = new RoleRevoked(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity.role = event.params.role
  entity.account = event.params.account
  entity.sender = event.params.sender
  entity.save()
}

export function handleSendOrMint(event: SendOrMintEvent): void {
  let entity = new SendOrMint(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity.to = event.params.to
  entity.amount = event.params.amount
  entity.sent = event.params.sent
  entity.minted = event.params.minted
  entity.outstandingMintDebt = event.params.outstandingMintDebt
  entity.save()
}

export function handleUnpaused(event: UnpausedEvent): void {
  let entity = new Unpaused(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity.role = event.params.role
  entity.save()
}

export function handleUpgraded(event: UpgradedEvent): void {
  let entity = new Upgraded(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity.implementation = event.params.implementation
  entity.save()
}
