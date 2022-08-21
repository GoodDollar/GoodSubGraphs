import { BigInt } from "@graphprotocol/graph-ts"
import {
  InviteeJoined as InviteeJoinedEvent,
  InviterBounty as InviterBountyEvent,
} from "../generated/InvitesV1/InvitesV1"
import { InviteeJoined, InviterBounty, InvitesStats, User } from "../generated/schema"

const ADDRESS_ZERO = "0x0000000000000000000000000000000000000000"

export function handleInviteeJoined(event: InviteeJoinedEvent): void {
  // let entity = new InviteeJoined(
  //   event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  // )
  // entity.inviter = event.params.inviter
  // entity.invitee = event.params.invitee
  // entity.save()

  //init stats
  const stats = getInitStats()

  //init invitee
  const invitee = getInitUser(event.params.invitee.toHexString(), event.block.timestamp)

  //init inviter if exists
  if (event.params.inviter.toHexString() != ADDRESS_ZERO) {
    const inviter = getInitUser(event.params.invitee.toHexString(), event.block.timestamp)

    //update inviter and stats    
    inviter.pending.push(event.params.invitee.toHexString())

    inviter.totalInvited = inviter.totalInvited.plus(BigInt.fromI32(1))
    stats.totalInvited = stats.totalInvited.plus(BigInt.fromI32(1))

    inviter.totalPending = inviter.totalPending.plus(BigInt.fromI32(1))
    stats.totalPending = stats.totalPending.plus(BigInt.fromI32(1))

    inviter.save()
    stats.save()

    //update invitee
    invitee.invitedBy = event.params.inviter.toHexString()
  }

  invitee.save()
}

export function handleInviterBounty(event: InviterBountyEvent): void {
  // let entity = new InviterBounty(
  //   event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  // )
  // entity.inviter = event.params.inviter
  // entity.invitee = event.params.invitee
  // entity.bountyPaid = event.params.bountyPaid
  // entity.inviterLevel = event.params.inviterLevel
  // entity.earnedLevel = event.params.earnedLevel
  // entity.save()

  //init stats
  const stats = getInitStats()

  //init invitee
  const invitee = getInitUser(event.params.invitee.toHexString(), event.block.timestamp)

  //init inviter
  const inviter = getInitUser(event.params.invitee.toHexString(), event.block.timestamp)

  inviter.level = event.params.inviterLevel
  if(event.params.earnedLevel)
  {
    inviter.levelStarted = event.block.timestamp
  }

  //update inviter and stats
  inviter.totalEarnedAsInviter = inviter.totalEarnedAsInviter.plus(event.params.bountyPaid)
  stats.totalInvitersBounties = stats.totalInvitersBounties.plus(event.params.bountyPaid)

  inviter.totalApprovedInvites = inviter.totalApprovedInvites.plus(BigInt.fromI32(1))
  stats.totalApprovedInvites = stats.totalApprovedInvites.plus(BigInt.fromI32(1))

  const index = inviter.pending.indexOf(event.params.invitee.toHexString(), 0)
  if (index > -1) {
    inviter.pending = inviter.pending.splice(index, 1)
    inviter.totalPending = inviter.totalPending.minus(BigInt.fromI32(1))
    stats.totalPending = stats.totalPending.minus(BigInt.fromI32(1))
  }

  stats.save()
  inviter.save()

  //update invitee
  invitee.bountyPaid = true
  invitee.invitedBy = event.params.inviter.toHexString()
  invitee.earnedAsInvitee = event.params.bountyPaid.div(BigInt.fromI32(2))

  invitee.save()
}

function getInitUser(id: string, timestamp: BigInt): User {
  let user = User.load(id)
  if (user == null) {
    user = new User(id)
    user.bountyPaid = false
    user.earnedAsInvitee = BigInt.zero()
    user.totalPending = BigInt.zero()
    user.totalInvited = BigInt.zero()
    user.totalApprovedInvites = BigInt.zero()
    user.totalEarnedAsInviter = BigInt.zero()
    user.level = BigInt.zero()
    user.levelStarted = timestamp
    user.joinedAt = timestamp
    user.earnedAsInvitee = BigInt.zero()
    user.pending = new Array<string>(0)

  }

  return user
}

function getInitStats(): InvitesStats {
  let stats = InvitesStats.load("stats")
  if (stats == null) {
    stats = new InvitesStats("stats")
    stats.totalApprovedInvites = BigInt.zero()
    stats.totalPending = BigInt.zero()
    stats.totalInvitersBounties = BigInt.zero()
    stats.totalInvited = BigInt.zero()
  }

  return stats
}