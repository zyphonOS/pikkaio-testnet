'use client'
import { useState, useEffect } from 'react'

interface WalletConnectProps {
  onAccountChange: (account: string) => void
  autoConnect?: boolean
}

declare global {
  interface Window {
    ethereum?: any
  }
}

export default function WalletConnect({ onAccountChange, autoConnect = false }: WalletConnectProps) {
  const [account, setAccount] = useState('')
  const [loading, setLoading] = useState(false)
  const [walletError, setWalletError] = useState('')
  const [availableWallets, setAvailableWallets] = useState<string[]>([])

  const detectWallets = () => {
    const wallets = []
    
    if (window.ethereum) {
      // Check for multiple providers
      if (window.ethereum.providers && window.ethereum.providers.length > 0) {
        window.ethereum.providers.forEach((provider: any) => {
          if (provider.isRabby) wallets.push('Rabby')
          else if (provider.isMetaMask) wallets.push('MetaMask')
          else if (provider.isCoinbaseWallet) wallets.push('Coinbase')
          else wallets.push('Ethereum')
        })
      } else {
        // Single provider
        if (window.ethereum.isRabby) wallets.push('Rabby')
        else if (window.ethereum.isMetaMask) wallets.push('MetaMask') 
        else if (window.ethereum.isCoinbaseWallet) wallets.push('Coinbase')
        else wallets.push('Ethereum')
      }
    }
    
    setAvailableWallets(wallets)
    return wallets
  }

  const connectWallet = async (walletType?: string) => {
    setWalletError('')
    
    if (!window.ethereum) {
      setWalletError('No Ethereum wallet found. Please install Rabby, MetaMask, or another Web3 wallet.')
      return
    }

    let ethereum = window.ethereum

    // Handle wallet selection if multiple available
    if (walletType && ethereum.providers && ethereum.providers.length > 0) {
      if (walletType === 'Rabby') {
        ethereum = ethereum.providers.find((p: any) => p.isRabby)
      } else if (walletType === 'MetaMask') {
        ethereum = ethereum.providers.find((p: any) => p.isMetaMask)
      } else if (walletType === 'Coinbase') {
        ethereum = ethereum.providers.find((p: any) => p.isCoinbaseWallet)
      }
      
      if (!ethereum) {
        ethereum = window.ethereum.providers[0] // Fallback to first provider
      }
      
      // Set the selected provider as active
      window.ethereum.setSelectedProvider?.(ethereum)
    }

    setLoading(true)
    try {
      const accounts = await ethereum.request({
        method: 'eth_requestAccounts'
      })
      const account = accounts[0]
      setAccount(account)
      onAccountChange(account)
    } catch (error: any) {
      console.error('Error connecting wallet:', error)
      if (error.code === 4001) {
        setWalletError('Connection rejected by user')
      } else {
        setWalletError(error.message || 'Failed to connect wallet')
      }
    } finally {
      setLoading(false)
    }
  }

  const disconnectWallet = () => {
    setAccount('')
    onAccountChange('')
    setWalletError('')
  }

  useEffect(() => {
    detectWallets()
    if (autoConnect && window.ethereum) {
      checkConnectedWallet()
    }
  }, [autoConnect])

  const checkConnectedWallet = async () => {
    if (!window.ethereum) return

    let ethereum = window.ethereum
    if (ethereum.providers && ethereum.providers.length > 0) {
      // Prefer Rabby if available
      ethereum = ethereum.providers.find((p: any) => p.isRabby) || 
                 ethereum.providers.find((p: any) => p.isMetaMask) || 
                 ethereum.providers[0]
    }

    try {
      const accounts = await ethereum.request({
        method: 'eth_accounts'
      })
      if (accounts.length > 0) {
        setAccount(accounts[0])
        onAccountChange(accounts[0])
      }
    } catch (error) {
      console.error('Error checking connected wallet:', error)
    }
  }

  useEffect(() => {
    let ethereum = window.ethereum
    if (ethereum) {
      if (ethereum.providers && ethereum.providers.length > 0) {
        ethereum = ethereum.providers.find((p: any) => p.isRabby) || 
                   ethereum.providers.find((p: any) => p.isMetaMask) || 
                   ethereum.providers[0]
      }
      
      ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          setAccount('')
          onAccountChange('')
        } else {
          setAccount(accounts[0])
          onAccountChange(accounts[0])
        }
      })

      ethereum.on('chainChanged', () => {
        window.location.reload()
      })
    }
  }, [onAccountChange])

  return (
    <div className="flex items-center gap-4">
      {account ? (
        <div className="flex items-center gap-3">
          <span className="text-sm bg-[#00b4d8]/20 px-3 py-1 rounded-full border border-[#00b4d8]/40">
            {account.slice(0, 6)}...{account.slice(-4)}
          </span>
          <button
            onClick={disconnectWallet}
            className="bg-red-500/20 text-red-300 px-3 py-1 rounded-lg border border-red-500/40 hover:bg-red-500/30 transition-colors"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {availableWallets.length > 1 ? (
            <div className="flex flex-col gap-2">
              <div className="text-xs text-[#48cae4]">Choose wallet:</div>
              <div className="flex gap-2">
                {availableWallets.map((wallet) => (
                  <button
                    key={wallet}
                    onClick={() => connectWallet(wallet)}
                    disabled={loading}
                    className="bg-gradient-to-r from-[#00b4d8] to-[#8c3a9d] text-white px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    {loading ? 'Connecting...' : `Connect ${wallet}`}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <button
              onClick={() => connectWallet()}
              disabled={loading}
              className="bg-gradient-to-r from-[#00b4d8] to-[#8c3a9d] text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50"
            >
              {loading ? 'Connecting...' : 'Connect Wallet'}
            </button>
          )}
          {walletError && (
            <div className="text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded border border-red-500/20">
              {walletError}
            </div>
          )}
          {availableWallets.length > 0 && (
            <div className="text-xs text-[#48cae4]/70">
              Detected: {availableWallets.join(', ')}
            </div>
          )}
        </div>
      )}
    </div>
  )
}