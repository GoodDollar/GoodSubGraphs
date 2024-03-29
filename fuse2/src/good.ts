import { BigInt } from "@graphprotocol/graph-ts"
import {
    Mint, Burn, StateHash as StateHashEvent, StateHashProof, DelegateVotesChanged
} from "../generated/GOOD/GReputation"
import { GoodBalance, StateHash, StateProof } from "../generated/schema"

export function handleStateHash(event: StateHashEvent): void {
    const entity = new StateHash(event.transaction.hash.toHex() + "-" + event.logIndex.toString())

    entity.blockchain = event.params.blockchain;
    entity.merkleRoot = event.params.merkleRoot
    entity.totalSupply = event.params.totalSupply
    entity.timestamp = event.block.timestamp

    entity.save()
}

export function handleStateProof(event: StateHashProof): void {
    let curBlockchainProof = StateProof.load(event.params.user.toHexString() + "_" + event.params.blockchain)
    if (curBlockchainProof === null) {
        curBlockchainProof = new StateProof(event.params.user.toHexString() + "_" + event.params.blockchain)
        curBlockchainProof.balance = BigInt.zero()
    }
    let prevBlockchainBalance = curBlockchainProof.balance
    curBlockchainProof.account = event.params.user.toHexString()
    curBlockchainProof.balance = event.params.repBalance
    curBlockchainProof.blockchain = event.params.blockchain
    curBlockchainProof.timestamp = event.block.timestamp
    curBlockchainProof.save()


    //in case of root state we dont have to do any updates, as it triggers Mint event
    if (event.params.blockchain == "rootState") {
        return;
    }
    else {
        const balance = getInitBalance(event.params.user.toHexString(), event.block.timestamp)
        balance.blockchainsBalance = balance.blockchainsBalance.minus(prevBlockchainBalance).plus(event.params.repBalance)
        balance.totalVotes = balance.activeVotes.plus(balance.blockchainsBalance)

        balance.save()
    }
}

export function handleMint(event: Mint): void {
    const balance = getInitBalance(event.params._to.toHexString(), event.block.timestamp)
    balance.coreBalance = balance.coreBalance.plus(event.params._amount)
    //we dont update other balances because matching DelegateVotesChanged will be fired
    balance.save()
}

export function handleBurn(event: Mint): void {
    const balance = getInitBalance(event.params._to.toHexString(), event.block.timestamp)
    balance.coreBalance = balance.coreBalance.minus(event.params._amount)
    //we dont update other balances because matching DelegateVotesChanged will be fired
    balance.save()
}

export function handleVotesDelegated(event: DelegateVotesChanged): void {
    const delegate = getInitBalance(event.params.delegate.toHexString(), event.block.timestamp)
    const delegator = getInitBalance(event.params.delegator.toHexString(), event.block.timestamp)
    const isDelegating = event.params.newBalance.gt(event.params.previousBalance)
    if (isDelegating) //this event fires also when removing delegator
    {
        delegator.delegatee = delegate.id
        //in case they are not the same record, save the updated delegate record
        if (delegator.id !== delegate.id) {
            // this means both records are the same, we need to make sure we change and save just one, or change both with exact data and save
            // otherwise when we save they overwrite each other            
            //we dont change delegate balances here because another event will be fired if delegate was its own delegator
            delegator.save()
        }        
    }

    delegate.activeVotes = event.params.newBalance
    delegate.totalVotes = delegate.activeVotes.plus(delegate.blockchainsBalance)

    delegate.save()



}

function getInitBalance(id: string, timestamp: BigInt): GoodBalance {
    let balance = GoodBalance.load(id)
    if (balance == null) {
        balance = new GoodBalance(id)
        balance.activeVotes = BigInt.zero()
        balance.coreBalance = BigInt.zero()
        balance.blockchainsBalance = BigInt.zero()
        balance.totalVotes = BigInt.zero()
        balance.memberSince = timestamp
    }
    balance.lastUpdate = timestamp

    return balance
}