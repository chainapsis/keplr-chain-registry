import { FunctionComponent } from "react";
import styled from "styled-components";
import { ChainInfo } from "@keplr-wallet/types";
import { DisplayChainInfo } from "../../pages";

interface Props {
  chainItem: DisplayChainInfo;
  onClick: (chainInfo: ChainInfo) => Promise<void>;
}

export const ChainItem: FunctionComponent<Props> = (props) => {
  const { chainItem, onClick } = props;

  return (
    <ChainItemContainer
      key={chainItem.chainId}
      onClick={async () => await onClick(chainItem)}
    >
      <div>Chain Name: {chainItem.chainName}</div>
      <div>Display Type: {chainItem.displayType}</div>
    </ChainItemContainer>
  );
};

export const ChainItemContainer = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  cursor: pointer;
`;
