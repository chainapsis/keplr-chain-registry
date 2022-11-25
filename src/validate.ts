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
  path: string
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
  chainInfo: ChainInfo
): Promise<ChainInfo> => {
  const prev = sortedJsonByKeyStringify(chainInfo);

  // validate chain information
  chainInfo = await validateBasicChainInfoType(chainInfo);

  if (sortedJsonByKeyStringify(chainInfo) !== prev) {
    throw new Error("Chain info has unknown field");
  }

  // Check chain identifier
  if (ChainIdHelper.parse(chainInfo.chainId).identifier !== chainIdentifier) {
    throw new Error(
      `Chain identifier unmatched: (expected: ${chainIdentifier}, actual: ${
        ChainIdHelper.parse(chainInfo.chainId).identifier
      })`
    );
  }

  for (const feature of chainInfo.features ?? []) {
    if (!NonRecognizableChainFeatures.includes(feature)) {
      throw new Error(
        `Only non recognizable feature should be provided: ${feature}`
      );
    }
  }

  for (const currency of chainInfo.currencies) {
    if (new DenomHelper(currency.coinMinimalDenom).type !== "native") {
      throw new Error(
        `Do not provide not native token to currencies: ${currency.coinMinimalDenom}`
      );
    }

    if (currency.coinMinimalDenom.startsWith("ibc/")) {
      throw new Error(
        `Do not provide ibc currency to currencies: ${currency.coinMinimalDenom}`
      );
    }

    if (currency.coinMinimalDenom.startsWith("gravity0x")) {
      throw new Error(
        `Do not provide bridged currency to currencies: ${currency.coinMinimalDenom}`
      );
    }
  }

  // check RPC alive
  await checkRPCConnectivity(
    chainInfo.chainId,
    chainInfo.rpc,
    (url) => new WebSocket(url)
  );

  // check REST alive
  if (chainIdentifier !== "gravity-bridge" && chainIdentifier !== "sommelier") {
    await checkRestConnectivity(chainInfo.chainId, chainInfo.rest);
  }

  return chainInfo;
};

export const checkImageSize = (path: string) => {
  const dimensions = sizeOf(path);
  if (dimensions.width !== 256 || dimensions.height !== 256) {
    throw new Error(
      "Image size is not 256x256px. size : " + JSON.stringify(dimensions)
    );
  }
};
