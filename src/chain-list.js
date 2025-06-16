function parse(chainId) {
  // In the case of injective dev/testnet, there is a difficult problem to deal with keplr's chain identifier system...
  // Fundamentally, keplr's chain identifier system started when the app was created, so too mnay logic depends on chain identifier.
  // Temporarily deal with it in the way below.
  // There is a possibility of some kind of problem...
  // But anyway, it's not a big problem because it's dev/testnet...
  if (chainId === "injective-777" || chainId === "injective-888") {
    return {
      identifier: chainId,
      version: 0,
    };
  }

  const split = chainId.split(/(.+)-([\d]+)/).filter(Boolean);

  if (split.length !== 2) {
    return {
      identifier: chainId,
      version: 0,
    };
  } else {
    return { identifier: split[0], version: parseInt(split[1]) };
  }
}

const getKeplrFromWindow = async () => {
  if (window.keplr) {
    return window.keplr;
  }

  if (document.readyState === "complete") {
    return window.keplr;
  }

  return new Promise((resolve) => {
    const documentStateChange = (event) => {
      if (event.target && event.target.readyState === "complete") {
        resolve(window.keplr);
        document.removeEventListener("readystatechange", documentStateChange);
      }
    };

    document.addEventListener("readystatechange", documentStateChange);
  });
};

async function init() {
  const keplr = await getKeplrFromWindow();

  const keplrNotInstalledDiv = document.getElementById("keplr-not-installed");
  keplrNotInstalledDiv.style.display = "none";

  const loadingDiv = document.getElementById("loading");
  loadingDiv.style.display = "flex";

  const response = await fetch(
    "https://keplr-chain-registry.vercel.app/api/chains",
  );
  const _chainInfos = await response.json();
  const chainInfos = _chainInfos.chains.filter((chainInfo) => {
    return !chainInfo.hideInUI;
  });

  const isOnKeplrMobile = /KeplrWalletMobile|Android|iPhone/g.test(
    navigator.userAgent,
  );

  let registeredChainIds = [];
  if (keplr) {
    const registeredResponse = await keplr.getChainInfosWithoutEndpoints();
    registeredChainIds = registeredResponse.map(
      (chainInfo) => parse(chainInfo.chainId).identifier,
    );
  } else {
    registeredChainIds = chainInfos
      .filter((chainInfo) => !chainInfo.nodeProvider)
      .map((chainInfo) => parse(chainInfo.chainId).identifier);
  }

  removeChainListChild();

  const filteredChainInfos = chainInfos
    .filter(
      (chainInfo) =>
        !registeredChainIds.includes(parse(chainInfo.chainId).identifier),
    )
    .filter((chainInfo) => {
      if (isOnKeplrMobile) {
        return !chainInfo.chainId.startsWith("eip155:");
      } else {
        return true;
      }
    });

  const registeredChainInfos = chainInfos
    .filter((chainInfo) => chainInfo.nodeProvider)
    .filter((chainInfo) =>
      registeredChainIds.includes(parse(chainInfo.chainId).identifier),
    )
    .filter((chainInfo) => {
      if (isOnKeplrMobile) {
        return !chainInfo.chainId.startsWith("eip155:");
      } else {
        return true;
      }
    });

  if (filteredChainInfos.length > 0) {
    filteredChainInfos.map((chainInfo) => {
      return createChainItem(chainInfo, keplr);
    });

    registeredChainInfos.map((chainInfo) => {
      return createChainItem(chainInfo, keplr, true);
    });
  } else {
    const addedAllChainDiv = document.createElement("div");
    addedAllChainDiv.className = "added-all-chain";
    addedAllChainDiv.style.display = "flex";

    const descriptionText = document.createTextNode("You added all chains");
    addedAllChainDiv.appendChild(descriptionText);

    const chainListDiv = document.getElementById("chain-list");
    chainListDiv.appendChild(addedAllChainDiv);
  }

  loadingDiv.style.display = "none";
}

function removeChainListChild() {
  const chainListDiv = document.getElementById("chain-list");
  while (chainListDiv.firstChild) {
    chainListDiv.removeChild(chainListDiv.lastChild);
  }
}

function createChainItem(chainInfo, keplr, registered) {
  const chainItemDiv = document.createElement("div");
  chainItemDiv.className = "chain-item";

  createChainSymbol(chainItemDiv, chainInfo);
  createChainName(chainItemDiv, chainInfo);
  createChainCurrency(chainItemDiv, chainInfo);
  createNodeProvider(chainItemDiv, chainInfo);
  if (registered) {
    createRegisteredButton(chainItemDiv);
  } else {
    createRegisterButton(chainItemDiv, chainInfo, keplr);
  }

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

  const chainCurrency = chainInfo.stakeCurrency
    ? chainInfo.stakeCurrency
    : chainInfo.currencies[0];

  const chainCurrencyText = document.createTextNode(chainCurrency.coinDenom);
  chainCurrencyDiv.appendChild(chainCurrencyText);

  chainItemDiv.appendChild(chainCurrencyDiv);
}

function createNodeProvider(chainItemDiv, chainInfo) {
  if (chainInfo.nodeProvider) {
    const nodeProviderDiv = document.createElement("div");
    nodeProviderDiv.className = "node-provider";

    const providerLinkA = document.createElement("a");
    providerLinkA.className = "provider-link";

    providerLinkA.href = chainInfo.nodeProvider.website;
    providerLinkA.target = "_blank";

    const providerNameText = document.createTextNode(
      chainInfo.nodeProvider.name,
    );
    providerLinkA.appendChild(providerNameText);

    const providerContactDiv = document.createElement("div");
    providerContactDiv.className = "provider-email";

    const isEmail = chainInfo.nodeProvider.email != null;
    const isDiscord = chainInfo.nodeProvider.discord != null;

    const providerContactText = document.createTextNode(
      isEmail
        ? chainInfo.nodeProvider.email
        : isDiscord
        ? chainInfo.nodeProvider.discord
        : "",
    );
    providerContactDiv.appendChild(providerContactText);
    providerContactDiv.onclick = function () {
      window.location = isEmail
        ? `mailto:${chainInfo.nodeProvider.email}`
        : isDiscord
        ? chainInfo.nodeProvider.discord
        : "";
    };

    nodeProviderDiv.appendChild(providerLinkA);
    nodeProviderDiv.appendChild(providerContactDiv);

    chainItemDiv.appendChild(nodeProviderDiv);
  } else {
    const nodeProviderDiv = document.createElement("div");
    nodeProviderDiv.className = "native-node-provider";

    const providerNameText = document.createTextNode("Keplr Node");
    nodeProviderDiv.appendChild(providerNameText);

    chainItemDiv.appendChild(nodeProviderDiv);
  }
}

function createRegisterButton(chainItemDiv, chainInfo, keplr) {
  const registerButton = document.createElement("button");
  registerButton.className = "chain-register";

  const registerButtonText = document.createTextNode("Add to Keplr");
  registerButton.appendChild(registerButtonText);

  registerButton.onclick = async () => {
    try {
      if (keplr) {
        registerButton.classList.add("button-loading");
        registerButton.textContent = "Loading";

        await window.keplr.experimentalSuggestChain(chainInfo);

        setTimeout(() => {
          registerButton.classList.remove("button-loading");
          registerButton.textContent = "Add to Keplr";
          init();
        }, 1000);
      } else {
        const keplrNotInstalledDiv = document.getElementById(
          "keplr-not-installed",
        );
        keplrNotInstalledDiv.style.display = "flex";
      }
    } catch (e) {
      setTimeout(() => {
        registerButton.classList.remove("button-loading");
        registerButton.textContent = "Add to Keplr";
      }, 300);

      console.error(e);
    }
  };

  chainItemDiv.appendChild(registerButton);
}

function createRegisteredButton(chainItemDiv) {
  const registeredButton = document.createElement("button");
  registeredButton.className = "chain-added";

  const registeredButtonText = document.createTextNode("Added");
  registeredButton.appendChild(registeredButtonText);

  chainItemDiv.appendChild(registeredButton);
}

init();
