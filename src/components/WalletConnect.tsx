'use client'
import { useState, useEffect } from 'react'
import { ethers } from 'ethers'

declare global {
  interface Window {
    ethereum?: any
  }
}

interface WalletConnectProps {
  onAccountChange: (account: string) => void
}

export default function WalletConnect({ onAccountChange }: WalletConnectProps) {
  const [account, setAccount] = useState<string>('')
  const [isConnecting, setIsConnecting] = useState(false)

  useEffect(() => {
    checkWalletConnection()
    
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged)
      window.ethereum.on('chainChanged', () => window.location.reload())
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
        window.ethereum.removeListener('chainChanged', () => window.location.reload())
      }
    }
  }, [])

  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      setAccount('')
      onAccountChange('')
    } else {
      setAccount(accounts[0])
      onAccountChange(accounts[0])
    }
  }

  const checkWalletConnection = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ 
          method: 'eth_accounts' 
        })
        if (accounts.length > 0) {
          setAccount(accounts[0])
          onAccountChange(accounts[0])
        }
      } catch (error) {
        console.error('Error checking wallet connection:', error)
      }
    }
  }

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        setIsConnecting(true)
        const accounts = await window.ethereum.request({ 
          method: 'eth_requestAccounts' 
        })
        setAccount(accounts[0])
        onAccountChange(accounts[0])
      } catch (error) {
        console.error('Error connecting wallet:', error)
        alert('Failed to connect wallet')
      } finally {
        setIsConnecting(false)
      }
    } else {
      alert('Please install MetaMask!')
    }
  }

  return (
    <div className="flex items-center gap-4">
      {account ? (
        <div className="bg-emerald-100 text-emerald-800 px-4 py-2 rounded-lg border border-emerald-200">
          ✅ {account.slice(0, 6)}...{account.slice(-4)}
        </div>
      ) : (
        <button 
          onClick={connectWallet}
          disabled={isConnecting}
          className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:from-cyan-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
        >
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </button>
      )}
    </div>
  )
}