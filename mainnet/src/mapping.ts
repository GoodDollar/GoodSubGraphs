import { BigInt, ethereum, log, BigDecimal, Address } from '@graphprotocol/graph-ts'
import { GoodDollar, Transfer } from '../generated/GoodDollar/GoodDollar'
import { BalancesUpdated, UBIExpansionMinted, GoodMarketMaker } from '../generated/GoodMarketMaker/GoodMarketMaker'
import { UBIMinted } from '../generated/GoodReserveCDai/GoodReserveCDai'
import { cToken } from '../generated/GoodMarketMaker/cToken'
import { TotalSupplyHistory, GoodDollarToken, ReserveHistory } from '../generated/schema'

let e18 = BigInt.fromString('1000000000000000000')
let e8 = BigInt.fromString('100000000')

export function handleUBIMinted(event: UBIMinted): void {
  _updateReserveHistory(event.block.timestamp, event.block.number, event)

}

export function handleTokenSale(event: BalancesUpdated): void {
  _updateReserveHistory(event.block.timestamp, event.block.number)
}

//collects price + reserve data
//each ReserveHistory record holds the last update for that day
function _updateReserveHistory(blockTimestamp: BigInt, blockNumber: BigInt, ubimintedEvent?: UBIMinted): void {
  let reserveToken = Address.fromString('0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643') //cdai mainnet
  let tokenContract = GoodDollar.bind(Address.fromString('0x67C5870b4A41D4Ebef24d2456547A03F1f3e094B')) //g$ mainnet
  let reserveContract = GoodMarketMaker.bind(Address.fromString("0xEDbE438Cd865992fDB72dd252E6055A71b02BE72"))
  let curPrice = reserveContract.currentPrice(reserveToken)
  let cdaiContract = cToken.bind(reserveToken)

  let token = GoodDollarToken.load('GoodDollar')
  let dayTimestamp = blockTimestamp.minus(blockTimestamp.mod(BigInt.fromI32(60 * 60 * 24)))
  // log.debug('handleTokenSale got timestamp {}', [dayTimestamp.toString()])

  if (token == null) {
    log.debug('handleTokenSale no token record yet', [])
    return
  }

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
    reserveHistory.goodDollar = token.id
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
    reserveHistory.ubiMintedFromExpansion = ubimintedEvent.params.gdExpansionMinted
    reserveHistory.ubiMintedFromInterest = ubimintedEvent.params.gdInterestMinted;
    reserveHistory.interestReceived = ubimintedEvent.params.interestReceived;


  }
  log.warning('handleTokenSale price {} {} {}', [
    priceDAIWei.toString(),
    token.totalSupply.toString(),
    curPrice.toString(),
  ])

  reserveHistory.marketCap = reserveHistory.totalSupply
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
