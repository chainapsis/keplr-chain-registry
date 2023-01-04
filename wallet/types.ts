import { ChainInfo } from "@keplr-wallet/types";

export interface Wallet {
  init(chainIds: string[]): Promise<void>;

  getChainInfosWithoutEndpoints(): Promise<
    (Pick<ChainInfo, "chainId" | "chainName" | "bech32Config"> & {
      readonly isEthermintLike?: boolean;
    })[]
  >;

  getKey(chainId: string): Promise<{
    readonly name: string;
    readonly pubKey: Uint8Array;
    readonly bech32Address: string;
    readonly isLedgerNano?: boolean;
  }>;
}
