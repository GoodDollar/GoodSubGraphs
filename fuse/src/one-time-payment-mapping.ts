import { BigInt, log } from '@graphprotocol/graph-ts'
import { PaymentWithdraw } from '../generated/OneTimePayments/OneTimePayments'

import { WalletStat, TransactionStat } from '../generated/schema'

import { fuse, fuse_mainnet, production, production_mainnet, staging, staging_mainnet, test, develop } from '../scripts/releases'

// Change this according to working environment
let contracts = production

export function handlePaymentWithdraw(event: PaymentWithdraw): void {
  log.info('handlePaymentWithdraw from: {} to: {} paymentId: {} amount: {}', [
    event.params.from.toHexString(),
    event.params.to.toHexString(),
    event.params.paymentId.toHexString(),
    event.params.amount.toString()
  ])

  if (!contracts.includes(event.params.to.toHexString()) && !contracts.includes(event.params.from.toHexString())) {

    let citizenTo = WalletStat.load(event.params.to.toHex())
    if (citizenTo == null) {
      citizenTo = new WalletStat(event.params.to.toHex())
    }

    // citizenTo.inTransactionsCount = citizenTo.inTransactionsCount.plus(BigInt.fromI32(1))
    citizenTo.inTransactionsCountClean = citizenTo.inTransactionsCountClean.plus(BigInt.fromI32(1))
    citizenTo.inTransactionsValueClean = citizenTo.inTransactionsValueClean.plus(event.params.amount)

    // citizenTo.totalTransactionsCount = citizenTo.totalTransactionsCount.plus(BigInt.fromI32(1))
    citizenTo.totalTransactionsCountClean = citizenTo.totalTransactionsCountClean.plus(BigInt.fromI32(1))

    // citizenTo.totalTransactionsValue = citizenTo.totalTransactionsValue.plus(event.params.amount)
    citizenTo.totalTransactionsValueClean = citizenTo.totalTransactionsValueClean.plus(event.params.amount)
    citizenTo.save()

    let citizenFrom = WalletStat.load(event.params.from.toHex())
    if (citizenFrom == null) {
      citizenFrom = new WalletStat(event.params.from.toHex())
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
    let statistics = TransactionStat.load(dayTimestampStr)
    if (statistics == null) {
      statistics = new TransactionStat(dayTimestampStr)
    }

    // log.info('aggregated count:{} countClean:{} value:{} valueClean:{}, totalInCirculation:{}', [statistics.transactionsCount.toString(), statistics.transactionsCountClean.toString(), statistics.transactionsValue.toString(), statistics.transactionsValueClean.toString(), statistics.totalInCirculation.toString()])
    statistics.transactionsCountClean = statistics.transactionsCountClean.plus(BigInt.fromI32(1))
    statistics.transactionsValueClean = statistics.transactionsValueClean.plus(event.params.amount)

    statistics.save()
  }
}
