import { BigInt, Address } from "@graphprotocol/graph-ts";
import {
  InviteeJoined as InviteeJoinedEvent,
  InviterBounty as InviterBountyEvent,
} from "../generated/InvitesV1/InvitesV1";
import { InvitesStats, User } from "../generated/schema";

const ADDRESS_ZERO = "0x0000000000000000000000000000000000000000";

export function handleInviteeJoined(event: InviteeJoinedEvent): void {
  //init invitee
  let invitee = User.load(event.params.invitee.toHexString());
  if (invitee == null) {
    invitee = new User(event.params.invitee.toHexString());
    invitee.bountyPaid = false;
    invitee.totalApprovedInvites = BigInt.zero();
    invitee.totalEarned = BigInt.zero();
    // invitee.invitees
    // invitee.pending
    // invitee.levelStarted
    // invitee.level = event.block.timestamp;
    invitee.joinedAt = event.block.timestamp;
  }

  const invitorIsZero = event.params.inviter.toHexString() != ADDRESS_ZERO;

  //init inviter
  if (!invitorIsZero) {
    let inviter = User.load(event.params.inviter.toHexString());

    if (inviter == null) {
      inviter = new User(event.params.inviter.toHexString());
      inviter.bountyPaid = false;
      inviter.totalApprovedInvites = BigInt.zero();
      inviter.totalEarned = BigInt.zero();
      // inviter.invitees
      // inviter.pending
      // inviter.levelStarted
      // inviter.level = event.block.timestamp;
      inviter.joinedAt = event.block.timestamp;
    }

    //update inviter

    inviter.save();
  }

  invitee.save();
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
}
