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

  // Wait for wallet conflicts to resolve
  const getEthereum = (): any => {
    if (typeof window === 'undefined') return undefined
    
    // Wait a bit for wallet injections to settle
    const ethereum = window.ethereum
    
    if (!ethereum) return undefined
    
    // If multiple providers, try to find the dominant one
    if (ethereum.providers && ethereum.providers.length > 0) {
      // Prefer wallets in this order
      const preferredWallets = [
        (p: any) => p.isRabby,
        (p: any) => p.isMetaMask, 
        (p: any) => p.isCoinbaseWallet
      ]
      
      for (const check of preferredWallets) {
        const wallet = ethereum.providers.find(check)
        if (wallet) return wallet
      }
      
      // Return first provider as fallback
      return ethereum.providers[0]
    }
    
    return ethereum
  }

  const connectWallet = async () => {
    setWalletError('')
    setLoading(true)
    
    try {
      const ethereum = getEthereum()
      
      if (!ethereum) {
        setWalletError('No Ethereum wallet found. Please install Rabby, MetaMask, or another Web3 wallet.')
        return
      }

      const accounts = await ethereum.request({
        method: 'eth_requestAccounts'
      })
      
      const account = accounts[0]
      setAccount(account)
      onAccountChange(account)
      
    } catch (error: any) {
      console.error('Wallet connection error:', error)
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
    if (autoConnect) {
      // Delay auto-connect to let wallets settle
      setTimeout(() => {
        checkConnectedWallet()
      }, 1000)
    }
  }, [autoConnect])

  const checkConnectedWallet = async () => {
    const ethereum = getEthereum()
    if (!ethereum) return

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
    const ethereum = getEthereum()
    if (ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          setAccount('')
          onAccountChange('')
        } else {
          setAccount(accounts[0])
          onAccountChange(accounts[0])
        }
      }

      const handleChainChanged = () => {
        window.location.reload()
      }

      ethereum.on('accountsChanged', handleAccountsChanged)
      ethereum.on('chainChanged', handleChainChanged)

      return () => {
        ethereum.removeListener('accountsChanged', handleAccountsChanged)
        ethereum.removeListener('chainChanged', handleChainChanged)
      }
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
          <button
            onClick={connectWallet}
            disabled={loading}
            className="bg-gradient-to-r from-[#00b4d8] to-[#8c3a9d] text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50"
          >
            {loading ? 'Connecting...' : 'Connect Wallet'}
          </button>
          {walletError && (
            <div className="text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded border border-red-500/20">
              {walletError}
            </div>
          )}
        </div>
      )}
    </div>
  )
}