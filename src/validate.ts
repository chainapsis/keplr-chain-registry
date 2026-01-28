import sizeOf from "image-size";
import { readFileSync } from "fs";
import { ChainInfo } from "@keplr-wallet/types";
import {
  checkEvmRpcConnectivity,
  checkRestConnectivity,
  checkRPCConnectivity,
  NonRecognizableChainFeatures,
  validateBasicChainInfoType,
} from "@keplr-wallet/chain-validator";
import { DenomHelper, sortedJsonByKeyStringify } from "@keplr-wallet/common";
import { ChainIdHelper } from "@keplr-wallet/cosmos";
import WebSocket from "ws";
import libPath from "path";

export const fileToChainInfo = (filePath: string) => {
  const file = readFileSync(filePath, "utf-8");
  const chainInfo: ChainInfo = JSON.parse(file);
  return chainInfo;
};

export const validateCosmosChainInfoFromPath = async (
  path: string,
): Promise<ChainInfo> => {
  const parsed = libPath.parse(path);
  if (parsed.ext !== ".json") {
    throw new Error("File is not json");
  }

  const chainInfo = fileToChainInfo(path);

  if (chainInfo.hideInUI && chainInfo.chainId !== "wormchain") {
    throw new Error("Should not hide chain in UI");
  }

  return await validateCosmosChainInfo(parsed.name, chainInfo);
};

export const validateCosmosChainInfo = async (
  chainIdentifier: string,
  chainInfo: ChainInfo,
): Promise<ChainInfo> => {
  const prev = sortedJsonByKeyStringify(chainInfo);

  chainInfo = await validateBasicChainInfoType(chainInfo);

  if (sortedJsonByKeyStringify(chainInfo) !== prev) {
    throw new Error("Chain info has unknown field");
  }

  const parsedChainId = ChainIdHelper.parse(chainInfo.chainId).identifier;
  if (parsedChainId !== chainIdentifier) {
    throw new Error(
      `Chain identifier unmatched: (expected: ${parsedChainId}, actual: ${chainIdentifier})`,
    );
  }

  checkCurrencies(chainInfo);

  for (const feature of chainInfo.features ?? []) {
    if (!NonRecognizableChainFeatures.includes(feature)) {
      if (feature !== "ibc-v2") {
        throw new Error(
          `Only non recognizable feature should be provided: ${feature}`,
        );
      }
    }
  }

  if (chainInfo.features?.includes("stargate")) {
    throw new Error("'stargate' feature is deprecated");
  }

  if (chainInfo.features?.includes("no-legacy-stdTx")) {
    throw new Error("'no-legacy-stdTx' feature is deprecated");
  }

  if (chainInfo.beta != null) {
    throw new Error("Should not set 'beta' field");
  }

  if (
    chainInfo.rpc.startsWith("http://") ||
    chainInfo.rest.startsWith("http://")
  ) {
    throw new Error(
      "RPC, LCD endpoints cannot be set as HTTP, please set them as HTTPS",
    );
  }

  await checkRPCConnectivity(
    chainInfo.chainId,
    chainInfo.rpc,
    (url) => new WebSocket(url),
  );

  if (chainInfo.evm) {
    if (chainInfo.evm.chainId === 1329) {
      throw new Error(
        "Cannot set `evm` field for Sei chain. There is a config of EVM version of Sei chain in /evm/eip155:1329.json",
      );
    }

    await checkEvmRpcConnectivity(chainInfo.evm.chainId, chainInfo.evm.rpc);
  }

  if (
    chainIdentifier !== "gravity-bridge" &&
    chainIdentifier !== "sommelier" &&
    chainIdentifier !== "kyve"
  ) {
    await checkRestConnectivity(chainInfo.chainId, chainInfo.rest);
  }

  checkIsTestnet(chainInfo);

  validateCoinGeckoIds(chainInfo);
  const coinGeckoIds = collectCoinGeckoIds(chainInfo);
  await checkCoinGeckoIdsAvailable(...Array.from(coinGeckoIds));

  return chainInfo;
};

export const validateEvmChainInfoFromPath = async (
  path: string,
): Promise<ChainInfo> => {
  const parsed = libPath.parse(path);
  if (parsed.ext !== ".json") {
    throw new Error("File is not json");
  }

  const file = readFileSync(path, "utf-8");
  const chainInfo: Omit<ChainInfo, "rest"> & { websocket: string } =
    JSON.parse(file);

  return await validateEvmChainInfo(parsed.name, chainInfo);
};

export const validateEvmChainInfo = async (
  chainIdentifier: string,
  evmChainInfo: Omit<ChainInfo, "rest"> & { websocket: string },
): Promise<ChainInfo> => {
  const parsedChainId = ChainIdHelper.parse(evmChainInfo.chainId).identifier;
  if (parsedChainId !== chainIdentifier) {
    throw new Error(
      `Chain identifier unmatched: (expected: ${parsedChainId}, actual: ${chainIdentifier})`,
    );
  }

  const evmChainId = parseInt(parsedChainId.replace("eip155:", ""));
  if (isNaN(evmChainId)) {
    throw new Error(
      "Invalid chain identifier. It should be eip155:{integer greater-than-zero}",
    );
  }

  const { websocket, features, ...restEVMChainInfo } = evmChainInfo;
  const chainInfoCandidate = {
    ...restEVMChainInfo,
    rest: evmChainInfo.rpc,
    evm: {
      chainId: evmChainId,
      rpc: evmChainInfo.rpc,
      websocket,
    },
    features: ["eth-address-gen", "eth-key-sign"].concat(features ?? []),
  };
  const prev = sortedJsonByKeyStringify(chainInfoCandidate);
  const chainInfo = await (async () => {
    try {
      return await validateBasicChainInfoType(chainInfoCandidate);
    } catch (e: any) {
      if (e.message === `"bech32Config" is required`) {
        return chainInfoCandidate;
      } else {
        throw e;
      }
    }
  })();
  if (sortedJsonByKeyStringify(chainInfo) !== prev) {
    throw new Error("Chain info has unknown field");
  }

  if (chainInfo.evm == null) {
    throw new Error("Something went wrong with 'evm' field");
  }

  checkCurrencies(chainInfo);

  for (const feature of chainInfo.features ?? []) {
    if (!NonRecognizableChainFeatures.includes(feature)) {
      if (feature !== "ibc-v2") {
        throw new Error(
          `Only non recognizable feature should be provided: ${feature}`,
        );
      }
    }
  }

  if (chainInfo.beta != null) {
    throw new Error("Should not set 'beta' field");
  }

  if (chainInfo.rpc.startsWith("http://")) {
    throw new Error(
      "RPC endpoints cannot be set as HTTP, please set them as HTTPS",
    );
  }

  await checkEvmRpcConnectivity(chainInfo.evm.chainId, chainInfo.rpc);

  checkIsTestnet(chainInfo);

  validateCoinGeckoIds(chainInfo);
  const coinGeckoIds = collectCoinGeckoIds(chainInfo);
  await checkCoinGeckoIdsAvailable(...Array.from(coinGeckoIds));

  return chainInfo;
};

export const checkImageSize = (path: string) => {
  const dimensions = sizeOf(path);
  if (dimensions.width !== 256 || dimensions.height !== 256) {
    throw new Error(
      "Image size is not 256x256px. size : " + JSON.stringify(dimensions),
    );
  }
};

const checkCoinGeckoIdsAvailable = async (...coinGeckoIds: string[]) => {
  const priceURL =
    process.env.PRICE_URL || "https://api.coingecko.com/api/v3/simple/price";
  const response = await fetch(
    `${priceURL}?vs_currencies=usd&ids=${coinGeckoIds.join(",")}`,
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch coinGeckoId ${coinGeckoIds.join(", ")}`);
  }

  const data = await response.json();

  if (data.hasOwnProperty("error")) {
    throw new Error(`Failed to fetch coinGeckoId ${coinGeckoIds.join(", ")}`);
  }

  for (const coinGeckoId of coinGeckoIds) {
    if (data[coinGeckoId] == null || data[coinGeckoId]["usd"] == null) {
      throw new Error(
        `Failed to fetch coinGeckoId ${coinGeckoId} from coingecko`,
      );
    }
  }
};

export const checkCurrencies = (chainInfo: ChainInfo) => {
  if (
    chainInfo.stakeCurrency &&
    !chainInfo.currencies.some(
      (currency) =>
        currency.coinMinimalDenom === chainInfo.stakeCurrency?.coinMinimalDenom,
    )
  ) {
    throw new Error(
      `Stake Currency must be included in currencies. stakeCurrency: ${chainInfo.stakeCurrency.coinMinimalDenom}`,
    );
  }

  if (
    !chainInfo.feeCurrencies
      .filter((feeCurrency) => !feeCurrency.coinMinimalDenom.startsWith("ibc/"))
      .every((feeCurrency) =>
        chainInfo.currencies.some(
          (currency) =>
            feeCurrency.coinMinimalDenom === currency.coinMinimalDenom,
        ),
      ) &&
    ChainIdHelper.parse(chainInfo.chainId).identifier !== "gravity-bridge"
  ) {
    throw new Error(`Fee Currency must be included in currencies`);
  }

  for (const currency of chainInfo.currencies) {
    const denomHelper = new DenomHelper(currency.coinMinimalDenom);
    if (denomHelper.type !== "native" && denomHelper.type !== "erc20") {
      throw new Error(
        `Do not provide not native token or ERC20 token to currencies: ${currency.coinMinimalDenom}`,
      );
    }

    if (
      currency.coinMinimalDenom.startsWith("ibc/") &&
      ChainIdHelper.parse(chainInfo.chainId).identifier !== "centauri"
    ) {
      // 오스모시스 위의 페넘브라는 일단 봐준다.
      if (
        ChainIdHelper.parse(chainInfo.chainId).identifier === "osmosis" &&
        currency.coinMinimalDenom ===
          "ibc/0FA9232B262B89E77D1335D54FB1E1F506A92A7E4B51524B400DC69C68D28372"
      ) {
        continue;
      }
      // 오스모시스 위의 나마다도 봐준다.
      if (
        ChainIdHelper.parse(chainInfo.chainId).identifier === "osmosis" &&
        currency.coinMinimalDenom ===
          "ibc/C7110DEC66869DAE9BE9C3C60F4B5313B16A2204AE020C3B0527DD6B322386A3"
      ) {
        continue;
      }
      if (
        ChainIdHelper.parse(chainInfo.chainId).identifier === "neutron" &&
        currency.coinMinimalDenom ===
          "ibc/9598CDEB7C6DB7FC21E746C8E0250B30CD5154F39CA111A9D4948A4362F638BD"
      ) {
        continue;
      }
      if (
        ChainIdHelper.parse(chainInfo.chainId).identifier === "osmosis" &&
        currency.coinMinimalDenom ===
          "ibc/573FCD90FACEE750F55A8864EF7D38265F07E5A9273FA0E8DAFD39951332B580"
      ) {
        continue;
      }

      throw new Error(
        `Do not provide ibc currency to currencies: ${currency.coinMinimalDenom}`,
      );
    }
  }
};

export const checkIsTestnet = (chainInfo: ChainInfo) => {
  const chainNameInLowerCase = chainInfo.chainName.toLowerCase();
  const isTestnet = chainInfo.isTestnet;

  if (
    (chainNameInLowerCase.includes("testnet") ||
      chainNameInLowerCase.includes("devnet") ||
      chainInfo.chainId.includes("testnet") ||
      chainInfo.chainId.includes("devnet")) &&
    !isTestnet
  ) {
    throw new Error(
      'Add `"isTestnet": true` if your chain is a testnet or devnet',
    );
  }

  return true;
};

export const collectCoinGeckoIds = (chainInfo: ChainInfo): Set<string> => {
  const coinGeckoIds = new Set<string>();

  for (const currency of chainInfo.currencies) {
    if (currency.coinGeckoId) {
      coinGeckoIds.add(currency.coinGeckoId);
    }
  }

  for (const currency of chainInfo.feeCurrencies) {
    if (currency.coinGeckoId) {
      coinGeckoIds.add(currency.coinGeckoId);
    }
  }

  if (chainInfo.stakeCurrency?.coinGeckoId) {
    coinGeckoIds.add(chainInfo.stakeCurrency.coinGeckoId);
  }

  return coinGeckoIds;
};

export const validateSvmChainInfoFromPath = async (
  path: string,
): Promise<ChainInfo> => {
  const parsed = libPath.parse(path);
  if (parsed.ext !== ".json") {
    throw new Error("File is not json");
  }

  const file = readFileSync(path, "utf-8");
  const chainInfo: Omit<ChainInfo, "rest"> & { websocket: string } =
    JSON.parse(file);

  return await validateSvmChainInfo(parsed.name, chainInfo);
};

export const validateSvmChainInfo = async (
  chainIdentifier: string,
  svmChainInfo: Omit<ChainInfo, "rest"> & { websocket: string },
): Promise<ChainInfo> => {
  if (svmChainInfo.chainId !== chainIdentifier) {
    throw new Error(
      `Chain identifier unmatched: (expected: ${svmChainInfo.chainId}, actual: ${chainIdentifier})`,
    );
  }

  const svmChainIdRegex = /^[a-z]+:[1-9A-HJ-NP-Za-km-z]+$/;
  if (!svmChainIdRegex.test(chainIdentifier)) {
    throw new Error(
      "Invalid chain identifier. It should be {namespace}:{base58-hash}",
    );
  }

  const { websocket, features, ...restSvmChainInfo } = svmChainInfo;
  const chainInfoCandidate = {
    ...restSvmChainInfo,
    rest: svmChainInfo.rpc,
    svm: {
      rpc: svmChainInfo.rpc,
      websocket,
    },
    features: features ?? [],
  };

  const prev = sortedJsonByKeyStringify(chainInfoCandidate);

  const chainInfo = await (async () => {
    try {
      return await validateBasicChainInfoType(chainInfoCandidate);
    } catch (e: any) {
      const ignoredErrors = [
        `"bech32Config" is required`,
        `"value" failed custom validation because if bech32Config is undefined, coin type should be 60`,
      ];
      if (ignoredErrors.includes(e.message)) {
        return chainInfoCandidate;
      } else {
        throw e;
      }
    }
  })();

  if (sortedJsonByKeyStringify(chainInfo) !== prev) {
    throw new Error("Chain info has unknown field");
  }

  checkCurrencies(chainInfo);

  for (const feature of chainInfo.features ?? []) {
    if (!NonRecognizableChainFeatures.includes(feature)) {
      throw new Error(
        `Only non recognizable feature should be provided: ${feature}`,
      );
    }
  }

  if (chainInfo.beta != null) {
    throw new Error("Should not set 'beta' field");
  }

  if (chainInfo.rpc.startsWith("http://")) {
    throw new Error(
      "RPC endpoints cannot be set as HTTP, please set them as HTTPS",
    );
  }

  await checkSvmRpcConnectivity(chainInfo.rpc);

  checkIsTestnet(chainInfo);

  validateCoinGeckoIds(chainInfo);
  const coinGeckoIds = collectCoinGeckoIds(chainInfo);
  if (coinGeckoIds.size > 0) {
    await checkCoinGeckoIdsAvailable(...Array.from(coinGeckoIds));
  }

  return chainInfo;
};

const checkSvmRpcConnectivity = async (rpc: string): Promise<void> => {
  try {
    const response = await fetch(rpc, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getHealth",
      }),
    });

    if (!response.ok) {
      throw new Error(
        `SVM RPC health check failed with status: ${response.status}`,
      );
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(
        `SVM RPC health check returned error: ${data.error.message}`,
      );
    }
  } catch (e: any) {
    throw new Error(`Failed to connect to SVM RPC: ${e.message}`);
  }
};

export const validateCoinGeckoIds = (chainInfo: ChainInfo): void => {
  const throwError = {
    missingCoinGeckoId: (coinMinimalDenom: string) => {
      throw new Error(
        `Provide coinGeckoId for the currency "${coinMinimalDenom}" in the "currencies", "feeCurrencies", and "stakeCurrency" fields all together`,
      );
    },
    testnetHavingCoinGeckoId: () => {
      throw new Error("Testnet chain should not have coinGeckoId");
    },
  };

  for (const currency of chainInfo.currencies) {
    if (currency.coinGeckoId && chainInfo.isTestnet) {
      throwError.testnetHavingCoinGeckoId();
    }

    if (
      !currency.coinGeckoId &&
      ((chainInfo.stakeCurrency?.coinMinimalDenom ===
        currency.coinMinimalDenom &&
        !!chainInfo.stakeCurrency?.coinGeckoId) ||
        chainInfo.feeCurrencies.some(
          (c) =>
            c.coinMinimalDenom === currency.coinMinimalDenom && !!c.coinGeckoId,
        ))
    ) {
      throwError.missingCoinGeckoId(currency.coinMinimalDenom);
    }
  }

  for (const currency of chainInfo.feeCurrencies) {
    if (currency.coinGeckoId && chainInfo.isTestnet) {
      throwError.testnetHavingCoinGeckoId();
    }

    if (
      !currency.coinGeckoId &&
      ((chainInfo.stakeCurrency?.coinMinimalDenom ===
        currency.coinMinimalDenom &&
        !!chainInfo.stakeCurrency?.coinGeckoId) ||
        chainInfo.currencies.some(
          (c) =>
            c.coinMinimalDenom === currency.coinMinimalDenom && !!c.coinGeckoId,
        ))
    ) {
      throwError.missingCoinGeckoId(currency.coinMinimalDenom);
    }
  }

  if (chainInfo.stakeCurrency) {
    if (chainInfo.stakeCurrency.coinGeckoId && chainInfo.isTestnet) {
      throwError.testnetHavingCoinGeckoId();
    }

    if (
      !chainInfo.stakeCurrency.coinGeckoId &&
      [...chainInfo.currencies, ...chainInfo.feeCurrencies].some(
        (c) =>
          c.coinMinimalDenom === chainInfo.stakeCurrency?.coinMinimalDenom &&
          !!c.coinGeckoId,
      )
    ) {
      throwError.missingCoinGeckoId(
        chainInfo.stakeCurrency.coinMinimalDenom ?? "",
      );
    }
  }
};
