import { BigInt } from "@graphprotocol/graph-ts"
import {
  InviteeJoined as InviteeJoinedEvent,
  InviterBounty as InviterBountyEvent,
} from "../generated/InvitesV1/InvitesV1"
import { InvitesStats, User } from "../generated/schema"

const ADDRESS_ZERO = "0x0000000000000000000000000000000000000000"

export function handleInviteeJoined(event: InviteeJoinedEvent): void {
  let stats = InvitesStats.load("stats");
  if (stats == null) {
    stats = new InvitesStats("stats");
  }

  //init invitee
  const invitee = getInitUser(event.params.invitee.toHexString(), event.block.timestamp)

  //init inviter if exists
  if (event.params.inviter.toHexString() != ADDRESS_ZERO) {
    const inviter = getInitUser(event.params.invitee.toHexString(), event.block.timestamp)

    //update inviter and stats
    inviter.invitees.push(event.params.invitee)
    inviter.pending.push(event.params.invitee)
    inviter.totalInvited = inviter.totalInvited.plus(BigInt.fromI32(1))
    stats.totalInvited = stats.totalInvited.plus(BigInt.fromI32(1))
    stats.totalPending = stats.totalPending.plus(BigInt.fromI32(1))
    inviter.save()

    //update invitee
    invitee.invitedBy = event.params.inviter
  }

  invitee.save()
}

export function handleInviterBounty(event: InviterBountyEvent): void {
  let stats = InvitesStats.load("stats");
  if (stats == null) {
    stats = new InvitesStats("stats");
  }

  //init invitee
  const invitee = getInitUser(event.params.invitee.toHexString(), event.block.timestamp)

  //init inviter
  const inviter = getInitUser(event.params.invitee.toHexString(), event.block.timestamp)

  //update inviter and stats
  inviter.totalEarnedAsInviter = inviter.totalEarnedAsInviter.plus(event.params.bountyPaid)
  stats.totalInvitersBounties = stats.totalInvitersBounties.plus(event.params.bountyPaid)

  inviter.invitees.push(event.params.invitee)

  inviter.totalApprovedInvites = inviter.totalApprovedInvites.plus(BigInt.fromI32(1))
  stats.totalApprovedInvites = stats.totalApprovedInvites.plus(BigInt.fromI32(1))

  const index = inviter.pending.indexOf(event.params.invitee, 0)
  if (index > -1) {
    inviter.pending.splice(index, 1)
    inviter.totalPending = BigInt.fromI32(inviter.pending.length)
    stats.totalPending = stats.totalPending.minus(BigInt.fromI32(1))
  }

  inviter.save()

  //update invitee
  invitee.invitedBy = event.params.inviter
  invitee.earnedAsInvitee = event.params.bountyPaid.div(BigInt.fromI32(2))

  invitee.save()
}

function getInitUser(id: string, timestamp: BigInt) {
  let user = User.load(id)
  if (user == null) {
    user = new User(id)
    user.bountyPaid = false
    user.totalInvited = BigInt.zero()
    user.totalApprovedInvites = BigInt.zero()
    user.totalEarnedAsInviter = BigInt.zero()
    user.earnedAsInvitee = BigInt.zero()
    // todo: handle levels if needed
    user.joinedAt = timestamp
  }

  return user
}
