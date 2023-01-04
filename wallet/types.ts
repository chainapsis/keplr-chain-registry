import { ChainInfo } from "@keplr-wallet/types";

export interface Wallet {
  init(chainIds: string[]): Promise<void>;

  getChainInfosWithoutEndpoints(): Promise<
    (Pick<ChainInfo, "chainId" | "chainName" | "bech32Config"> & {
      readonly isEthermintLike?: boolean;
    })[]
  >;

  suggestChain(chainInfo: ChainInfo): Promise<void>;
}
