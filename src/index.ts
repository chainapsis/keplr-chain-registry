import { checkImageSize, validateChainInfoFromPath } from "./validate";
import libPath from "path";
import { ChainIdHelper } from "@keplr-wallet/cosmos";
import {
  nativeMainnetChainIdentifiers,
  nativeTestnetChainIdentifiers,
} from "./constants";

const main = async () => {
  // get file name
  const args = process.argv.slice(2);

  try {
    if (args.length > 1) {
      throw new Error("Too many args");
    }

    const path = args[0];

    const chainInfo = await validateChainInfoFromPath(path);

    const isNativeSupported = (() => {
      const chainIdentifier = ChainIdHelper.parse(chainInfo.chainId).identifier;

      return nativeMainnetChainIdentifiers
        .map((s) => s.trim())
        .includes(chainIdentifier);
    })();

    const isTestnetChain = (() => {
      const chainIdentifier = ChainIdHelper.parse(chainInfo.chainId).identifier;

      return nativeTestnetChainIdentifiers
        .map((s) => s.trim())
        .some((s) => s === chainIdentifier);
    })();

    if (!isNativeSupported && !isTestnetChain && !chainInfo.nodeProvider) {
      throw new Error("Node provider should be provided");
    }

    if (!isNativeSupported && !chainInfo.chainSymbolImageUrl) {
      throw new Error("chainSymbolImageUrl should be provided");
    }

    if (
      chainInfo.bip44.coinType === 60 &&
      (!chainInfo.features?.includes("eth-address-gen") ||
        !chainInfo.features?.includes("eth-key-sign"))
    ) {
      throw new Error(
        "EVM Chain should add eth-address-gen, eth-key-sign features",
      );
    }

    const chainIdentifier = libPath.parse(path).name;

    const validateImageUrl = (url: string): string => {
      const baseURL = `https://raw.githubusercontent.com/chainapsis/keplr-chain-registry/main/images/${chainIdentifier}/`;

      if (!url.startsWith(baseURL)) {
        throw new Error(`Invalid image url: ${url}`);
      }
      if (!url.endsWith(".png")) {
        throw new Error(`Image is not png: ${url}`);
      }

      return url.replace(baseURL, "");
    };

    const imageFiles: string[] = [];
    if (chainInfo.chainSymbolImageUrl) {
      imageFiles.push(validateImageUrl(chainInfo.chainSymbolImageUrl));
    }
    if (chainInfo.stakeCurrency?.coinImageUrl) {
      imageFiles.push(validateImageUrl(chainInfo.stakeCurrency.coinImageUrl));
    }
    for (const currency of chainInfo.currencies) {
      if (currency.coinImageUrl) {
        imageFiles.push(validateImageUrl(currency.coinImageUrl));
      }
    }
    for (const feeCurrency of chainInfo.feeCurrencies) {
      if (feeCurrency.coinImageUrl) {
        imageFiles.push(validateImageUrl(feeCurrency.coinImageUrl));
      }
    }

    for (const imageFile of imageFiles) {
      checkImageSize(`images/${chainIdentifier}/${imageFile}`);
    }
  } catch (error: any) {
    console.log(error?.message || error);

    process.exit(1);
  }
};

main();
