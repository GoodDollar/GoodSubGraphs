import { BigInt, log, BigDecimal, Address } from '@graphprotocol/graph-ts'
import { GoodDollar } from '../generated/GoodReserveCDai/GoodDollar'
import { GoodMarketMaker, BalancesUpdated } from '../generated/GoodMarketMaker/GoodMarketMaker'
import { UBIMinted } from '../generated/GoodReserveCDai/GoodReserveCDai'
import { UBIMinted as UBIMintedV2, GoodReserveCDaiV2 } from '../generated/GoodReserveCDaiV2/GoodReserveCDaiV2'

import { cToken } from '../generated/GoodMarketMaker/cToken'
import { DAIStakeWithdraw, DAIStaked } from '../generated/SimpleDAIStaking/SimpleDAIStaking'
import { Staked, StakeWithdraw, SimpleStaking } from '../generated/SimpleStakingAaveUSDC/SimpleStaking'

import { ReserveHistory, Supporter, ContractStakeHistory, StakeHistory, StakeStatistic } from '../generated/schema'

let e18 = BigInt.fromString('1000000000000000000')
let e8 = BigInt.fromString('100000000')

// export function handleTransfer(event: Transfer): void {
//   log.debug('handleTransfer got', [])


// }
export function handleUBIMinted(event: UBIMinted): void {
  // log.info('handleUBIMinted got timestamp',[])
  _updateReserveHistory(event.block.timestamp, event.block.number,Address.fromString("0xedbe438cd865992fdb72dd252e6055a71b02be72"), event.params.interestReceived, event.params.gdExpansionMinted, event.params.gdInterestMinted)
}

export function handleUBIMintedV2(event: UBIMintedV2): void {
  // log.info('handleUBIMinted got timestamp',[])
  const marketMaker = GoodReserveCDaiV2.bind(event.address).getMarketMaker();
  _updateReserveHistory(event.block.timestamp, event.block.number,marketMaker, event.params.interestReceived, event.params.gdExpansionMinted, event.params.gdInterestMinted)
}

export function handleTokenSale(event: BalancesUpdated): void {
  // log.info('handleTokenSale got timestamp', [])
  _updateReserveHistory(event.block.timestamp, event.block.number,event.address)
}

export function handleTokenSaleV2(event: BalancesUpdated): void {
  // log.info('handleTokenSale got timestamp', [])
  _updateReserveHistory(event.block.timestamp, event.block.number,event.address)
}

//collects price + reserve data
//each ReserveHistory record holds the last update for that day
function _updateReserveHistory(blockTimestamp: BigInt, blockNumber: BigInt,marketMaker: Address, interestReceived: BigInt | null = null, gdExpansionMinted: BigInt | null = null, gdInterestMinted: BigInt | null = null): void {
  let reserveToken = Address.fromString('0x5d3a536e4d6dbd6114cc1ead35777bab948e3643') //cdai mainnet
  let tokenContract = GoodDollar.bind(Address.fromString('0x67c5870b4a41d4ebef24d2456547a03f1f3e094b')) //g$ mainnet
  let reserveContract = GoodMarketMaker.bind(marketMaker)
  let curPrice = reserveContract.currentPrice(reserveToken)
  let cdaiContract = cToken.bind(reserveToken)

  let dayTimestamp = blockTimestamp.minus(blockTimestamp.mod(BigInt.fromI32(60 * 60 * 24)))
  log.debug('_updateReserveHistory got timestamp {}', [blockTimestamp.toString()])


  let reserveHistory = ReserveHistory.load(dayTimestamp.toString())
  let dayId = reserveHistory ? reserveHistory.id : ''

  log.debug('handleTokenSale event - token price at block {}: {}. dayRecord {}. dayTimestamp {}.', [
    blockNumber.toString(),
    curPrice.toString(),
    dayId,
    dayTimestamp.toString(),
  ])

  if (reserveHistory === null) {
    reserveHistory = new ReserveHistory(dayTimestamp.toString())
    reserveHistory.ubiMintedFromExpansion = BigDecimal.zero()
    reserveHistory.ubiMintedFromInterest = BigDecimal.zero()
    reserveHistory.interestReceivedCDAI = BigDecimal.zero()
    reserveHistory.interestReceivedDAI = BigDecimal.zero()
  }

  reserveHistory.totalSupply = tokenContract.totalSupply()
  reserveHistory.blockTimestamp = blockTimestamp
  reserveHistory.block = blockNumber

  let reserveTokenData = reserveContract.reserveTokens(reserveToken)

  let priceDAIWei = cdaiContract
    .exchangeRateStored()
    .times(curPrice)
    .div(e18) //return price in dai wei

  if(gdExpansionMinted && gdInterestMinted && interestReceived) {
    reserveHistory.ubiMintedFromExpansion = reserveHistory.ubiMintedFromExpansion.plus(gdExpansionMinted.toBigDecimal().div(BigInt.fromI32(100).toBigDecimal()))
    reserveHistory.ubiMintedFromInterest = reserveHistory.ubiMintedFromInterest.plus(gdInterestMinted.toBigDecimal().div(BigInt.fromI32(100).toBigDecimal()));
    reserveHistory.interestReceivedCDAI = reserveHistory.interestReceivedCDAI.plus(interestReceived.toBigDecimal().div(e8.toBigDecimal()));
    reserveHistory.interestReceivedDAI = reserveHistory.interestReceivedDAI.plus(cdaiContract
    .exchangeRateStored()
    .times(interestReceived)
    .div(e18).toBigDecimal().div(e18.toBigDecimal()))
  }
  
  log.warning('handleTokenSale price {} {}', [
    priceDAIWei.toString(),
    curPrice.toString(),
  ])

  reserveHistory.marketCap = (reserveHistory.totalSupply as BigInt)
    .times(priceDAIWei)
    .toBigDecimal()
    .div(e18.toBigDecimal()) // return in dai decimals
    .div(BigDecimal.fromString('100')) //return in G$ decimals

  reserveHistory.closePriceCDAI = curPrice.toBigDecimal().div(e8.toBigDecimal()) //in decimals (compound has 8 decimals)
  reserveHistory.closePriceDAI = priceDAIWei.toBigDecimal().div(e18.toBigDecimal()) // in decimals

  // log.warning('handleTokenSale here2 {} {} {}', [
  //   reserveHistory.closePriceCDAI.toString(),
  //   reserveHistory.closePriceDAI.toString(),
  //   reserveHistory.marketCap.toString(),
  // ])

  // keep daily open price, will set only on first update of day
  if (reserveHistory.openPriceDAI === null) {
    reserveHistory.openPriceCDAI = reserveHistory.closePriceCDAI
    reserveHistory.openPriceDAI = reserveHistory.closePriceDAI
  }

  // log.warning('handleTokenSale here3 {}', [reserveTokenData.value0.toString()])

  reserveHistory.reserveRatio = reserveTokenData.value1.toBigDecimal().div(BigDecimal.fromString('1000000'))
  reserveHistory.reserveValueInDAI = reserveTokenData.value0
    .times(cdaiContract.exchangeRateStored())
    .toBigDecimal()
    .div(e18.toBigDecimal()) // results in dai wei
    .div(e18.toBigDecimal()) // results in dai decimals

  reserveHistory.save()

  // log.debug('handleTokenSale done: {} {} {} {} {}', [
  //   reserveHistory.marketCap.toString(),
  //   reserveHistory.closePriceCDAI.toString(),
  //   reserveHistory.closePriceDAI.toString(),
  //   reserveHistory.reserveRatio.toString(),
  //   reserveHistory.reserveValueInDAI.toString(),
  // ])
}

export function handleStake(event: DAIStaked): void {
  let tokenValue = event.params.daiValue.toBigDecimal().div(e18.toBigDecimal())

  _handleStakeOperation(event.block.timestamp,event.address, event.params.staker, tokenValue, tokenValue)  //tokenvalue = usdvalue
}

export function handleStakeWithdraw(event:DAIStakeWithdraw): void {
  let tokenValue = event.params.daiActual.toBigDecimal().div(e18.toBigDecimal()).neg();
  _handleStakeOperation(event.block.timestamp,event.address, event.params.staker,tokenValue,tokenValue ) //tokenvalue = usd value
}

export function handleStakeV2(event: Staked): void {

  const stakingContract = SimpleStaking.bind(event.address)
  
  const divider = BigInt.fromString("10").pow(stakingContract.decimals() as u8).toBigDecimal()
  // if(addr == "0x589ceb6ca1112f7acca19930b47871c5a259b0fc"){
  //   //usdc 6 decimals staking contract
  //   divider = BigDecimal.fromString("1000000")
  // }

  let tokenValue = event.params.value.toBigDecimal().div(divider)

  _handleStakeOperation(event.block.timestamp,event.address, event.params.staker, tokenValue, tokenValue)  //tokenvalue = usdvalue
}

export function handleStakeWithdrawV2(event:StakeWithdraw): void {
  
  const stakingContract = SimpleStaking.bind(event.address)
  const divider = BigInt.fromString("10").pow(stakingContract.decimals() as u8).toBigDecimal()

  let tokenValue = event.params.value.toBigDecimal().div(divider).neg();
  _handleStakeOperation(event.block.timestamp,event.address, event.params.staker,tokenValue,tokenValue ) //tokenvalue = usd value
}

function _handleStakeOperation(blockTimestamp:BigInt,contract:Address, staker:Address, tokenValue: BigDecimal, usdValue: BigDecimal): void {
  let dayTimestamp = blockTimestamp.minus(blockTimestamp.mod(BigInt.fromI32(60 * 60 * 24)))
  log.debug('handleStake got timestamp {} staker: {} value: {}', [blockTimestamp.toString(), staker.toHexString(), tokenValue.toString()])
  //initialize entities
  let contractHistory = ContractStakeHistory.load(contract.toHexString() + '_' + dayTimestamp.toString())
  if(contractHistory == null)
  {
    contractHistory = new ContractStakeHistory(contract.toHexString() + '_' + dayTimestamp.toString())
    contractHistory.totalTokenStaked = BigDecimal.zero()
    contractHistory.totalUSDStaked = BigDecimal.zero()    
    contractHistory.contract = contract.toHexString()
    contractHistory.day = dayTimestamp
  }

  let stakeStats = StakeStatistic.load('global')
  if(stakeStats == null) {
    stakeStats = new StakeStatistic('global')
    stakeStats.totalUSDStaked = BigDecimal.zero()
    stakeStats.totalTokenStaked = BigDecimal.zero()
  }
  stakeStats.totalTokenStaked = stakeStats.totalTokenStaked.plus(tokenValue)
  stakeStats.totalUSDStaked = stakeStats.totalUSDStaked.plus(usdValue)
  stakeStats.save()

  let contractStats = StakeStatistic.load(contract.toHexString())
  if(contractStats == null) {
    contractStats = new StakeStatistic(contract.toHexString())
    contractStats.totalUSDStaked = BigDecimal.zero()
    contractStats.totalTokenStaked = BigDecimal.zero()
  }
  contractStats.totalTokenStaked = contractStats.totalTokenStaked.plus(tokenValue)
  contractStats.totalUSDStaked = contractStats.totalUSDStaked.plus(usdValue)
  contractStats.save()

  let stakingHistory = StakeHistory.load(dayTimestamp.toString())
  if(stakingHistory == null)
  {
    stakingHistory = new StakeHistory(dayTimestamp.toString())
    stakingHistory.totalUSDStaked = BigDecimal.zero()          
  }

  let supporter = Supporter.load(staker.toHexString())
  if(supporter == null)
  {
    supporter = new Supporter(staker.toHexString())
    supporter.totalUSDStaked = BigDecimal.zero()
  }

  //start setting values

  if(stakingHistory.stakingContracts.indexOf(contractHistory.id)<0)
  {
    let c = stakingHistory.stakingContracts
    c.push(contractHistory.id)
    stakingHistory.stakingContracts = c;
  }


  stakingHistory.totalUSDStaked = stakeStats.totalUSDStaked

  contractHistory.totalTokenStaked = contractStats.totalTokenStaked
  contractHistory.totalUSDStaked = contractStats.totalUSDStaked

  let s = contractHistory.supporters
  s.push(supporter.id)
  contractHistory.supporters = s;
  
  let ops = contractHistory.opValues
  ops.push(tokenValue)
  contractHistory.opValues = ops  

  supporter.totalUSDStaked = supporter.totalUSDStaked.plus(usdValue)

  supporter.save()
  stakingHistory.save()
  contractHistory.save()
}