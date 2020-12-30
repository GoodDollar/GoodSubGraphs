import { BigInt, log, Address } from '@graphprotocol/graph-ts'
import {
  // Contract,
  Approval,
  MinterAdded,
  MinterRemoved,
  OwnershipTransferred,
  Paused,
  PauserAdded,
  PauserRemoved,
  Transfer,
  Transfer1,
  Unpaused,
} from '../generated/GoodDollar/GoodDollar'
import { Statistics, TransactionStatistics, Citizen } from '../generated/schema'

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
let ZERO = BigInt.fromI32(0)
// let contracts: Array<string> = ['0xeE724540706296ebad65aeA2515Efe0949F97Ae6', '0x1cb566802E61E7f661183F5d9A14645d7620CC8d', '0x30e1403C075dB97fD9FE02b114cEbea5acce38b7', '0x07B41192DD74172576a443C7B28DDC3dC2CE3074', '0x903a6Ba8b5A43FBd34a511fB5Cf193CE8dc8907B', '0x2170E9A5b72f143cdf9C2fc93fa9d6A9b67CD632', '0x7edb872c75e86fE53F828D65ad75B0B5862A0c2b', '0xD142A79BAB57fed1FEed4734dFe33473d707EeCF', '0xf61e08a98B446856eE3fbD6597D3698a1a138565', '0xCC9B1382b0Ae9D80E81eCB1863DcE8685a044603', '0xcdC704D3dEA0FcFD1Cae95dfdCB7883632E171b2', '0x94079dF920115c5296Cc06AE6D8F29E077906246']

let contracts: Array<string> = ['0x495d133B938596C9984d462F007B676bDc57eCEC', '0x0be7C592374EE0bD0CcBFC76Be758a138BcaEc6E', '0xFa8d865A962ca8456dF331D78806152d3aC5B84F', '0xf96dADc6D71113F6500e97590760C924dA1eF70e', '0xBcE053b99e22158f8B62f4DBFbEdE1f936b2D4e4', '0x795CED99774430DF8902D8699388924a213A5aA6', '0x12F706FaafCBf8093282Dba0c40eD0D4Eb5CAF54', '0x653c67Be5b3739708e84B61641253822405d78D8', '0x9F75dAcB77419b87f568d417eBc84346e134144E', '0x0000000000000000000000000000000000000000', '0x0000000000000000000000000000000000000000', '0xd9Aa86e0Ddb932bD78ab8c71C1B98F83cF610Bd4']

export function handleApproval(event: Approval): void { }

export function handleMinterAdded(event: MinterAdded): void { }

export function handleMinterRemoved(event: MinterRemoved): void { }

export function handleOwnershipTransferred(event: OwnershipTransferred): void { }

export function handlePaused(event: Paused): void { }

export function handlePauserAdded(event: PauserAdded): void { }

export function handlePauserRemoved(event: PauserRemoved): void { }

export function handleTransfer(event: Transfer): void {

  let txStatistics = TransactionStatistics.load('txStatistics')

  if (txStatistics == null) {
    txStatistics = new TransactionStatistics('txStatistics')
  }

  aggregateTransactionStatisticsFromTransfer(event, txStatistics)

  let statistics = Statistics.load('statistics')
  if (statistics == null) {
    statistics = new Statistics('statistics')
  }

  statistics.transactionStatistics = txStatistics.id
  statistics.save()

  let blockTimestamp = parseInt(event.block.timestamp.toString())
  let dayTimestamp = blockTimestamp - (blockTimestamp % (60 * 60 * 24))
  // remove .0 from string
  let dayTimestampStr = dayTimestamp.toString().split('.')[0]
  log.info('got timestamp {}', [dayTimestampStr])
  let dailyStatistics = TransactionStatistics.load(dayTimestampStr)
  if (dailyStatistics == null) {
    dailyStatistics = new TransactionStatistics(dayTimestampStr)
  }
  aggregateTransactionStatisticsFromTransfer(event, dailyStatistics)
  aggregateCitizenFromTransfer(event)

}

export function handleTransfer1(event: Transfer1): void { }

export function handleUnpaused(event: Unpaused): void { }

function aggregateTransactionStatisticsFromTransfer(event: Transfer, statistics: TransactionStatistics | null): void {


  statistics.transactionsCount = statistics.transactionsCount.plus(BigInt.fromI32(1))
  statistics.transactionsValue = event.params.value.plus(statistics.transactionsValue as BigInt)

  if (!contracts.includes(event.params.to.toHexString()) && !contracts.includes(event.params.from.toHexString())) {
    statistics.transactionsCountClean = statistics.transactionsCountClean.plus(BigInt.fromI32(1))
    statistics.transactionsValueClean = event.params.value.plus(statistics.transactionsValueClean as BigInt)
  }

  if (!statistics.totalInCirculation) {
    statistics.totalInCirculation = ZERO
  }

  if (event.params.to.toHexString() == ZERO_ADDRESS) {
    statistics.totalInCirculation = statistics.totalInCirculation.minus(event.params.value)
  }
  if (event.params.from.toHexString() == ZERO_ADDRESS) {
    statistics.totalInCirculation = statistics.totalInCirculation.plus(event.params.value)
  }

  log.info('txStatistics count:{} countClean:{} value:{} valueClean:{}, totalInCirculation:{}', [statistics.transactionsCount.toString(), statistics.transactionsCountClean.toString(), statistics.transactionsValue.toString(), statistics.transactionsValueClean.toString(), statistics.totalInCirculation.toString()])

  statistics.save()

}

function aggregateCitizenFromTransfer(event: Transfer): void {

  log.info('event.params.from {}, event.params.to {}, event.params.value {}', [event.params.from.toHex(), event.params.to.toHex(), event.params.value.toString()])

  if (event.params.from.toHexString() != ZERO_ADDRESS) {
    let citizenFrom = Citizen.load(event.params.from.toHex())
    if (citizenFrom == null) {
      citizenFrom = new Citizen(event.params.from.toHexString())
      citizenFrom.outTransactions = ZERO
      citizenFrom.outTransactionsClean = ZERO
      citizenFrom.outTransactionsValue = ZERO
      citizenFrom.outTransactionsValueClean = ZERO
      citizenFrom.inTransactions = ZERO
      citizenFrom.inTransactionsClean = ZERO
      citizenFrom.inTransactionsValue = ZERO
      citizenFrom.inTransactionsValueClean = ZERO
      citizenFrom.balance = ZERO
      citizenFrom.totalTransactionsValueClean = ZERO
      citizenFrom.totalTransactions = ZERO
      citizenFrom.totalTransactionsValue = ZERO
      citizenFrom.totalTransactionsValueClean = ZERO
    }
    citizenFrom.outTransactions = citizenFrom.outTransactions.plus(BigInt.fromI32(1))
    citizenFrom.outTransactionsValue = citizenFrom.outTransactionsValue.plus(event.params.value)
    citizenFrom.balance = citizenFrom.balance.minus(event.params.value)
    citizenFrom.totalTransactions = citizenFrom.totalTransactions.plus(BigInt.fromI32(1))
    citizenFrom.totalTransactionsValue = citizenFrom.totalTransactionsValue.plus(event.params.value)

    if (!contracts.includes(event.params.to.toHexString()) && !contracts.includes(event.params.from.toHexString())) {
      citizenFrom.outTransactionsClean = citizenFrom.outTransactionsClean.plus(BigInt.fromI32(1))
      citizenFrom.outTransactionsValueClean = citizenFrom.outTransactionsValueClean.plus(event.params.value)
      citizenFrom.totalTransactionsClean = citizenFrom.totalTransactionsClean.plus(BigInt.fromI32(1))
      citizenFrom.totalTransactionsValueClean = citizenFrom.totalTransactionsValueClean.plus(event.params.value)
    }


    citizenFrom.save()

    // TODO: this log msg is causing a major error, fix it
    // log.info('aggregateCitizenFromTransfer id {}, inTransactions {}, outTransactions {}, inTransactionsValue{}, outTransactionValue {}, balance {}',
    //   [
    //     citizenFrom.inTransactions.toString(),
    //     citizenFrom.outTransactions.toString(),
    //     citizenFrom.inTransactionsValue.toString(),
    //     citizenFrom.outTransactionsValue.toString(),
    //     citizenFrom.balance.toString()
    //   ])
  }

  if (event.params.to.toHexString() != ZERO_ADDRESS) {
    let citizenTo = Citizen.load(event.params.to.toHexString())
    if (citizenTo == null) {
      citizenTo = new Citizen(event.params.to.toHexString())
      citizenTo.outTransactions = ZERO
      citizenTo.outTransactionsClean = ZERO
      citizenTo.outTransactionsValue = ZERO
      citizenTo.outTransactionsValueClean = ZERO
      citizenTo.inTransactions = ZERO
      citizenTo.inTransactionsClean = ZERO
      citizenTo.inTransactionsValue = ZERO
      citizenTo.inTransactionsValueClean = ZERO
      citizenTo.balance = ZERO
      citizenTo.totalTransactionsValueClean = ZERO
      citizenTo.totalTransactions = ZERO
      citizenTo.totalTransactionsValue = ZERO
      citizenTo.totalTransactionsValueClean = ZERO
    }

    citizenTo.inTransactions = citizenTo.inTransactions.plus(BigInt.fromI32(1))
    citizenTo.inTransactionsValue = citizenTo.inTransactionsValue.plus(event.params.value)
    citizenTo.balance = citizenTo.balance.plus(event.params.value)
    citizenTo.totalTransactions = citizenTo.totalTransactions.plus(BigInt.fromI32(1))
    citizenTo.totalTransactionsValue = citizenTo.totalTransactionsValue.plus(event.params.value)

    if (!contracts.includes(event.params.to.toHexString()) && !contracts.includes(event.params.from.toHexString())) {
      citizenTo.inTransactionsClean = citizenTo.inTransactionsClean.plus(BigInt.fromI32(1))
      citizenTo.inTransactionsValueClean = citizenTo.inTransactionsValueClean.plus(event.params.value)
      citizenTo.totalTransactionsClean = citizenTo.totalTransactionsClean.plus(BigInt.fromI32(1))
      citizenTo.totalTransactionsValueClean = citizenTo.totalTransactionsValueClean.plus(event.params.value)
    }

    citizenTo.save()

    // TODO: this log msg is causing a major error, fix it
    // log.info('aggregateCitizenFromTransfer id {}, inTransactions {}, outTransactions {}, inTransactionsValue{}, outTransactionValue {}, balance {}',
    //   [
    //     citizenTo.inTransactions.toString(),
    //     citizenTo.outTransactions.toString(),
    //     citizenTo.inTransactionsValue.toString(),
    //     citizenTo.outTransactionsValue.toString(),
    //     citizenTo.balance.toString()
    //   ])
  }
}
