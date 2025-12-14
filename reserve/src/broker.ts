import { BigInt } from "@graphprotocol/graph-ts";
import { Swap as SwapEvent } from "../generated/Broker/Broker";
import { ReservePrice } from "../generated/schema";
import { IBancorExchangeProvider } from "../generated/Broker/IBancorExchangeProvider";
export function handleSwap(event: SwapEvent): void {
  // Calculate day ID (timestamp / 86400 = number of days since epoch)
  const dayId = event.block.timestamp.div(BigInt.fromI32(86400));

  // Create unique ID from tx + log index
  const id = event.transaction.hash
    .toHexString()
    .concat("-")
    .concat(event.logIndex.toString());

  // Create or load ReservePrice entity
  let reservePrice = new ReservePrice(id);

  // Set basic event data
  reservePrice.exchangeId = event.params.exchangeId;
  reservePrice.exchangeProvider = event.params.exchangeProvider;
  reservePrice.tokenIn = event.params.tokenIn;
  reservePrice.tokenOut = event.params.tokenOut;
  reservePrice.amountIn = event.params.amountIn;
  reservePrice.amountOut = event.params.amountOut;
  reservePrice.user = event.params.user;
  reservePrice.timestamp = event.block.timestamp;
  reservePrice.day = dayId;
  reservePrice.blockNumber = event.block.number;
  reservePrice.transactionHash = event.transaction.hash;

  // Call currentPrice on IBancorExchangeProvider
  let exchangeProvider = IBancorExchangeProvider.bind(
    event.params.exchangeProvider
  );
  let priceCall = exchangeProvider.try_currentPrice(event.params.exchangeId);

  if (priceCall.reverted) {
    // If the call reverts, set price to 0
    reservePrice.price = BigInt.fromI32(0);
  } else {
    reservePrice.price = priceCall.value;
  }

  // Save the entity
  reservePrice.save();
}
