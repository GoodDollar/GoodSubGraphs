import { BigInt, log, ethereum, Address, BigDecimal } from '@graphprotocol/graph-ts'
import {
  UBICollected
} from '../generated/FuseStaking/FuseStaking'

import { UBICollected as UBICollectedRecord, UBIHistory } from '../generated/schema'

let ZERO = BigInt.fromI32(0)

export function handleUBICollected(event: UBICollected): void{
    let ubievent = new UBICollectedRecord(event.address.toHexString() + "_" + event.transaction.hash.toHexString());
    ubievent.contract =  event.address
    ubievent.block = event.block.number
    ubievent.blockTimestamp = event.block.timestamp
    ubievent.ubi = event.params.ubi.toBigDecimal().div(BigDecimal.fromString("100"));
    ubievent.communityPool = event.params.communityPool.toBigDecimal().div(BigDecimal.fromString("100"));
    ubievent.save()
    _updateUBI(event.block.timestamp, event.block.number, event.address, event.params.ubi, event.params.communityPool);
}

function _updateUBI(blockTimestamp: BigInt, blockNumber: BigInt,contract: Address, ubi: BigInt, communityPool: BigInt): void {
    let dayTimestamp = blockTimestamp.minus(blockTimestamp.mod(BigInt.fromI32(60 * 60 * 24)))
    // log.debug('_updateUBI got timestamp {}', [blockTimestamp.toString()])
  
    let ubiHistory = UBIHistory.load(dayTimestamp.toString())  
  
    if (ubiHistory === null) {
        ubiHistory = new UBIHistory(dayTimestamp.toString())
        ubiHistory.totalDailyUBI = BigDecimal.fromString("0")
        ubiHistory.totalDailyCommunityPool = BigDecimal.fromString("0")
    }
  
    ubiHistory.blockTimestamp = blockTimestamp
    ubiHistory.block = blockNumber
  
    ubiHistory.totalDailyCommunityPool = ubiHistory.totalDailyCommunityPool.plus(communityPool.toBigDecimal().div(BigDecimal.fromString("100")))
    ubiHistory.totalDailyUBI = ubiHistory.totalDailyUBI.plus(ubi.toBigDecimal().div(BigDecimal.fromString("100")))

    ubiHistory.save()
  }
