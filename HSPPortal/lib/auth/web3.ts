export interface Web3AuthState {
  isConnected: boolean
  address: string | null
  chainId: number | null
}

export async function connectMetaMask(): Promise<Web3AuthState> {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed')
  }

  try {
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts',
    })

    const chainId = await window.ethereum.request({
      method: 'eth_chainId',
    })

    // Convert hex to decimal
    const chainIdDec = parseInt(chainId as string, 16)
    const sepoliaChainId = 11155111

    if (chainIdDec !== sepoliaChainId) {
      // Try to switch to Sepolia
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0xaa36a7' }], // Sepolia chainId in hex
        })
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          // Chain doesn't exist, add it
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: '0xaa36a7',
                chainName: 'Sepolia',
                rpcUrls: ['https://sepolia.infura.io/v3/'],
                nativeCurrency: {
                  name: 'ETH',
                  symbol: 'ETH',
                  decimals: 18,
                },
                blockExplorerUrls: ['https://sepolia.etherscan.io'],
              },
            ],
          })
        }
      }
    }

    return {
      isConnected: true,
      address: accounts[0] as string,
      chainId: sepoliaChainId,
    }
  } catch (error: any) {
    if (error.code === 4001) {
      throw new Error('User denied wallet connection')
    }
    throw error
  }
}

export async function disconnectMetaMask(): Promise<void> {
  // MetaMask doesn't have a built-in disconnect, but we can clear local state
  // The actual disconnection happens on the app side
}

export function getConnectedAddress(): Promise<string | null> {
  return new Promise((resolve) => {
    if (!window.ethereum) {
      resolve(null)
      return
    }

    window.ethereum
      .request({ method: 'eth_accounts' })
      .then((accounts: string[]) => {
        resolve(accounts.length > 0 ? accounts[0] : null)
      })
      .catch(() => {
        resolve(null)
      })
  })
}
