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
    let curBlockchainProof = StateProof.load(event.params.user.toHexString()+"_"+event.params.blockchain)
    if(curBlockchainProof === null)
    {
        curBlockchainProof  = new StateProof(event.params.user.toHexString()+"_"+event.params.blockchain)
    }
    let prevBlockchainBalance = curBlockchainProof.balance || BigInt.zero()
    curBlockchainProof.account = event.params.user.toHexString()
    curBlockchainProof.balance = event.params.repBalance
    curBlockchainProof.blockchain = event.params.blockchain
    curBlockchainProof.save()
    
    

    const balance = getInitBalance(event.params.user.toHexString())
    balance.blockchainsBalance = balance.blockchainsBalance.minus(prevBlockchainBalance).plus(event.params.repBalance)
    balance.totalVotes = balance.activeVotes.plus(balance.blockchainsBalance)
    

    balance.save()
}

export function handleMint(event: Mint): void {
    const balance = getInitBalance(event.params._to.toHexString())
    balance.coreBalance = balance.coreBalance.plus(event.params._amount)
    //we dont update other balances because matching DelegateVotesChanged will be fired
    balance.save()
}

export function handleBurn(event: Mint): void {
    const balance = getInitBalance(event.params._to.toHexString())
    balance.coreBalance = balance.coreBalance.minus(event.params._amount)
    //we dont update other balances because matching DelegateVotesChanged will be fired
    balance.save()
}

export function handleVotesDelegated(event: DelegateVotesChanged): void {
    const delegate = getInitBalance(event.params.delegate.toHexString())
    const delegator = getInitBalance(event.params.delegator.toHexString())
    const isDelegating = event.params.newBalance.gt(event.params.previousBalance)
    if(isDelegating)
        delegate.delegator = delegate.id !== delegator.id ? delegator.id : null
    
    delegator.activeVotes = event.params.newBalance
    delegator.totalVotes = delegator.activeVotes.plus(delegator.blockchainsBalance)
    
    delegator.save()
    //we dont change delegate balances here because another event will be fired if delegate was its own delegator
    delegate.save()
    

}

function getInitBalance(id: string): GoodBalance {
  let balance = GoodBalance.load(id)
  if (balance == null) {
    balance = new GoodBalance(id)
    balance.activeVotes = BigInt.zero()
    balance.coreBalance = BigInt.zero()
    balance.blockchainsBalance = BigInt.zero()
    balance.totalVotes = BigInt.zero()
  }

  return balance
}