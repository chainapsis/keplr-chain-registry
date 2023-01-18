function onClickRegisteredButton() {
  const chainListDiv = document.getElementById("chain-list");
  const registeredChainDivs = document.querySelectorAll(".registered");
  const unregisteredChainDivs = document.querySelectorAll(".unregistered");

  registeredChainDivs.forEach((div) => {
    div.style.display = "grid";
  });

  unregisteredChainDivs.forEach((div) => {
    div.style.display = "none";
  });
}

function onClickUnregisteredButton() {
  const chainListDiv = document.getElementById("chain-list");
  const registeredChainDivs = document.querySelectorAll(".registered");
  const unregisteredChainDivs = document.querySelectorAll(".unregistered");

  registeredChainDivs.forEach((div) => {
    div.style.display = "none";
  });

  unregisteredChainDivs.forEach((div) => {
    div.style.display = "grid";
  });
}

async function init() {
  removeChainListChild();

  if (window.keplr) {
    const response = await fetch(
      "https://keplr-chain-registry.vercel.app/api/chains",
    );

    const registeredResponse =
      await window.keplr.getChainInfosWithoutEndpoints();
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

    onClickUnregisteredButton();
  } else {
    const keplrNotInstalledDiv = document.getElementById("keplr-not-installed");
    keplrNotInstalledDiv.style.display = "block";
  }
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
  createRegisterButton(chainItemDiv, chainInfo, isRegistered);

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

function createRegisterButton(chainItemDiv, chainInfo, isRegistered) {
  const registerButton = document.createElement("button");
  registerButton.className = "chain-register";
  if (isRegistered) {
    registerButton.disabled = true;
  }

  const registerButtonText = document.createTextNode(
    isRegistered ? "Added Already" : "Add to Keplr",
  );
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

function addRegisteredButtons() {
  const unregisteredA = document.createElement("a");
  unregisteredA.className = "tab active";

  const unregisteredText = document.createTextNode("UNREGISTERED");
  unregisteredA.appendChild(unregisteredText);

  unregisteredA.onclick = async () => {
    onClickUnregisteredButton();

    registeredA.classList.remove("active");
    unregisteredA.classList.add("active");
  };

  const registeredA = document.createElement("a");
  registeredA.className = "tab";

  const registeredText = document.createTextNode("REGISTERED");
  registeredA.appendChild(registeredText);

  registeredA.onclick = async () => {
    onClickRegisteredButton();

    unregisteredA.classList.remove("active");
    registeredA.classList.add("active");
  };

  const registeredButtonsDiv = document.getElementById("registred-buttons");
  registeredButtonsDiv.appendChild(unregisteredA);
  registeredButtonsDiv.appendChild(registeredA);
}

addRegisteredButtons();
init();
