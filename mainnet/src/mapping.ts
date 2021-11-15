import { BigInt, log, BigDecimal, Address } from '@graphprotocol/graph-ts'
import { GoodDollar } from '../generated/GoodReserveCDai/GoodDollar'
import { GoodMarketMaker, BalancesUpdated } from '../generated/GoodMarketMaker/GoodMarketMaker'
import { UBIMinted } from '../generated/GoodReserveCDai/GoodReserveCDai'
import { cToken } from '../generated/GoodMarketMaker/cToken'
import { DAIStakeWithdraw, DAIStaked } from '../generated/SimpleDAIStaking/SimpleDAIStaking'
import { ReserveHistory, Supporter, ContractStakeHistory, StakeHistory } from '../generated/schema'

let e18 = BigInt.fromString('1000000000000000000')
let e8 = BigInt.fromString('100000000')

// export function handleTransfer(event: Transfer): void {
//   log.debug('handleTransfer got', [])


// }

export function handleUBIMinted(event: UBIMinted): void {
  // log.info('handleUBIMinted got timestamp',[])
  _updateReserveHistory(event.block.timestamp, event.block.number, event)
}

export function handleTokenSale(event: BalancesUpdated): void {
  // log.info('handleTokenSale got timestamp', [])
  _updateReserveHistory(event.block.timestamp, event.block.number)

}

//collects price + reserve data
//each ReserveHistory record holds the last update for that day
function _updateReserveHistory(blockTimestamp: BigInt, blockNumber: BigInt, ubimintedEvent: UBIMinted | null = null): void {
  let reserveToken = Address.fromString('0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643') //cdai mainnet
  let tokenContract = GoodDollar.bind(Address.fromString('0x67C5870b4A41D4Ebef24d2456547A03F1f3e094B')) //g$ mainnet
  let reserveContract = GoodMarketMaker.bind(Address.fromString("0xEDbE438Cd865992fDB72dd252E6055A71b02BE72"))
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

  if(ubimintedEvent != null) {
    reserveHistory.ubiMintedFromExpansion = reserveHistory.ubiMintedFromExpansion.plus(ubimintedEvent.params.gdExpansionMinted.toBigDecimal().div(BigInt.fromI32(100).toBigDecimal()))
    reserveHistory.ubiMintedFromInterest = reserveHistory.ubiMintedFromInterest.plus(ubimintedEvent.params.gdInterestMinted.toBigDecimal().div(BigInt.fromI32(100).toBigDecimal()));
    reserveHistory.interestReceivedCDAI = reserveHistory.interestReceivedCDAI.plus(ubimintedEvent.params.interestReceived.toBigDecimal().div(e8.toBigDecimal()));
    reserveHistory.interestReceivedDAI = reserveHistory.interestReceivedDAI.plus(cdaiContract
    .exchangeRateStored()
    .times(ubimintedEvent.params.interestReceived)
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
  _handleStakeOperation(event.block.timestamp, event.params.staker, event.params.daiValue.toBigDecimal()) 
}

export function handleStakeWithdraw(event:DAIStakeWithdraw): void {
  _handleStakeOperation(event.block.timestamp, event.params.staker, event.params.daiActual.toBigDecimal().neg())
}

function _handleStakeOperation(blockTimestamp:BigInt, staker:Address, value: BigDecimal): void {
  let dayTimestamp = blockTimestamp.minus(blockTimestamp.mod(BigInt.fromI32(60 * 60 * 24)))
  log.debug('handleStake got timestamp {} staker: {} value: {}', [blockTimestamp.toString(), staker.toHexString(), value.toString()])
  //initialize entities
  let contractHistory = ContractStakeHistory.load(dayTimestamp.toString())
  if(contractHistory == null)
  {
    contractHistory = new ContractStakeHistory(dayTimestamp.toString())
    contractHistory.totalTokenStaked = BigDecimal.zero()
    contractHistory.totalUSDStaked = BigDecimal.zero()    

  }
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

  const tokenStaked = value.div(e18.toBigDecimal());

  stakingHistory.totalUSDStaked = stakingHistory.totalUSDStaked.plus(tokenStaked)

  contractHistory.totalTokenStaked = contractHistory.totalTokenStaked.plus(tokenStaked)
  contractHistory.totalUSDStaked = contractHistory.totalUSDStaked.plus(tokenStaked)  

  let s = contractHistory.supporters
  s.push(supporter.id)
  contractHistory.supporters = s;
  
  let ops = contractHistory.opValue
  ops.push(tokenStaked)
  contractHistory.opValue = ops
  
  supporter.totalUSDStaked = supporter.totalUSDStaked.plus(tokenStaked)

  supporter.save()
  stakingHistory.save()
  contractHistory.save()
}