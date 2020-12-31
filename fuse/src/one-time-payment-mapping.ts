import { BigInt, log } from '@graphprotocol/graph-ts'
import { PaymentWithdraw } from '../generated/OneTimePayments/OneTimePayments'

import { Citizen } from '../generated/schema'

export function handlePaymentWithdraw(event: PaymentWithdraw): void {
    log.info('handlePaymentWithdraw from: {} to: {} paymentId: {} amount: {}', [
        event.params.from.toHexString(),
        event.params.to.toHexString(),
        event.params.paymentId.toHexString(),
        event.params.amount.toString()
    ])

    let citizenTo = Citizen.load(event.params.to.toHex())
    if (citizenTo == null) {
        citizenTo = new Citizen(event.params.to.toHex())
    }

    citizenTo.inTransactions = citizenTo.inTransactions.plus(BigInt.fromI32(1))
    citizenTo.inTransactionsClean = citizenTo.inTransactionsClean.plus(BigInt.fromI32(1))

    citizenTo.inTransactionsValue = citizenTo.inTransactionsValue.plus(event.params.amount)
    citizenTo.inTransactionsValueClean = citizenTo.inTransactionsValueClean.plus(event.params.amount)

    citizenTo.totalTransactions = citizenTo.totalTransactions.plus(BigInt.fromI32(1))
    citizenTo.totalTransactionsClean = citizenTo.totalTransactionsClean.plus(BigInt.fromI32(1))

    citizenTo.totalTransactionsValue = citizenTo.totalTransactionsValue.plus(event.params.amount)
    citizenTo.totalTransactionsValueClean = citizenTo.totalTransactionsValueClean.plus(event.params.amount)

    citizenTo.save()

    let citizenFrom = Citizen.load(event.params.from.toHex())
    if (citizenFrom == null) {
        citizenFrom = new Citizen(event.params.from.toHex())
    }

    citizenFrom.outTransactions = citizenFrom.outTransactions.plus(BigInt.fromI32(1))
    citizenFrom.outTransactionsClean = citizenFrom.outTransactionsClean.plus(BigInt.fromI32(1))

    citizenFrom.outTransactionsValue = citizenFrom.outTransactionsValue.plus(event.params.amount)
    citizenFrom.outTransactionsValueClean = citizenFrom.outTransactionsValueClean.plus(event.params.amount)

    citizenFrom.totalTransactions = citizenFrom.totalTransactions.plus(BigInt.fromI32(1))
    citizenFrom.totalTransactionsClean = citizenFrom.totalTransactionsClean.plus(BigInt.fromI32(1))

    citizenFrom.totalTransactionsValue = citizenFrom.totalTransactionsValue.plus(event.params.amount)
    citizenFrom.totalTransactionsValueClean = citizenFrom.totalTransactionsValueClean.plus(event.params.amount)

    citizenFrom.save()
}
