import Koa from "koa";
import serve from "koa-static";
import Path from "path";
import ServerlessHttp from "serverless-http";
import fs from "fs/promises";
import { ChainInfo } from "@keplr-wallet/types";

type SearchOption = "all" | "cosmos" | "evm";
type FilterOption = "all" | "chain" | "token";

let allChains: ChainInfo[] | undefined;
let cosmosChainInfos: ChainInfo[] | undefined;
let evmChainInfos: ChainInfo[] | undefined;

const app = new Koa();
app.use(serve(Path.resolve(__dirname, "static")));

const isEvmOnlyChain = (chainInfo: ChainInfo): boolean => {
  const chainIdLikeCAIP2 = chainInfo.chainId.split(":");
  return (
    chainInfo.evm != null &&
    chainIdLikeCAIP2.length === 2 &&
    chainIdLikeCAIP2[0] === "eip155"
  );
};

const loadChains = async () => {
  if (allChains && cosmosChainInfos && evmChainInfos) {
    return { allChains, cosmosChainInfos, evmChainInfos };
  }

  const cosmosChainsDirectory = Path.join(__dirname, "static", "cosmos");
  const cosmosChainFiles = await fs.readdir(cosmosChainsDirectory);
  const cosmosChainContents = await Promise.all(
    cosmosChainFiles.map((fileName) =>
      fs.readFile(Path.join(cosmosChainsDirectory, fileName), "utf8"),
    ),
  );
  cosmosChainInfos = cosmosChainContents.map((content) => JSON.parse(content));

  const evmChainsDirectory = Path.join(__dirname, "static", "evm");
  const evmChainFiles = await fs.readdir(evmChainsDirectory);
  const evmChainContents = await Promise.all(
    evmChainFiles.map((fileName) =>
      fs.readFile(Path.join(evmChainsDirectory, fileName), "utf8"),
    ),
  );
  evmChainInfos = evmChainContents.map((content) => {
    const evmChainInfo = JSON.parse(content);
    const chainId = parseInt(evmChainInfo.chainId.replace("eip155:", ""), 10);
    return {
      ...evmChainInfo,
      rest: evmChainInfo.rpc,
      evm: {
        chainId,
        rpc: evmChainInfo.rpc,
        websocket: evmChainInfo.websocket,
      },
      features: [
        "eth-address-gen",
        "eth-key-sign",
        ...(evmChainInfo.features || []),
      ],
    };
  });

  cosmosChainInfos = cosmosChainInfos.sort((a, b) =>
    a.chainName.localeCompare(b.chainName),
  );
  evmChainInfos = evmChainInfos.sort((a, b) =>
    a.chainName.localeCompare(b.chainName),
  );

  allChains = [...cosmosChainInfos, ...evmChainInfos].sort((a, b) =>
    a.chainName.localeCompare(b.chainName),
  );

  return { allChains, cosmosChainInfos, evmChainInfos };
};

const filterChains = (
  chainInfos: ChainInfo[],
  filterOption: FilterOption,
  searchText: string,
): ChainInfo[] => {
  if (searchText.length === 0) return chainInfos;

  return chainInfos.filter((chainInfo) => {
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
      default:
        return false;
    }
  });
};

app.use(async (ctx) => {
  if (ctx.path !== "/chains") return;

  try {
    const searchOption = (ctx.query["searchOption"] ?? "all") as SearchOption;
    const filterOption = (ctx.query["filterOption"] ?? "all") as FilterOption;
    const searchTextRaw = ctx.query["searchText"];
    const trimmedSearchText = Array.isArray(searchTextRaw)
      ? searchTextRaw[0]?.trim().toLowerCase() || ""
      : searchTextRaw?.trim().toLowerCase() || "";

    const { allChains, cosmosChainInfos, evmChainInfos } = await loadChains();

    let filteredChains: ChainInfo[] = [];

    switch (searchOption) {
      case "all":
        filteredChains = filterChains(
          allChains,
          filterOption,
          trimmedSearchText,
        );
        break;
      case "cosmos":
        filteredChains = filterChains(
          cosmosChainInfos,
          filterOption,
          trimmedSearchText,
        );
        break;
      case "evm":
        filteredChains = filterChains(
          evmChainInfos,
          filterOption,
          trimmedSearchText,
        );
        break;
    }

    ctx.body = { chains: filteredChains };
  } catch (error) {
    ctx.status = 500;
    ctx.body = { error: "Internal Server Error" };
    console.error("Error processing /chains request:", error);
  }
});

const isAWSLambda = !!(process.env as any).LAMBDA_TASK_ROOT;

if (!isAWSLambda) {
  app.listen(3000, () => {
    console.log("Server started on port 3000");
  });
} else {
  module.exports.handler = ServerlessHttp(app);
}
