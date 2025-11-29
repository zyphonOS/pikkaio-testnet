'use client'
import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import WalletConnect from '@/components/WalletConnect'

const INTENT_REGISTRY_ABI = [
  "function createIntent(string) payable",
  "function intentCount() view returns (uint256)", 
  "function fulfillIntent(uint256, string)",
  "function validateProof(uint256, bool)",
  "function intents(uint256) view returns (address, string, uint256, uint256, bool, uint256, string, address, uint256)",
  "function getValidators(uint256) view returns (address[])",
  "event IntentCreated(uint256 indexed intentId, address creator, string description, uint256 stake)",
  "event IntentFulfilled(uint256 indexed intentId, address fulfiller, string proof)",
  "event ProofValidated(uint256 indexed intentId, address validator, bool isValid)"
]

const RPC_URL = "https://rpc.testnet.arc.network"
const CONTRACT_ADDRESS = "0x6DB0CC04AF6601b88241Fb0C2b830CCa8Be229b2"

export default function Home() {
  const [account, setAccount] = useState('')
  const [intentDescription, setIntentDescription] = useState('')
  const [stakeAmount, setStakeAmount] = useState('0.01')
  const [intents, setIntents] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('learn')
  const [fulfillmentProof, setFulfillmentProof] = useState('')
  const [userStats, setUserStats] = useState({ 
    points: 0, 
    fulfilled: 0,
    validations: 0,
    validationRewards: 0
  })
  const [connectionStatus, setConnectionStatus] = useState('🔌 Disconnected')

  // Simple localStorage for session data
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTab = localStorage.getItem('pikkaio-activeTab')
      const savedDescription = localStorage.getItem('pikkaio-intentDescription')
      if (savedTab) setActiveTab(savedTab)
      if (savedDescription) setIntentDescription(savedDescription)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('pikkaio-activeTab', activeTab)
    localStorage.setItem('pikkaio-intentDescription', intentDescription)
  }, [activeTab, intentDescription])

  const loadIntents = async () => {
    try {
      setConnectionStatus('🔗 Connecting to Arc Network...')
      console.log('🔗 Connecting to Arc Network...')
      
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      
      // Test connection
      const network = await provider.getNetwork();
      console.log('🌐 Connected to network:', network.name, network.chainId)
      setConnectionStatus(`🌐 Connected to ${network.name} (${network.chainId})`)

      const contract = new ethers.Contract(CONTRACT_ADDRESS, INTENT_REGISTRY_ABI, provider)

      console.log('📊 Fetching intent count...')
      const count = await contract.intentCount()
      const countNumber = Number(count)
      console.log('📈 Total intents:', countNumber)
      setConnectionStatus(`📈 Found ${countNumber} intents on chain`)
      
      const intentList = []
      for (let i = 1; i <= countNumber; i++) {
        try {
          console.log(`🔄 Loading intent ${i}...`)
          const intentData = await contract.intents(i)
          
          if (intentData[0] !== ethers.ZeroAddress) {
            let validators: string[] = []
            try {
              validators = await contract.getValidators(i)
            } catch (e) {
              console.log(`No validators for intent ${i}`)
            }

            intentList.push({
              id: i,
              creator: intentData[0],
              description: intentData[1],
              stakeAmount: intentData[2],
              reward: intentData[3],
              fulfilled: intentData[4],
              deadline: intentData[5],
              proof: intentData[6],
              fulfiller: intentData[7],
              validationScore: intentData[8],
              validators: validators
            })
            console.log(`✅ Loaded intent ${i}: ${intentData[1].substring(0, 50)}...`)
          }
        } catch (e) {
          console.error(`❌ Error loading intent ${i}:`, e)
          break
        }
      }
      
      console.log('🎯 Final intent list:', intentList)
      setIntents(intentList.reverse())
      setConnectionStatus(`✅ Loaded ${intentList.length} intents`)
      
      // Calculate user stats
      if (account) {
        const userIntents = intentList.filter((intent: any) => 
          intent.creator.toLowerCase() === account.toLowerCase()
        )
        const fulfilled = userIntents.filter((intent: any) => intent.fulfilled).length
        
        let validations = 0
        intentList.forEach((intent: any) => {
          if (intent.validators.includes(account.toLowerCase())) {
            validations++
          }
        })

        const points = (fulfilled * 100) + (validations * 25)
        const validationRewards = validations * 25
        
        setUserStats({ points, fulfilled, validations, validationRewards })
      }
    } catch (error) {
      console.error('💥 Error loading intents:', error)
      setConnectionStatus('❌ Failed to load intents - check console')
      setIntents([])
    }
  }

  const testConnection = async () => {
    try {
      console.log('🧪 Testing RPC connection...')
      setConnectionStatus('🧪 Testing RPC connection...')
      
      // Test basic RPC call
      const provider = new ethers.JsonRpcProvider(RPC_URL)
      const blockNumber = await provider.getBlockNumber()
      console.log('📦 Current block:', blockNumber)
      
      // Test contract call
      const contract = new ethers.Contract(CONTRACT_ADDRESS, INTENT_REGISTRY_ABI, provider)
      const count = await contract.intentCount()
      console.log('📊 Contract intent count:', Number(count))
      
      setConnectionStatus(`✅ Connection OK - Block: ${blockNumber}, Intents: ${Number(count)}`)
    } catch (error) {
      console.error('💥 Connection test failed:', error)
      setConnectionStatus('❌ Connection test failed - check console')
    }
  }

  useEffect(() => {
    loadIntents()
    const interval = setInterval(loadIntents, 15000)
    return () => clearInterval(interval)
  }, [account])

  const createIntent = async () => {
    if (!window.ethereum || !account || !intentDescription.trim()) {
      alert('Please connect wallet and enter intent')
      return
    }

    setLoading(true)
    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(CONTRACT_ADDRESS, INTENT_REGISTRY_ABI, signer)

      console.log('💸 Creating intent with stake:', stakeAmount)
      const tx = await contract.createIntent(intentDescription, {
        value: ethers.parseEther(stakeAmount)
      })
      
      console.log('⏳ Waiting for transaction...')
      await tx.wait()
      
      alert('🎯 Intent expressed and staked! Your economic asset is now live.')
      setIntentDescription('')
      setTimeout(loadIntents, 2000)
      setActiveTab('market')
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to create intent - check console for details')
    } finally {
      setLoading(false)
    }
  }

  const fulfillIntent = async (intentId: number) => {
    if (!window.ethereum || !account || !fulfillmentProof.trim()) {
      alert('Please connect wallet and provide proof')
      return
    }

    setLoading(true)
    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(CONTRACT_ADDRESS, INTENT_REGISTRY_ABI, signer)

      console.log('✅ Fulfilling intent:', intentId)
      const tx = await contract.fulfillIntent(intentId, fulfillmentProof)
      await tx.wait()
      
      alert('✨ Intent fulfilled! Proof submitted. Awaiting community validation.')
      setTimeout(loadIntents, 2000)
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to fulfill intent - check console for details')
    } finally {
      setLoading(false)
      setFulfillmentProof('')
    }
  }

  const validateProof = async (intentId: number, isValid: boolean) => {
    if (!window.ethereum || !account) return

    setLoading(true)
    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(CONTRACT_ADDRESS, INTENT_REGISTRY_ABI, signer)

      console.log('⚖️ Validating proof:', intentId, isValid)
      const tx = await contract.validateProof(intentId, isValid)
      await tx.wait()
      
      alert(`✅ Validation submitted! You earned 25 testnet points for ${isValid ? 'approving' : 'rejecting'} this proof.`)
      setTimeout(loadIntents, 2000)
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to submit validation - check console for details')
    } finally {
      setLoading(false)
    }
  }

  const handleAccountChange = (newAccount: string) => {
    setAccount(newAccount)
  }

  const canValidate = (intent: any) => {
    return account && 
           account.toLowerCase() !== intent.creator.toLowerCase() && 
           account.toLowerCase() !== intent.fulfiller?.toLowerCase() &&
           !intent.validators?.includes(account.toLowerCase())
  }

  const getValidationStatus = (intent: any) => {
    if (!intent.fulfilled) return 'pending'
    if (intent.validationScore > 2) return 'approved'
    if (intent.validationScore < -2) return 'rejected'
    return 'awaiting'
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0a0e2a] via-[#1a1f4b] to-[#4a1e6b] text-white p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 p-6 bg-gradient-to-r from-[#1a1f4b]/80 to-[#6b2c8c]/80 rounded-2xl border border-[#00b4d8]/30">
          <div className="flex items-center gap-4">
            <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#48cae4] to-[#ad48ae]" style={{ fontFamily: 'Agency FB' }}>
              PIKKAIO
            </div>
            <div className="text-lg text-[#e2f3f8]">
              Your Intent is Your Most Valuable Asset • Built on Arc Network
            </div>
          </div>
          <WalletConnect onAccountChange={handleAccountChange} />
        </div>

        {/* Connection Status */}
        <div className="bg-gradient-to-r from-[#1a1f4b]/60 to-[#4a1e6b]/60 p-4 rounded-xl border border-[#00b4d8]/20 mb-6">
          <div className="flex justify-between items-center">
            <div className="text-sm font-mono">{connectionStatus}</div>
            <div className="flex gap-2">
              <button 
                onClick={testConnection}
                className="bg-[#00b4d8] text-white px-3 py-1 rounded text-sm"
              >
                🧪 Test Connection
              </button>
              <button 
                onClick={() => console.log('Current intents:', intents)}
                className="bg-[#48cae4] text-white px-3 py-1 rounded text-sm"
              >
                🐛 Debug Intents
              </button>
            </div>
          </div>
        </div>

        {/* User Stats */}
        {account && (
          <div className="bg-gradient-to-r from-[#1a1f4b]/60 to-[#4a1e6b]/60 p-4 rounded-xl border border-[#00b4d8]/20 mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-[#48cae4]">{userStats.points}</div>
                <div className="text-sm text-[#e2f3f8]">Total Points</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[#48cae4]">{userStats.fulfilled}</div>
                <div className="text-sm text-[#e2f3f8]">Intents Fulfilled</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[#48cae4]">{userStats.validations}</div>
                <div className="text-sm text-[#e2f3f8]">Proofs Validated</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[#48cae4]">{userStats.validationRewards}</div>
                <div className="text-sm text-[#e2f3f8]">Validation Points</div>
              </div>
            </div>
            <div className="text-center mt-2 text-sm text-[#48cae4]/70">
              Points determine your $PIK airdrop at Token Generation Event
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-4 mb-8">
          <button 
            onClick={() => setActiveTab('learn')}
            className={`px-6 py-3 rounded-lg font-medium ${activeTab === 'learn' ? 'bg-[#00b4d8]' : 'bg-[#1a1f4b]/50'}`}
          >
            💡 How It Works
          </button>
          <button 
            onClick={() => setActiveTab('express')}
            className={`px-6 py-3 rounded-lg font-medium ${activeTab === 'express' ? 'bg-[#00b4d8]' : 'bg-[#1a1f4b]/50'}`}
          >
            ⚡ Express Intent
          </button>
          <button 
            onClick={() => setActiveTab('market')}
            className={`px-6 py-3 rounded-lg font-medium ${activeTab === 'market' ? 'bg-[#00b4d8]' : 'bg-[#1a1f4b]/50'}`}
          >
            📈 Intent Market
          </button>
        </div>

        {/* Learn Tab */}
        {activeTab === 'learn' && (
          <div className="bg-gradient-to-br from-[#1a1f4b]/60 to-[#4a1e6b]/60 rounded-2xl p-8 border border-[#48cae4]/20">
            <h2 className="text-3xl font-bold mb-6 text-[#48cae4]">Your Intent Has Economic Value</h2>
            
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="bg-[#0a0e2a]/50 p-6 rounded-xl border border-[#00b4d8]/20">
                <div className="text-2xl mb-3">1️⃣</div>
                <h3 className="text-xl font-bold mb-2 text-[#48cae4]">Express Intent</h3>
                <p className="text-[#e2f3f8]">Stake testnet USDC to transform your desire into an economic asset.</p>
              </div>
              <div className="bg-[#0a0e2a]/50 p-6 rounded-xl border border-[#00b4d8]/20">
                <div className="text-2xl mb-3">2️⃣</div>
                <h3 className="text-xl font-bold mb-2 text-[#48cae4]">Take Action & Prove</h3>
                <p className="text-[#e2f3f8]">Fulfill your intent and provide proof of completion.</p>
              </div>
              <div className="bg-[#0a0e2a]/50 p-6 rounded-xl border border-[#00b4d8]/20">
                <div className="text-2xl mb-3">3️⃣</div>
                <h3 className="text-xl font-bold mb-2 text-[#48cae4]">Validate & Earn</h3>
                <p className="text-[#e2f3f8]">Community validates proofs and earns rewards for participation.</p>
              </div>
            </div>

            <div className="bg-[#0a0e2a]/30 p-6 rounded-xl border border-[#00b4d8]/20">
              <h3 className="text-xl font-bold mb-3 text-[#48cae4]">Enhanced Rewards System</h3>
              <div className="space-y-2 text-[#e2f3f8]">
                <div>• <span className="font-bold text-[#48cae4]">100 points</span> per fulfilled intent</div>
                <div>• <span className="font-bold text-[#48cae4]">25 points</span> per proof validation</div>
                <div>• <span className="font-bold text-[#48cae4]">2x USDC</span> return on successful fulfillment</div>
                <div>• Points determine mainnet $PIK airdrop allocation</div>
                <div>• Top validators get bonus governance rights</div>
              </div>
            </div>
          </div>
        )}

        {/* Express Tab */}
        {activeTab === 'express' && (
          <div className="bg-gradient-to-br from-[#1a1f4b]/60 to-[#4a1e6b]/60 rounded-2xl p-8 border border-[#48cae4]/20">
            <h2 className="text-3xl font-bold mb-6 text-[#48cae4]">Transform Intent into Economic Asset</h2>
            <div className="max-w-2xl space-y-6">
              <div>
                <label className="block text-lg font-medium text-[#e2f3f8] mb-3">
                  What economic value will you create?
                </label>
                <textarea
                  value={intentDescription}
                  onChange={(e) => setIntentDescription(e.target.value)}
                  placeholder="I intend to build a dApp that generates revenue...
I intend to learn Web3 development and secure a job...
I intend to create content that educates thousands..."
                  rows={4}
                  className="w-full px-4 py-3 bg-[#0a0e2a]/50 border border-[#00b4d8]/40 rounded-xl text-white placeholder-[#48cae4]/60"
                />
              </div>
              
              <div>
                <label className="block text-lg font-medium text-[#e2f3f8] mb-3">
                  Economic Stake (testnet USDC)
                </label>
                <input
                  type="text"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0a0e2a]/50 border border-[#00b4d8]/40 rounded-xl text-white"
                />
                <div className="text-sm text-[#48cae4] mt-2">
                  Potential Return: <span className="font-bold">{parseFloat(stakeAmount) * 2} USDC</span> • 
                  Points Earned: <span className="font-bold">100 testnet points</span>
                </div>
              </div>

              <button
                onClick={createIntent}
                disabled={!intentDescription || loading || !account}
                className="w-full bg-gradient-to-r from-[#00b4d8] to-[#8c3a9d] text-white py-4 rounded-xl font-bold text-lg disabled:opacity-50"
              >
                {!account ? '🔗 Connect Wallet to Continue' : 
                 loading ? '🔄 Creating Economic Asset...' : 
                 '💰 Express Intent & Stake Value'}
              </button>
            </div>
          </div>
        )}

        {/* Market Tab */}
        {activeTab === 'market' && (
          <div className="bg-gradient-to-br from-[#1a1f4b]/60 to-[#4a1e6b]/60 rounded-2xl p-8 border border-[#48cae4]/20">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-[#48cae4]">Live Intent Economy</h2>
              <div className="flex gap-2">
                <button 
                  onClick={loadIntents}
                  className="bg-[#00b4d8] text-white px-4 py-2 rounded-lg"
                >
                  🔄 Refresh Intents
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {intents.length > 0 ? (
                intents.map((intent) => (
                  <div key={intent.id} className="bg-gradient-to-r from-[#1a1f4b]/40 to-[#6b2c8c]/40 p-6 rounded-xl border border-[#00b4d8]/20">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-lg font-medium text-[#f8feff] mb-3">{intent.description}</p>
                        
                        {/* Proof Section */}
                        {intent.fulfilled && intent.proof && (
                          <div className="bg-[#0a0e2a]/30 p-4 rounded-lg mb-4 border border-[#00b4d8]/20">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-[#48cae4] font-semibold">📎 Proof Submitted:</span>
                              <span className="text-[#e2f3f8] break-all">{intent.proof}</span>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-[#48cae4]">
                                Validation Score: <span className={intent.validationScore > 0 ? 'text-[#00ff88]' : intent.validationScore < 0 ? 'text-[#ff6b6b]' : 'text-[#ffd166]'}>
                                  {intent.validationScore}
                                </span>
                              </span>
                              <span className="text-[#48cae4]">
                                Status: <span className={
                                  getValidationStatus(intent) === 'approved' ? 'text-[#00ff88]' :
                                  getValidationStatus(intent) === 'rejected' ? 'text-[#ff6b6b]' : 'text-[#ffd166]'
                                }>
                                  {getValidationStatus(intent).toUpperCase()}
                                </span>
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-[#48cae4]">Stake</div>
                            <div className="text-white font-semibold">{ethers.formatEther(intent.stakeAmount)} USDC</div>
                          </div>
                          <div>
                            <div className="text-[#48cae4]">Reward</div>
                            <div className="text-white font-semibold">{ethers.formatEther(intent.reward)} USDC</div>
                          </div>
                          <div>
                            <div className="text-[#48cae4]">Points</div>
                            <div className="text-[#00ff88] font-semibold">100</div>
                          </div>
                          <div>
                            <div className="text-[#48cae4]">Status</div>
                            <div className={intent.fulfilled ? 'text-[#00ff88] font-semibold' : 'text-[#ffd166] font-semibold'}>
                              {intent.fulfilled ? 'Fulfilled' : 'Active'}
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-[#48cae4]/70 mt-3">
                          Creator: {intent.creator.slice(0, 8)}...{intent.creator.slice(-6)}
                          {intent.fulfiller && intent.fulfiller !== ethers.ZeroAddress && (
                            <> • Fulfiller: {intent.fulfiller.slice(0, 8)}...{intent.fulfiller.slice(-6)}</>
                          )}
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col gap-2 ml-4">
                        {/* Fulfillment Section */}
                        {!intent.fulfilled && account === intent.creator && (
                          <>
                            <input
                              type="text"
                              placeholder="Proof URL or description..."
                              value={fulfillmentProof}
                              onChange={(e) => setFulfillmentProof(e.target.value)}
                              className="px-3 py-2 bg-[#0a0e2a]/50 border border-[#00b4d8]/40 rounded text-white text-sm w-48"
                            />
                            <button 
                              onClick={() => fulfillIntent(intent.id)}
                              disabled={loading || !fulfillmentProof.trim()}
                              className="bg-gradient-to-r from-[#00ff88] to-[#00b4d8] px-4 py-2 rounded-lg text-[#0a0e2a] font-bold disabled:opacity-50"
                            >
                              {loading ? 'Processing...' : 'Fulfill & Submit Proof'}
                            </button>
                          </>
                        )}

                        {/* Validation Section */}
                        {intent.fulfilled && canValidate(intent) && (
                          <div className="flex gap-2">
                            <button 
                              onClick={() => validateProof(intent.id, true)}
                              disabled={loading}
                              className="bg-gradient-to-r from-[#00ff88] to-[#00b4d8] px-3 py-2 rounded-lg text-[#0a0e2a] font-bold text-sm disabled:opacity-50"
                            >
                              ✅ Approve (+25pts)
                            </button>
                            <button 
                              onClick={() => validateProof(intent.id, false)}
                              disabled={loading}
                              className="bg-gradient-to-r from-[#ff6b6b] to-[#ffa500] px-3 py-2 rounded-lg text-white font-bold text-sm disabled:opacity-50"
                            >
                              ❌ Reject (+25pts)
                            </button>
                          </div>
                        )}

                        {/* Already Validated */}
                        {intent.fulfilled && intent.validators?.includes(account?.toLowerCase()) && (
                          <div className="text-center text-sm text-[#48cae4] bg-[#0a0e2a]/30 px-3 py-2 rounded">
                            ✅ You validated this proof
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-[#48cae4]">
                  <div className="text-6xl mb-4">🌌</div>
                  <div className="text-xl font-semibold">No Intents Found</div>
                  <div className="text-[#e2f3f8] mt-2">Be the first to express economic value</div>
                  <button 
                    onClick={testConnection}
                    className="mt-4 bg-[#00b4d8] text-white px-4 py-2 rounded-lg"
                  >
                    🧪 Test Blockchain Connection
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}