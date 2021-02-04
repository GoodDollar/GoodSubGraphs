import { BigInt, log } from '@graphprotocol/graph-ts'
import { PaymentWithdraw } from '../generated/OneTimePayments/OneTimePayments'

import { WalletStatistics, TransactionStatistics } from '../generated/schema'

let contracts: Array<string> = ['0x495d133B938596C9984d462F007B676bDc57eCEC', '0x0be7C592374EE0bD0CcBFC76Be758a138BcaEc6E', '0xFa8d865A962ca8456dF331D78806152d3aC5B84F', '0xf96dADc6D71113F6500e97590760C924dA1eF70e', '0xBcE053b99e22158f8B62f4DBFbEdE1f936b2D4e4', '0x795CED99774430DF8902D8699388924a213A5aA6', '0x12F706FaafCBf8093282Dba0c40eD0D4Eb5CAF54', '0x653c67Be5b3739708e84B61641253822405d78D8', '0x9F75dAcB77419b87f568d417eBc84346e134144E', '0x0000000000000000000000000000000000000000', '0x0000000000000000000000000000000000000000', '0xd9Aa86e0Ddb932bD78ab8c71C1B98F83cF610Bd4']

export function handlePaymentWithdraw(event: PaymentWithdraw): void {
  log.info('handlePaymentWithdraw from: {} to: {} paymentId: {} amount: {}', [
    event.params.from.toHexString(),
    event.params.to.toHexString(),
    event.params.paymentId.toHexString(),
    event.params.amount.toString()
  ])

  if (!contracts.includes(event.params.to.toHexString()) && !contracts.includes(event.params.from.toHexString())) {

    let citizenTo = WalletStatistics.load(event.params.to.toHex())
    if (citizenTo == null) {
      citizenTo = new WalletStatistics(event.params.to.toHex())
    }

    // citizenTo.inTransactionsCount = citizenTo.inTransactionsCount.plus(BigInt.fromI32(1))
    citizenTo.inTransactionsCountClean = citizenTo.inTransactionsCountClean.plus(BigInt.fromI32(1))
    citizenTo.inTransactionsValueClean = citizenTo.inTransactionsValueClean.plus(event.params.amount)

    // citizenTo.totalTransactionsCount = citizenTo.totalTransactionsCount.plus(BigInt.fromI32(1))
    citizenTo.totalTransactionsCountClean = citizenTo.totalTransactionsCountClean.plus(BigInt.fromI32(1))

    // citizenTo.totalTransactionsValue = citizenTo.totalTransactionsValue.plus(event.params.amount)
    citizenTo.totalTransactionsValueClean = citizenTo.totalTransactionsValueClean.plus(event.params.amount)
    citizenTo.save()

    let citizenFrom = WalletStatistics.load(event.params.from.toHex())
    if (citizenFrom == null) {
      citizenFrom = new WalletStatistics(event.params.from.toHex())
    }

    // citizenFrom.outTransactionsCount = citizenFrom.outTransactionsCount.plus(BigInt.fromI32(1))
    citizenFrom.outTransactionsCountClean = citizenFrom.outTransactionsCountClean.plus(BigInt.fromI32(1))

    // citizenFrom.outTransactionsValue = citizenFrom.outTransactionsValue.plus(event.params.amount)
    citizenFrom.outTransactionsValueClean = citizenFrom.outTransactionsValueClean.plus(event.params.amount)

    // citizenFrom.totalTransactionsCount = citizenFrom.totalTransactionsCount.plus(BigInt.fromI32(1))
    citizenFrom.totalTransactionsCountClean = citizenFrom.totalTransactionsCountClean.plus(BigInt.fromI32(1))

    // citizenFrom.totalTransactionsValue = citizenFrom.totalTransactionsValue.plus(event.params.amount)
    citizenFrom.totalTransactionsValueClean = citizenFrom.totalTransactionsValueClean.plus(event.params.amount)
    citizenFrom.save()

    let blockTimestamp = parseInt(event.block.timestamp.toString())
    let dayTimestamp = blockTimestamp - (blockTimestamp % (60 * 60 * 24))
    // remove .0 from string
    let dayTimestampStr = dayTimestamp.toString().split('.')[0]
    log.info('got timestamp {}', [dayTimestampStr])
    let statistics = TransactionStatistics.load(dayTimestampStr)
    if (statistics == null) {
      statistics = new TransactionStatistics(dayTimestampStr)
    }

    // log.info('aggregated count:{} countClean:{} value:{} valueClean:{}, totalInCirculation:{}', [statistics.transactionsCount.toString(), statistics.transactionsCountClean.toString(), statistics.transactionsValue.toString(), statistics.transactionsValueClean.toString(), statistics.totalInCirculation.toString()])
    statistics.transactionsCountClean = statistics.transactionsCountClean.plus(BigInt.fromI32(1))
    statistics.transactionsValueClean = statistics.transactionsValueClean.plus(event.params.amount)

    statistics.save()
  }
}
