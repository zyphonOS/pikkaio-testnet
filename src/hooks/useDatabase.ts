// hooks/useDatabase.ts
import { useState, useEffect, useCallback } from 'react'

interface SessionData {
  activeTab?: string
  intentDescription?: string
  stakeAmount?: string
  lastIntentId?: number
}

interface Preferences {
  theme: string
  notifications: boolean
  autoConnect: boolean
}

export function useDatabase(walletAddress: string | null) {
  const [sessionData, setSessionData] = useState<SessionData>({})
  const [preferences, setPreferences] = useState<Preferences>({
    theme: 'dark',
    notifications: true,
    autoConnect: false
  })
  const [loading, setLoading] = useState(false)

  // Load user session and preferences
  const loadUserData = useCallback(async () => {
    if (!walletAddress) return

    setLoading(true)
    try {
      // Load session data
      const sessionResponse = await fetch(`/api/session?walletAddress=${walletAddress}`)
      const sessionResult = await sessionResponse.json()
      
      if (sessionResult.success && sessionResult.data) {
        setSessionData(sessionResult.data.ui_state || {})
      }

      // Load preferences
      const prefsResponse = await fetch(`/api/preferences?walletAddress=${walletAddress}`)
      const prefsResult = await prefsResponse.json()
      
      if (prefsResult.success && prefsResult.data) {
        setPreferences(prefsResult.data)
      }
    } catch (error) {
      console.error('Error loading user data:', error)
    } finally {
      setLoading(false)
    }
  }, [walletAddress])

  // Save session data
  const saveSession = useCallback(async (data: SessionData) => {
    if (!walletAddress) return

    try {
      const newSessionData = { ...sessionData, ...data }
      setSessionData(newSessionData)

      await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          uiState: newSessionData
        })
      })
    } catch (error) {
      console.error('Error saving session:', error)
    }
  }, [walletAddress, sessionData])

  // Save preferences
  const savePreferences = useCallback(async (newPreferences: Partial<Preferences>) => {
    if (!walletAddress) return

    try {
      const updatedPreferences = { ...preferences, ...newPreferences }
      setPreferences(updatedPreferences)

      await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          ...updatedPreferences
        })
      })
    } catch (error) {
      console.error('Error saving preferences:', error)
    }
  }, [walletAddress, preferences])

  // Store proof metadata
  const storeProofMetadata = useCallback(async (intentId: number, proofHash: string, metadata: any) => {
    try {
      await fetch('/api/proofs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intentId,
          proofHash,
          metadata
        })
      })
    } catch (error) {
      console.error('Error storing proof metadata:', error)
    }
  }, [])

  // Store validation metadata
  const storeValidationMetadata = useCallback(async (intentId: number, validatorAddress: string, vote: boolean, comment?: string) => {
    try {
      await fetch('/api/validations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intentId,
          validatorAddress,
          vote,
          comment
        })
      })
    } catch (error) {
      console.error('Error storing validation metadata:', error)
    }
  }, [])

  // Load proof metadata for an intent
  const loadProofMetadata = useCallback(async (intentId: number) => {
    try {
      const response = await fetch(`/api/proofs?intentId=${intentId}`)
      const result = await response.json()
      return result.success ? result.data : []
    } catch (error) {
      console.error('Error loading proof metadata:', error)
      return []
    }
  }, [])

  // Load validation metadata
  const loadValidationMetadata = useCallback(async (intentId?: number, validatorAddress?: string) => {
    try {
      let url = '/api/validations?'
      if (intentId) url += `intentId=${intentId}&`
      if (validatorAddress) url += `validatorAddress=${validatorAddress}`
      
      const response = await fetch(url)
      const result = await response.json()
      return result.success ? result.data : []
    } catch (error) {
      console.error('Error loading validation metadata:', error)
      return []
    }
  }, [])

  useEffect(() => {
    loadUserData()
  }, [loadUserData])

  return {
    sessionData,
    preferences,
    loading,
    saveSession,
    savePreferences,
    storeProofMetadata,
    storeValidationMetadata,
    loadProofMetadata,
    loadValidationMetadata
  }
}