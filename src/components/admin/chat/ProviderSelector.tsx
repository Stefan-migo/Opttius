'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Check, ChevronDown } from 'lucide-react'
import type { LLMProvider } from '@/lib/ai/types'

interface ProviderSelectorProps {
  selectedProvider?: LLMProvider
  onProviderChange: (provider: LLMProvider) => void
}

export function ProviderSelector({ selectedProvider, onProviderChange }: ProviderSelectorProps) {
  const [providers, setProviders] = useState<{ id: LLMProvider; name: string; enabled: boolean }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const response = await fetch('/api/admin/chat/providers')
        if (response.ok) {
          const data = await response.json()
          setProviders(data.providers || [])
        }
      } catch (error) {
        console.error('Error fetching providers:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProviders()
  }, [])

  const providerNames: Record<LLMProvider, string> = {
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    google: 'Google',
    deepseek: 'DeepSeek',
    openrouter: 'OpenRouter',
    kilocode: 'Kilocode',
    minimax: 'Minimax',
    custom: 'Custom'
  }

  const enabledProviders = providers.filter(p => p.enabled)
  const currentProvider = providers.find(p => p.id === selectedProvider) || enabledProviders[0]

  if (loading) {
    return <div className="text-sm text-admin-text-secondary">Cargando...</div>
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          {currentProvider ? providerNames[currentProvider.id] : 'Seleccionar'}
          <ChevronDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Proveedor de IA</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {enabledProviders.map((provider) => (
          <DropdownMenuItem
            key={provider.id}
            onClick={() => onProviderChange(provider.id)}
            className="flex items-center justify-between"
          >
            <span>{providerNames[provider.id]}</span>
            {selectedProvider === provider.id && (
              <Check className="w-4 h-4" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
