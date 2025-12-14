# Celo Reserve Subgraph Setup

This subgraph tracks the Broker contract's Swap events on the Celo blockchain and records reserve prices by making eth_calls to the IBancorExchangeProvider contract using **declared eth_calls** for optimized parallel execution.

## Files Created

### 1. `schema.graphql`
Defines the GraphQL schema with a single entity:
- **ReservePrice**: Stores swap events with the current price from IBancorExchangeProvider
  - `id`: Unique identifier (exchangeId-timestamp)
  - `exchangeId`: The pool/exchange identifier
  - `exchangeProvider`: The exchange provider address
  - `price`: The current price from `IBancorExchangeProvider.currentPrice()`
  - `timestamp`: Block timestamp
  - `day`: Day ID for aggregation (timestamp / 86400)
  - `tokenIn`, `tokenOut`: Assets in the swap
  - `amountIn`, `amountOut`: Swap amounts
  - `user`: Address initiating the swap
  - `blockNumber`, `transactionHash`: Transaction details

### 2. `subgraph.yaml`
The subgraph manifest that configures:
- **Blockchain**: Celo network
- **Contract**: Broker at `0x88de45906D4F5a57315c133620cfa484cB297541`
- **Feature**: `declaredEthCalls` - enables declared eth_calls for parallel execution
- **Event**: Swap(indexed address,indexed bytes32,indexed address,address,address,uint256,uint256)
- **Handler**: `handleSwap` function in `src/broker.ts`
- **Declared eth_call**: 
  ```yaml
  calls:
    currentPrice: IBancorExchangeProvider[event.params.exchangeProvider].currentPrice(event.params.exchangeId)
  ```
  This call is executed in parallel before the handler runs, improving performance.
- **ABIs**: Broker.json and IBancorExchangeProvider.json

### 3. `src/broker.ts`
The event handler that:
- Listens to Swap events from the Broker contract
- Receives the price from the declared eth_call in `event.calls`
- Handles call failures gracefully (sets price to 0 if reverted)
- Calculates the day ID from timestamp
- Creates a unique ReservePrice entity with all swap and price data

The declared eth_call approach eliminates the need for manual contract binding and sequential call execution, allowing Graph Node to parallelize the call with other operations.

### 4. `abis/Broker.json`
Contains the Swap event ABI definition for the Broker contract

### 5. `abis/IBancorExchangeProvider.json`
Contains the currentPrice function ABI for declared eth_calls

### 6. `tsconfig.json`
TypeScript configuration for compiling AssemblyScript handlers

## How It Works

1. When a Swap event is emitted from the Broker contract:
   ```
   Swap(exchangeProvider, exchangeId, user, tokenIn, tokenOut, amountIn, amountOut)
   ```

2. **Before the handler executes**, the declared eth_call is executed in parallel:
   - Calls: `IBancorExchangeProvider[exchangeProvider].currentPrice(exchangeId)`
   - Results are passed to the handler via `event.calls`

3. The `handleSwap` function:
   - Extracts the price from `event.calls[0].outputValues[0]`
   - Records the price, timestamp, and derived day ID
   - Creates a ReservePrice entity that persists the data

4. The ReservePrice entity is queryable by:
   - Day (for daily aggregations)
   - ExchangeProvider (for provider-specific analysis)
   - ExchangeId (for pool-specific tracking)
   - Timestamp (for temporal queries)

## Benefits of Declared eth_calls

- **Performance**: Multiple calls are executed in parallel instead of sequentially
- **Simplicity**: No need for manual contract binding and error handling
- **Efficiency**: Graph Node optimizes the execution automatically
- **Reliability**: Reverted calls are handled and passed to the handler for processing

## Running the Subgraph

```bash
cd celo-reserve

# Generate types from ABIs and schema
npm run codegen

# Build the subgraph
npm run build

# Deploy locally (if running a local Graph node)
npm run deploy-local

# Deploy to The Graph (production)
npm run deploy
```

## Notes

- The startBlock is set to 20000000 - adjust based on when the Broker contract was deployed on Celo
- The price is stored as a BigInt, matching the uint256 return type from currentPrice()
- Failed eth_calls are handled gracefully - reverted calls set the price to 0
- Each ReservePrice entry is unique per exchangeId-timestamp combination
- The `declaredEthCalls` feature must be declared in the manifest for this functionality to work
