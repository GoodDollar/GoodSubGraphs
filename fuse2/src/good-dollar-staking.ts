import { BigInt } from "@graphprotocol/graph-ts"
import {
  GoodDollarStaking,
  Approval,
  ReputationEarned,
  StakeWithdraw,
  Staked,
  Transfer
} from "../generated/GoodDollarStaking/GoodDollarStaking"
import { ExampleEntity } from "../generated/schema"

export function handleApproval(event: Approval): void {
  // Entities can be loaded from the store using a string ID; this ID
  // needs to be unique across all entities of the same type
  let entity = ExampleEntity.load(event.transaction.from.toHex())

  // Entities only exist after they have been saved to the store;
  // `null` checks allow to create entities on demand
  if (!entity) {
    entity = new ExampleEntity(event.transaction.from.toHex())

    // Entity fields can be set using simple assignments
    entity.count = BigInt.fromI32(0)
  }

  // BigInt and BigDecimal math are supported
  entity.count = entity.count + BigInt.fromI32(1)

  // Entity fields can be set based on event parameters
  entity.owner = event.params.owner
  entity.spender = event.params.spender

  // Entities can be written to the store with `.save()`
  entity.save()

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
  // - contract.PRECISION(...)
  // - contract.SHARE_DECIMALS(...)
  // - contract.SHARE_PRECISION(...)
  // - contract.allowance(...)
  // - contract.approve(...)
  // - contract.avatar(...)
  // - contract.balanceOf(...)
  // - contract.contractToUsers(...)
  // - contract.createdAt(...)
  // - contract.dao(...)
  // - contract.daysUntilUpgrade(...)
  // - contract.decimals(...)
  // - contract.decreaseAllowance(...)
  // - contract.earned(...)
  // - contract.getChainBlocksPerMonth(...)
  // - contract.getPrinciple(...)
  // - contract.getProductivity(...)
  // - contract.getRewardsDebt(...)
  // - contract.getRewardsPerBlock(...)
  // - contract.getStaked(...)
  // - contract.getUserPendingReward(...)
  // - contract.getUserPendingReward(...)
  // - contract.goodStakerInfo(...)
  // - contract.increaseAllowance(...)
  // - contract.interestRatePerBlockX64(...)
  // - contract.lastRewardBlock(...)
  // - contract.name(...)
  // - contract.nameService(...)
  // - contract.nativeToken(...)
  // - contract.numberOfBlocksPerYear(...)
  // - contract.onTokenTransfer(...)
  // - contract.rewardsMintedSoFar(...)
  // - contract.rewardsPerBlock(...)
  // - contract.sharePrice(...)
  // - contract.stakersInfo(...)
  // - contract.stats(...)
  // - contract.symbol(...)
  // - contract.token(...)
  // - contract.totalRewardsAccumulated(...)
  // - contract.totalRewardsPerShare(...)
  // - contract.totalRewardsPerShare(...)
  // - contract.totalSupply(...)
  // - contract.transfer(...)
  // - contract.transferFrom(...)
  // - contract.withdrawRewards(...)
  // - contract.withdrawStake(...)
}

export function handleReputationEarned(event: ReputationEarned): void {}

export function handleStakeWithdraw(event: StakeWithdraw): void {}

export function handleStaked(event: Staked): void {}

export function handleTransfer(event: Transfer): void {}
