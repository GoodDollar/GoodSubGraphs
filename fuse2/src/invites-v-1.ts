import {
  InviteeJoined as InviteeJoinedEvent,
  InviterBounty as InviterBountyEvent
} from "../generated/InvitesV1/InvitesV1"
import { InviteeJoined, InviterBounty } from "../generated/schema"

export function handleInviteeJoined(event: InviteeJoinedEvent): void {
  let entity = new InviteeJoined(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity.inviter = event.params.inviter
  entity.invitee = event.params.invitee
  entity.save()
}

export function handleInviterBounty(event: InviterBountyEvent): void {
  let entity = new InviterBounty(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity.inviter = event.params.inviter
  entity.invitee = event.params.invitee
  entity.bountyPaid = event.params.bountyPaid
  entity.inviterLevel = event.params.inviterLevel
  entity.earnedLevel = event.params.earnedLevel
  entity.save()
}
