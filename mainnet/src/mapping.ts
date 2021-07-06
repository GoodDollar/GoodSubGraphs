import { BigInt, ethereum, log, BigDecimal, Address } from '@graphprotocol/graph-ts'
import { GoodDollar, Transfer } from '../generated/GoodDollar/GoodDollar'
import { BalancesUpdated, UBIExpansionMinted, GoodMarketMaker } from '../generated/GoodMarketMaker/GoodMarketMaker'
import { cToken } from '../generated/GoodMarketMaker/cToken'
import { TotalSupplyHistory, GoodDollarToken, ReserveHistory } from '../generated/schema'

let e18 = BigInt.fromString('1000000000000000000')
let e8 = BigInt.fromString('100000000')

export function handleTransfer(event: Transfer): void {
  let tokenContract = GoodDollar.bind(event.address)
  log.debug('got contract', [])
  let token = GoodDollarToken.load('GoodDollar')
  log.debug('got token', [])
  let blockTimestamp = event.block.timestamp
  let dayTimestamp = blockTimestamp.minus(blockTimestamp.mod(BigInt.fromI32(60 * 60 * 24)))
  log.debug('got timestamp {}', [dayTimestamp.toString()])

  if (token == null) {
    log.debug('creating token', [])

    token = new GoodDollarToken('GoodDollar')
  }

  token.totalSupply = tokenContract.totalSupply()
  log.debug('set total supply {}', [token.totalSupply.toString()])
  let dayExists = TotalSupplyHistory.load(dayTimestamp.toString())
  log.debug('got day exists', [])
  let dayId = dayExists ? dayExists.id : ''
  log.debug('event {} - token totalSupply at block {}: {}. dayRecord {}. dayTimestamp {}.', [
    event.transaction.hash.toHex(),
    event.block.number.toString(),
    token.totalSupply.toString(),
    dayId,
    dayTimestamp.toString(),
  ])

  if (dayExists == null) {
    let supplyHistory = new TotalSupplyHistory(dayTimestamp.toString())
    supplyHistory.totalSupply = tokenContract.totalSupply()
    supplyHistory.blockTimestamp = event.block.timestamp
    supplyHistory.goodDollar = token.id
    supplyHistory.block = event.block.number
    supplyHistory.save()
  }
  token.save()
}

export function handleExpansion(event: UBIExpansionMinted): void {
  _updateReserveHistory(event.address, event.block.timestamp, event.block.number)
}

export function handleTokenSale(event: BalancesUpdated): void {
  _updateReserveHistory(event.address, event.block.timestamp, event.block.number)
}

//collects price + reserve data
//each ReserveHistory record holds the last update for that day
function _updateReserveHistory(marketMaker: Address, blockTimestamp: BigInt, blockNumber: BigInt): void {
  let reserveToken = Address.fromString('0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643') //cdai mainnet
  let reserveContract = GoodMarketMaker.bind(marketMaker)
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

  reserveHistory.blockTimestamp = blockTimestamp
  reserveHistory.block = blockNumber

  let reserveTokenData = reserveContract.reserveTokens(reserveToken)

  let priceDAIWei = cdaiContract
    .exchangeRateStored()
    .times(curPrice)
    .div(e18) //return price in dai wei

  log.warning('handleTokenSale price {} {} {}', [
    priceDAIWei.toString(),
    token.totalSupply.toString(),
    curPrice.toString(),
  ])

  reserveHistory.marketCap = token.totalSupply
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

  token.latestReserveData = reserveHistory.id
  token.save()

  // log.debug('handleTokenSale done: {} {} {} {} {}', [
  //   reserveHistory.marketCap.toString(),
  //   reserveHistory.closePriceCDAI.toString(),
  //   reserveHistory.closePriceDAI.toString(),
  //   reserveHistory.reserveRatio.toString(),
  //   reserveHistory.reserveValueInDAI.toString(),
  // ])
}
