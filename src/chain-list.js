function onClickRegisterdButton() {
  const chainListDiv = document.getElementById("chain-list");
  const registeredChainDivs = document.querySelectorAll(".registered");
  const unregisteredChainDivs = document.querySelectorAll(".unregistered");

  registeredChainDivs.forEach((div) => {
    div.style.display = "block";
  });

  unregisteredChainDivs.forEach((div) => {
    div.style.display = "none";
  });
}

function onClickUnregisterdButton() {
  const chainListDiv = document.getElementById("chain-list");
  const registeredChainDivs = document.querySelectorAll(".registered");
  const unregisteredChainDivs = document.querySelectorAll(".unregistered");

  registeredChainDivs.forEach((div) => {
    div.style.display = "none";
  });

  unregisteredChainDivs.forEach((div) => {
    div.style.display = "block";
  });
}

async function init() {
  removeChainListChild();

  const response = await fetch(
    "https://keplr-chain-registry.vercel.app/api/chains",
  );

  const registeredResponse = await window.keplr.getChainInfosWithoutEndpoints();
  const registeredChainIds = registeredResponse.map(
    (chainInfo) => chainInfo.chainId,
  );

  const chainInfos = await response.json();

  chainInfos.chains.map((chainInfo) => {
    return createChainItem(
      chainInfo,
      registeredChainIds.includes(chainInfo.chainId),
    );
  });

  onClickUnregisterdButton();
}

function removeChainListChild() {
  var chainListDiv = document.getElementById("chain-list");
  while (chainListDiv.firstChild) {
    chainListDiv.removeChild(chainListDiv.lastChild);
  }
}

function createChainItem(chainInfo, isRegistered) {
  const chainItemDiv = document.createElement("div");
  chainItemDiv.className = `chain-item ${
    isRegistered ? "registered" : "unregistered"
  }`;

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

  registerButton.onclick = async () => {
    try {
      await window.keplr.experimentalSuggestChain(chainInfo);
      init();
    } catch (e) {
      console.error(e);
    }
  };

  chainItemDiv.appendChild(registerButton);
}

function addRegisterdButtons() {
  const unregisteredA = document.createElement("a");
  unregisteredA.className = "tab active w-button";

  const unregisteredText = document.createTextNode("UNREGISTERED");
  unregisteredA.appendChild(unregisteredText);

  unregisteredA.onclick = async () => {
    onClickUnregisterdButton();

    registeredA.classList.remove("active");
    unregisteredA.classList.add("active");
  };

  const registeredA = document.createElement("a");
  registeredA.className = "tab w-button";

  const registeredText = document.createTextNode("REGISTERED");
  registeredA.appendChild(registeredText);

  registeredA.onclick = async () => {
    onClickRegisterdButton();

    unregisteredA.classList.remove("active");
    registeredA.classList.add("active");
  };

  const registeredButtonsDiv = document.getElementById("registred-buttons");
  registeredButtonsDiv.appendChild(unregisteredA);
  registeredButtonsDiv.appendChild(registeredA);
}

addRegisterdButtons();
init();
