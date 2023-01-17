async function init() {
  const response = await fetch(
    "https://keplr-chain-registry.vercel.app/api/chains",
  );
  const chainInfos = await response.json();

  console.log("chainInfos", chainInfos);

  chainInfos.chains.map((chainInfo) => {
    return createChainItem(chainInfo);
  });
}

function createChainItem(chainInfo) {
  const chainItemDiv = document.createElement("div");
  chainItemDiv.className = "chain-item";

  createChainSymbol(chainItemDiv, chainInfo);
  createChainName(chainItemDiv, chainInfo);
  createChainCurrency(chainItemDiv, chainInfo);
  createNodeProvider(chainItemDiv, chainInfo);
  createRegisterButton(chainItemDiv, chainInfo);

  const chainListDiv = document.getElementById("chain-list");
  chainListDiv.appendChild(chainItemDiv);
}

function createChainSymbol(chainItemDiv, chainInfo) {
  const chainSymbolImg = document.createElement("img");
  chainSymbolImg.className = "chain-symbol";
  chainSymbolImg.src = chainInfo.chainSymbolImageUrl;

  chainItemDiv.appendChild(chainSymbolImg);
}

function createChainName(chainItemDiv, chainInfo) {
  const chainNameDiv = document.createElement("div");
  chainNameDiv.className = "chain-name";

  const chainNameText = document.createTextNode(chainInfo.chainName);
  chainNameDiv.appendChild(chainNameText);

  chainItemDiv.appendChild(chainNameDiv);
}

function createChainCurrency(chainItemDiv, chainInfo) {
  const chainCurrencyDiv = document.createElement("div");
  chainCurrencyDiv.className = "chain-currency";

  const chainCurrencyText = document.createTextNode(
    chainInfo.currencies[0].coinDenom,
  );
  chainCurrencyDiv.appendChild(chainCurrencyText);

  chainItemDiv.appendChild(chainCurrencyDiv);
}

function createNodeProvider(chainItemDiv, chainInfo) {
  let nodeProviderDiv;
  if (chainInfo.nodeProvider) {
    nodeProviderDiv = document.createElement("div");
    nodeProviderDiv.className = "node-provider";

    const providerLinkA = document.createElement("a");
    providerLinkA.className = "provider-link";

    providerLinkA.href = chainInfo.nodeProvider.website;
    providerLinkA.target = "_blank";

    const providerNameText = document.createTextNode(
      chainInfo.nodeProvider.name,
    );
    providerLinkA.appendChild(providerNameText);

    const providerEmailDiv = document.createElement("div");
    providerEmailDiv.className = "provider-email";

    const providerEmailText = document.createTextNode(
      chainInfo.nodeProvider.email,
    );
    providerEmailDiv.appendChild(providerEmailText);

    nodeProviderDiv.appendChild(providerLinkA);
    nodeProviderDiv.appendChild(providerEmailDiv);
  } else {
    nodeProviderDiv = document.createElement("div");
    nodeProviderDiv.className = "native-node-provider";

    const nativeNodeProviderText = document.createTextNode("Keplr Supported");
    nodeProviderDiv.appendChild(nativeNodeProviderText);
  }

  chainItemDiv.appendChild(nodeProviderDiv);
}

function createRegisterButton(chainItemDiv, chainInfo) {
  const registerButton = document.createElement("button");
  registerButton.className = "chain-register";

  const registerButtonText = document.createTextNode("Add to Keplr");
  registerButton.appendChild(registerButtonText);

  registerButton.onclick = () => {
    window.keplr.experimentalSuggestChain(chainInfo);
  };

  chainItemDiv.appendChild(registerButton);
}

init();
