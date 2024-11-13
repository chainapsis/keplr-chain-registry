> **Warning**
>
> PLEASE RUN THE COMMANDS BELOW TO VERIFY CONFIGURATION IN YOUR LOCAL ENVIRONMENT BEFORE SUBMITTING PULL REQUESTS.
>
> ```shell
> # install node modules
> yarn install
>
> # validate your json file (for Cosmos-SDK-based chains or EVM chains)
> yarn validate cosmos/{your file.json}
> yarn validate evm/{your file.json}
> ```
>
> READ THE GUIDELINES BELLOW CAREFULLY, PAYING PARTICULAR ATTENTION TO THE "features" IN THE [[REQUIREMENT DETAILS](https://github.com/chainapsis/keplr-chain-registry#requirement-details)].

# Guidelines for Community-Driven Non-Native Chain Integration

Keplr team has always been at the leading edge of building secure and interoperable wallet infrastructure for the blooming cross-chain networks, placing its core mainly at the Cosmos ecosystem.

To help the builders easily plug into Keplr’s wide userbase and the ever-growing Cosmos ecosystem, Keplr has been offering an option of permissionless integration, the so-called “Suggest Chain (Non-Native Chain) Integration”. The feature has enabled front-ends to request adding new Cosmos-SDK-based blockchains that aren’t natively integrated into the Keplr extension.

Keplr team is now introducing a Community-Driven Integration, which enables our users to easily make a request for adding new chains and updating their information. It's an expanded version of the previous suggest chain integration, providing a public API to our users for creating and updating a set integration standard for each chain.

To make a pull request, please carefully read and follow the guidelines below. Any contribution is more than welcome!

# Requirements and Preparation

This section outlines the basic information that is required for registering a chain to Keplr wallet. Please note that your request does not always guarantee integrations and updates; upon your submission, Keplr team will go through a minimal verification process to see if there is any security issue or any missing information.

Once approved, the Keplr browser extension will show the tag “Community-Driven” on the chain connection page, to let the users be aware that the integration was requested and implemented by the community and the Keplr team has gone through the verification process.

<p align="center">
  <img src="https://i.imgur.com/f9UEOIR.png" alt="Sample Image"/>
</p>

## Cosmos-SDK-based Chain Registration Directory Structure

chainID is consisted of ({identifier}-{version}). **`chain-identifier`** therefore refers to a text identifier of a chain that comes before its version number. For example:

```
  The chain-identifier of `cosmoshub-4` is `cosmoshub`.
  The chain-identifier of `crypto-org-chain-mainnet-1` is `crypto-org-chain-mainnet`.
  The chain-identifier of `evmos_9001-2` is `evmos_9001`.
  The chain-identifier of 'shentu-2.2' is 'shentu-2.2'.
```

Here’s an overview of the structure of the directory. Please provide the information and files complying with the requirements.

```
.
├── cosmos                       # Mainnet
│     ├── cosmoshub.json         # Chains (Each file should be named `{chain-identifier}.json')
│     ├── osmosis.json
│     └── ...
└── images                       # Collection of image assets
      ├── cosmoshub              # Image assets of Comos Hub (Each directory should be named `{chain-identifier}`.)
      │     └── chain.png        # Cosmos Hub Logo(png, 256x256px)
      ├── osmosis                # Image assets of Osmosis
      └── ...
```

### Cosmos-SDK-based Chain Registration Form

```json
{
  "chainId": "osmosis-1",
  "chainName": "Osmosis",
  "chainSymbolImageUrl": "https://raw.githubusercontent.com/chainapsis/keplr-chain-registry/main/images/osmosis/chain.png",
  "rpc": "https://rpc-osmosis.blockapsis.com",
  "rest": "https://lcd-osmosis.blockapsis.com",
  "nodeProvider": {
    "name": "Blockapsis",
    "email": "infra@blockapsis.com",
    "website": "https://blockapsis.com/"
  },
  "bip44": {
    "coinType": 118
  },
  "bech32Config": {
    "bech32PrefixAccAddr": "osmosis",
    "bech32PrefixAccPub": "osmosispub",
    "bech32PrefixValAddr": "osmosisvaloper",
    "bech32PrefixValPub": "osmosisvaloperpub",
    "bech32PrefixConsAddr": "osmosisvalcons",
    "bech32PrefixConsPub": "osmosisvalconspub"
  },
  "currencies": [
    {
      "coinDenom": "OSMO",
      "coinMinimalDenom": "uosmo",
      "coinDecimals": 6,
      "coinGeckoId": "osmosis"
    }
  ],
  "feeCurrencies": [
    {
      "coinDenom": "OSMO",
      "coinMinimalDenom": "uosmo",
      "coinDecimals": 6,
      "coinGeckoId": "osmosis",
      "gasPriceStep": {
        "low": 0.01,
        "average": 0.025,
        "high": 0.03
      }
    }
  ],
  "stakeCurrency": {
    "coinDenom": "OSMO",
    "coinMinimalDenom": "uosmo",
    "coinDecimals": 6,
    "coinGeckoId": "osmosis"
  },
  "features": ["cosmwasm", "osmosis-txfees"]
}
```

### Cosmos-SDK-based Chain Registration Form Requirement Details

- chainId: chainId in a form of {identifier}-{version} (ex. cosmoshub-4)
- chainName: the name of the chain that will be displayed on the wallet
- chainSymbolImageUrl: Image URL of the chain.
  - https://raw.githubusercontent.com/chainapsis/keplr-chain-registry/main/images/{chain-identifier}/{file-name}.png
  - Please modify the chain-identifier and file-name from the link above and upload it.
- rpc: URL of RPC endpoint of the chain
- rest: URL of REST/API endpoint of the chain
- nodeProvider: provide the details of the RPC/REST node providers
  - name: name of the node provider
  - email: email address of the node provider (To help other users reach out when there is an issue with the nodes’ status)
  - website(optional): website address of the node provider
- walletUrlForStaking(optional): the URL where the users are directed when they click on Staking button of the Keplr Wallet
- bip44: BIP-44 coin type (118 highly recommended)
- bech32Config: prefix used at the beginning of the address
- currencies: the list of the supported currencies. If your chain uses replicated security, please place your main native token at the top of the currencies list.
- feeCurrencies: the list of the tokens that are accepted by the validators for fees
- stakeCurrency: the staking token of the chain. Remove this item if your chain does not support native staking (e.g. your chain uses replicated security) or does not have a staking token.
- coinGeckoId(optional): the active API ID for Keplr to get the price from CoinGecko
- features: any other features that are additionally supported by the chain
  - cosmwasm: supports CosmWasm smart contracts
  - secretwasm: supports WASM smart contracts of Secret Network
  - eth-address-gen: supports EVM account generation
  - eth-key-sign: supports EVM signatures
  - axelar-evm-bridge: supports EVM bridge provided by Axelar Network
  - osmosis-txfees: supports paying fees in other currencies on Osmosis

## EVM-based Chain Registration Directory Structure

EVM-based chain identifier is consisted of eip155:{eip155-chain-id} which follows [CAIP-2](https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-2.md)

```
  The chain identifier of `Ethereum` is `eip155:1`.
  The chain identifier of `Optimism` is `eip155:10`.
  The chain identifier of `Polygon` is `eip155:137`.
```

Here’s an overview of the structure of the directory. Please provide the information and files complying with the requirements.

```
.
├── evm
│     ├── eip155:1.json                       # Chains (Each file should be named `{chain-identifier}.json')
│     ├── eip155:10.json
│     └── ...
└── images                                    # Collection of image assets
      ├── eip155:1                            # Image assets of Ethereum (Each directory should be named `{chain-identifier}`.)
      │     ├── erc20
      │     │     └── {contract address}.png  # Ethereum ERC20 token logo(png, 256x256px)
      │     ├── chain.png                     # Ethereum logo(png, 256x256px)
      │     └── ethereum-native.png           # Etherem native token logo(png, 256x256px)
      ├── eip155.10
      └── ...
```

### EVM-based Chain Registration Form

```json
{
  "rpc": "https://evm-1.keplr.app",
  "websocket": "wss://evm-1.keplr.app/websocket",
  "nodeProvider": {
    "name": "Keplr",
    "email": "contact@keplr.app",
    "website": "https://keplr.app"
  },
  "chainId": "eip155:1",
  "chainName": "Ethereum",
  "chainSymbolImageUrl": "https://raw.githubusercontent.com/chainapsis/keplr-chain-registry/main/images/eip155:1/chain.png",
  "bip44": {
    "coinType": 60
  },
  "currencies": [
    {
      "coinDenom": "ETH",
      "coinMinimalDenom": "ethereum-native",
      "coinDecimals": 18,
      "coinGeckoId": "ethereum",
      "coinImageUrl": "https://raw.githubusercontent.com/chainapsis/keplr-chain-registry/main/images/eip155:1/ethereum-native.png"
    },
    {
      "coinDenom": "USDC",
      "coinMinimalDenom": "erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      "coinDecimals": 6,
      "coinGeckoId": "usd-coin",
      "coinImageUrl": "https://raw.githubusercontent.com/chainapsis/keplr-chain-registry/main/images/eip155:1/erc20/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png"
    }
  ],
  "feeCurrencies": [
    {
      "coinDenom": "ETH",
      "coinMinimalDenom": "ethereum-native",
      "coinDecimals": 18,
      "coinGeckoId": "ethereum",
      "coinImageUrl": "https://raw.githubusercontent.com/chainapsis/keplr-chain-registry/main/images/eip155:1/ethereum-native.png"
    }
  ],
  "features": []
}
```

### EVM-based Chain Registration Form Requirement Details

- rpc: URL of RPC endpoint of the chain
- websocket: URL of WebSocket endpoint of the chain
- nodeProvider: provide the details of the RPC/WebSocket node providers
  - name: name of the node provider
  - email: email address of the node provider (To help other users reach out when there is an issue with the nodes’ status)
  - website(optional): website address of the node provider
- chainId: chain identifier in a form of eip155:{evm-chain-id} (ex. eip155:1)
- chainName: the name of the chain that will be displayed on the wallet
- chainSymbolImageUrl: Image URL of the chain.
  - https://raw.githubusercontent.com/chainapsis/keplr-chain-registry/main/images/{chain-identifier}/{file-name}.png
  - Please modify the chain-identifier and file-name from the link above and upload it.
- bip44: BIP-44 coin type (60 highly recommended)
- currencies: the list of the supported currencies. If your chain uses replicated security, please place your main native token at the top of the currencies list.
- feeCurrencies: the list of the tokens that are accepted for fees
- coinGeckoId(optional): the active API ID for Keplr to get the price from CoinGecko
- features: any other features that are additionally supported by the chain
  - op-stack-l1-data-fee: supports paying L1 data fee for OP stack based chain

## NOTE:

- please check if the chain information file is in JSON format.
- Chain logos should be in PNG format in 256x256px resolution. Please also note that the images will be automatically cropped into a circle to be displayed on the wallet (See the sample image above)
- RPC / WebSocket
  - Please check if the RPC node is not currently experiencing any issues/errors.
  - Please double-check if your chainId matches the RPC node’s chainId.
  - Check if websocket connection is open.
- REST
  - Please check if the REST node is not currently experiencing any issues/errors.
  - Please double-check if your chainId matches the REST node’s chainId.
- Please provide the CoinGecko ID only if the price for the token is available on CoinGecko.
