# MSTBL - Million Stable Coin - Keplr Chain Registry Submission

## Overview
This is the chain registry submission for **MSTBL (Million Stable Coin)**, a Cosmos SDK-based blockchain using CosmWasm for smart contract functionality.

## Chain Details
- **Chain ID**: `mstbl-1`
- **Network Type**: Testnet
- **Status**: Live
- **Base Currency**: `stake` (for gas fees)

## Public Endpoints

### RPC (Tendermint)
```
http://34.57.32.80:26657
```

### REST (Cosmos SDK)
```
http://34.57.32.80:1317
```

### gRPC
```
34.57.32.80:9090
```

## Token Information

### Stake Token
- **Symbol**: STAKE
- **Decimals**: 6 (native)
- **Purpose**: Gas fees and validator staking

### MSTBL Token (CW20)
- **Contract Address**: `wasm14hj2tavq8fpesdwxxcu44rty3hh90vhujrvcmstl4zr3txmfvw9s0phg4d`
- **Symbol**: MSTBL
- **Name**: Million Stable Coin
- **Decimals**: 6
- **Total Supply**: 1,100,000 MSTBL (fixed, minting disabled)
- **Type**: CW20 Smart Contract (Cosmos Wasm)

## Technical Stack
- **Cosmos SDK**: v0.45.0
- **Tendermint**: v0.34.0
- **CosmWasm**: v1.0.0 (enabled)
- **Bech32 Prefix**: `wasm`
- **Key Algorithm**: secp256k1

## Gas Settings
- Low: 0.01 ustbl
- Average: 0.025 ustbl
- High: 0.04 ustbl

## Keplr Integration
When connected to MSTBL on Keplr:
1. Users can view their STAKE balance (for gas)
2. Users can view their MSTBL balance
3. Contract queries and contract calls are supported
4. Token symbol and decimals are automatically displayed

## Files Included
- `chain.json` - Full chain configuration for Keplr
- `assetlist.json` - Asset definitions (stake and MSTBL)
- `README.md` - This file

## Security Notes
✅ All files contain only public, immutable blockchain configuration  
✅ No private keys, mnemonics, or wallet secrets included  
✅ No deployment infrastructure credentials included  
✅ Contract address is a public blockchain record  

For security details, see: [KEPLR_REGISTRY_SECURITY_AUDIT.md](../KEPLR_REGISTRY_SECURITY_AUDIT.md)

## How to Use

### Add to Keplr
Users can add this chain to Keplr by:
1. Opening Keplr
2. Clicking the network selector
3. Searching for "MSTBL"
4. Clicking "Add"

The chain information will be pulled from this registry and Keplr will:
- Connect to the RPC endpoint
- Set up the correct bech32 prefix (`wasm`)
- Display STAKE and MSTBL tokens
- Enable contract interactions

### Query Contract
```bash
# Get token info
curl http://34.57.32.80:1317/wasm/contract/wasm14hj2tavq8fpesdwxxcu44rty3hh90vhujrvcmstl4zr3txmfvw9s0phg4d/smart/eyJ0b2tlbl9pbmZvIjp7fX0=

# Get balance
curl http://34.57.32.80:1317/wasm/contract/wasm14hj2tavq8fpesdwxxcu44rty3hh90vhujrvcmstl4zr3txmfvw9s0phg4d/smart/eyJiYWxhbmNlIjp7ImFkZHJlc3MiOiJ3YXNtMW5oNXB5bG1zcWxxZmpxbjRwcjN4NWw3NjVubG5kempoIiwibGVnYWN5Ijp0cnVlfX0=
```

## Support
For issues or questions about this chain registry entry, please contact the MSTBL development team.

---

**Submission Date**: December 4, 2024  
**Registry Version**: 1.0  
**Status**: Ready for Keplr Chain Registry inclusion
