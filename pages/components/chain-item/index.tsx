import { FunctionComponent } from "react";
import styled from "styled-components";
import { DisplayChainInfo } from "../../index";

interface Props {
  chainItem: DisplayChainInfo;
}

export const ChainItem: FunctionComponent<Props> = (props) => {
  const { chainItem } = props;

  return (
    <ChainItemContainer key={chainItem.chainId}>
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
