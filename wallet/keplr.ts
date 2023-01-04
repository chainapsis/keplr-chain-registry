import { BroadcastMode, ChainInfo, Keplr } from "@keplr-wallet/types";
import { Wallet } from "./types";

export const getKeplrFromWindow: () => Promise<
  Keplr | undefined
> = async () => {
  if (typeof window === "undefined") {
    return undefined;
  }

  if (window.keplr) {
    return window.keplr;
  }

  if (document.readyState === "complete") {
    return window.keplr;
  }

  return new Promise((resolve) => {
    const documentStateChange = (event: Event) => {
      if (
        event.target &&
        (event.target as Document).readyState === "complete"
      ) {
        resolve(window.keplr);
        document.removeEventListener("readystatechange", documentStateChange);
      }
    };

    document.addEventListener("readystatechange", documentStateChange);
  });
};

export class KeplrWallet implements Wallet {
  constructor(public readonly keplr: Keplr) {}

  broadcastTxSync(chainId: string, tx: Uint8Array): Promise<Uint8Array> {
    return this.keplr.sendTx(chainId, tx, "sync" as BroadcastMode);
  }

  getChainInfosWithoutEndpoints(): Promise<
    (Pick<ChainInfo, "chainId" | "chainName" | "bech32Config"> & {
      readonly isEthermintLike?: boolean;
    })[]
  > {
    return this.keplr.getChainInfosWithoutEndpoints().then((chainInfos) => {
      return chainInfos.map((chainInfo) => {
        return {
          ...chainInfo,
          isEthermintLike:
            chainInfo.features?.includes("eth-address-gen") ||
            chainInfo.features?.includes("eth-key-sign"),
        };
      });
    });
  }

  getKey(chainId: string): Promise<{
    readonly name: string;
    readonly pubKey: Uint8Array;
    readonly bech32Address: string;
    readonly isLedgerNano?: boolean;
  }> {
    return this.keplr.getKey(chainId).then((key) => {
      return {
        ...key,
        isLedgerNano: key.isNanoLedger,
      };
    });
  }

  init(chainIds: string[]): Promise<void> {
    return this.keplr.enable(chainIds);
  }
}
