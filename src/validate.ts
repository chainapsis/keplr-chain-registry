import sizeOf from "image-size";
import { readFileSync } from "fs";
import { ChainInfo } from "@keplr-wallet/types";
import {
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

export const validateChainInfoFromPath = async (
  path: string,
): Promise<ChainInfo> => {
  const parsed = libPath.parse(path);
  if (parsed.ext !== ".json") {
    throw new Error("File is not json");
  }

  // get json from file
  const chainInfo = fileToChainInfo(path);

  // validate chain info
  return await validateChainInfo(parsed.name, chainInfo);
};

export const validateChainInfo = async (
  chainIdentifier: string,
  chainInfo: ChainInfo,
): Promise<ChainInfo> => {
  const prev = sortedJsonByKeyStringify(chainInfo);

  // validate chain information
  chainInfo = await validateBasicChainInfoType(chainInfo);

  if (sortedJsonByKeyStringify(chainInfo) !== prev) {
    throw new Error("Chain info has unknown field");
  }

  // Check chain identifier
  const parsedChainId = ChainIdHelper.parse(chainInfo.chainId).identifier;
  if (parsedChainId !== chainIdentifier) {
    throw new Error(
      `Chain identifier unmatched: (expected: ${parsedChainId}, actual: ${chainIdentifier})`,
    );
  }

  // Check currencies
  checkCurrencies(chainInfo);

  for (const feature of chainInfo.features ?? []) {
    if (!NonRecognizableChainFeatures.includes(feature)) {
      throw new Error(
        `Only non recognizable feature should be provided: ${feature}`,
      );
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

  // check RPC alive
  await checkRPCConnectivity(
    chainInfo.chainId,
    chainInfo.rpc,
    (url) => new WebSocket(url),
  );

  // check REST alive
  if (
    chainIdentifier !== "gravity-bridge" &&
    chainIdentifier !== "sommelier" &&
    chainIdentifier !== "kyve"
  ) {
    await checkRestConnectivity(chainInfo.chainId, chainInfo.rest);
  }

  // check coinGecko vaild
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

  await checkCoinGeckoIds(...Array.from(coinGeckoIds));

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

const checkCoinGeckoIds = async (...coinGeckoIds: string[]) => {
  const response = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?vs_currencies=usd&ids=${coinGeckoIds.join(
      ",",
    )}`,
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
        `Failed to fetch coinGeckoId ${coinGeckoId} from coin gecko`,
      );
    }
  }
};

export const checkCurrencies = (chainInfo: ChainInfo) => {
  // Check stake currency
  if (
    chainInfo.stakeCurrency &&
    !chainInfo.currencies.some(
      (currency) =>
        currency.coinMinimalDenom === chainInfo.stakeCurrency!.coinMinimalDenom,
    )
  ) {
    throw new Error(
      `Stake Currency must be included in currencies. stakeCurrency: ${chainInfo.stakeCurrency.coinMinimalDenom}`,
    );
  }

  // Check fee currency
  if (
    !chainInfo.feeCurrencies
      .filter((feeCurrency) => !feeCurrency.coinMinimalDenom.startsWith("ibc/"))
      .every((feeCurrency) =>
        chainInfo.currencies.some(
          (currency) =>
            feeCurrency.coinMinimalDenom === currency.coinMinimalDenom,
        ),
      )
  ) {
    throw new Error(`Fee Currency must be included in currencies`);
  }

  // Check currencies
  for (const currency of chainInfo.currencies) {
    if (new DenomHelper(currency.coinMinimalDenom).type !== "native") {
      throw new Error(
        `Do not provide not native token to currencies: ${currency.coinMinimalDenom}`,
      );
    }

    if (currency.coinMinimalDenom.startsWith("ibc/")) {
      throw new Error(
        `Do not provide ibc currency to currencies: ${currency.coinMinimalDenom}`,
      );
    }

    if (currency.coinMinimalDenom.startsWith("gravity0x")) {
      throw new Error(
        `Do not provide bridged currency to currencies: ${currency.coinMinimalDenom}`,
      );
    }
  }
};
