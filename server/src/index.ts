import Koa from "koa";
import serve from "koa-static";
import Path from "path";
import ServerlessHttp from "serverless-http";
import fs from "fs/promises";
import { ChainInfo } from "@keplr-wallet/types";

type SearchOption = "all" | "cosmos" | "evm";
type FilterOption = "all" | "chain" | "token" | "chainNameAndToken";

let allChains: ChainInfo[] | undefined;
let cosmosChainInfos: ChainInfo[] | undefined;
let evmChainInfos: ChainInfo[] | undefined;

const app = new Koa();

app.use(serve(Path.resolve(__dirname, "static")));

const isEvmOnlyChain = (chainInfo: ChainInfo): boolean => {
  return (
    chainInfo.evm != null &&
    !chainInfo.bech32Config &&
    chainInfo.chainId.startsWith("eip155:")
  );
};

const loadChains = async (): Promise<{
  allChains: ChainInfo[];
  cosmosChainInfos: ChainInfo[];
  evmChainInfos: ChainInfo[];
}> => {
  if (allChains && cosmosChainInfos && evmChainInfos) {
    return { allChains, cosmosChainInfos, evmChainInfos };
  }

  console.log("Loading chain info from files...");

  const cosmosChainsDirectory = Path.join(__dirname, "static", "cosmos");
  let loadedCosmosChains: ChainInfo[] = [];
  try {
    const cosmosChainFiles = await fs.readdir(cosmosChainsDirectory);
    const cosmosReadPromises = cosmosChainFiles.map(async (fileName) => {
      const filePath = Path.join(cosmosChainsDirectory, fileName);
      try {
        const content = await fs.readFile(filePath, "utf8");
        return JSON.parse(content) as ChainInfo;
      } catch (error: any) {
        console.error(`Error processing Cosmos file ${fileName}:`, error.message);
        return null;
      }
    });
    const results = await Promise.allSettled(cosmosReadPromises);
    loadedCosmosChains = results
      .filter((result): result is PromiseFulfilledResult<ChainInfo | null> => result.status === 'fulfilled')
      .map(result => result.value)
      .filter((chainInfo): chainInfo is ChainInfo => chainInfo !== null);
  } catch (error: any) {
     console.error(`Error reading Cosmos chains directory: ${cosmosChainsDirectory}`, error.message);
  }
  cosmosChainInfos = loadedCosmosChains.sort((a, b) =>
    a.chainName.localeCompare(b.chainName),
  );

  const evmChainsDirectory = Path.join(__dirname, "static", "evm");
  let loadedEvmChains: ChainInfo[] = [];
   try {
    const evmChainFiles = await fs.readdir(evmChainsDirectory);
    const evmReadPromises = evmChainFiles.map(async (fileName) => {
      const filePath = Path.join(evmChainsDirectory, fileName);
      try {
        const content = await fs.readFile(filePath, "utf8");
        const evmChainInfoBase = JSON.parse(content);

        if (!evmChainInfoBase.chainId || !evmChainInfoBase.chainId.startsWith("eip155:")) {
             throw new Error(`Invalid or missing chainId (expected 'eip155:...')`);
        }
         if (!evmChainInfoBase.rpc) {
             throw new Error(`Missing 'rpc' field`);
         }
        const numericChainId = parseInt(evmChainInfoBase.chainId.replace("eip155:", ""), 10);
         if (isNaN(numericChainId)) {
             throw new Error(`Could not parse numeric chainId from ${evmChainInfoBase.chainId}`);
         }

        return {
          ...evmChainInfoBase,
          rest: evmChainInfoBase.rest || evmChainInfoBase.rpc,
          rpc: evmChainInfoBase.rpc,
          chainId: evmChainInfoBase.chainId,
          evm: {
            chainId: numericChainId,
            rpc: evmChainInfoBase.rpc,
            websocket: evmChainInfoBase.websocket,
          },
          features: [
            "eth-address-gen",
            "eth-key-sign",
            ...(evmChainInfoBase.features || []),
          ],
          bech32Config: undefined,
        } as ChainInfo;

      } catch (error: any) {
        console.error(`Error processing EVM file ${fileName}:`, error.message);
        return null;
      }
    });
    const results = await Promise.allSettled(evmReadPromises);
     loadedEvmChains = results
       .filter((result): result is PromiseFulfilledResult<ChainInfo | null> => result.status === 'fulfilled')
       .map(result => result.value)
       .filter((chainInfo): chainInfo is ChainInfo => chainInfo !== null);
   } catch (error: any) {
     console.error(`Error reading EVM chains directory: ${evmChainsDirectory}`, error.message);
   }
  evmChainInfos = loadedEvmChains.sort((a, b) =>
    a.chainName.localeCompare(b.chainName),
  );

  allChains = [...(cosmosChainInfos || []), ...(evmChainInfos || [])].sort((a, b) =>
    a.chainName.localeCompare(b.chainName),
  );

  console.log(`Loaded ${cosmosChainInfos?.length ?? 0} Cosmos chains, ${evmChainInfos?.length ?? 0} EVM chains. Total: ${allChains?.length ?? 0}`);

  return {
      allChains: allChains || [],
      cosmosChainInfos: cosmosChainInfos || [],
      evmChainInfos: evmChainInfos || []
  };
};

const filterChains = (
  chainInfos: ChainInfo[],
  filterOption: FilterOption,
  searchText: string,
): ChainInfo[] => {
  if (!searchText) {
    return chainInfos;
  }

  return chainInfos.filter((chainInfo) => {
    if (!chainInfo || !chainInfo.chainId || !chainInfo.chainName || !chainInfo.currencies || chainInfo.currencies.length === 0) {
        console.warn("Skipping chain due to missing critical info:", chainInfo?.chainId || 'unknown');
        return false;
    }

    const chainId = chainInfo.chainId.toLowerCase();
    const chainName = chainInfo.chainName.toLowerCase();
    const mainCurrencyDenom = chainInfo.currencies[0].coinDenom.toLowerCase();
    const stakeCurrencyDenom = chainInfo.stakeCurrency?.coinDenom.toLowerCase();

    const tokenDenom = isEvmOnlyChain(chainInfo)
      ? mainCurrencyDenom
      : stakeCurrencyDenom || mainCurrencyDenom;

    switch (filterOption) {
      case "all":
        return (
          chainName.includes(searchText) ||
          chainId.includes(searchText) ||
          tokenDenom.includes(searchText)
        );
      case "chain":
        return chainName.includes(searchText) || chainId.includes(searchText);
      case "token":
        return tokenDenom.includes(searchText);
      case "chainNameAndToken":
        return (
          chainName.includes(searchText) || tokenDenom.includes(searchText)
        );
      default:
        console.warn("Unknown filterOption:", filterOption);
        return false;
    }
  });
};

app.use(async (ctx, next) => {
  if (ctx.path !== "/chains") {
      return next();
  }

  try {
    const searchOption = (ctx.query["searchOption"] ?? "all") as SearchOption;
    const filterOption = (ctx.query["filterOption"] ?? "all") as FilterOption;
    const searchTextRaw = ctx.query["searchText"];

    const trimmedSearchText = (
        Array.isArray(searchTextRaw) ? searchTextRaw[0] : searchTextRaw
    )?.trim().toLowerCase() ?? "";

    const { allChains, cosmosChainInfos, evmChainInfos } = await loadChains();

    let sourceChains: ChainInfo[];
    switch (searchOption) {
      case "all":
        sourceChains = allChains;
        break;
      case "cosmos":
        sourceChains = cosmosChainInfos;
        break;
      case "evm":
        sourceChains = evmChainInfos;
        break;
      default:
        console.warn("Unknown searchOption:", searchOption);
        sourceChains = allChains;
    }

    const filteredChains = filterChains(
      sourceChains,
      filterOption,
      trimmedSearchText,
    );

    ctx.body = { chains: filteredChains };

  } catch (error) {
    ctx.status = 500;
    ctx.body = { error: "Internal Server Error" };
    console.error("Error processing /chains request:", error);
  }
});

const isAWSLambda = !!process.env.LAMBDA_TASK_ROOT;

if (!isAWSLambda) {
  const PORT = process.env.PORT || 3000;
  loadChains().then(() => {
      app.listen(PORT, () => {
          console.log(`Server started locally on port ${PORT}`);
      });
  }).catch(error => {
      console.error("Failed to pre-load chain data on startup:", error);
      process.exit(1);
  });

} else {
  module.exports.handler = ServerlessHttp(app);
}
