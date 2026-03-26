import React, { useState } from 'react';
import {
  Sparkles,
  Plus,
  Check,
  X,
  Eye,
  EyeOff,
  Copy,
  RefreshCw,
  Trash2,
  Settings,
  Zap,
  MessageSquare,
  Wand2,
  Brain,
  Shield,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  BarChart3,
  Crown,
  Edit3,
} from 'lucide-react';

interface AIProvider {
  id: string;
  name: string;
  type: 'openai' | 'anthropic' | 'google' | 'cohere' | 'custom';
  apiKey: string;
  isActive: boolean;
  isDefault: boolean;
  model: string;
  status: 'connected' | 'error' | 'testing';
  usage: {
    requests: number;
    tokens: number;
    cost: number;
  };
  addedAt: string;
  lastUsed: string;
}

export function AISettingsPage() {
  const [providers, setProviders] = useState<AIProvider[]>([
    {
      id: '1',
      name: 'OpenAI - Production',
      type: 'openai',
      apiKey: 'sk-proj-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz',
      isActive: true,
      isDefault: true,
      model: 'gpt-4-turbo',
      status: 'connected',
      usage: { requests: 1247, tokens: 342891, cost: 24.56 },
      addedAt: '2024-01-15T10:30:00Z',
      lastUsed: '2024-03-12T14:25:00Z',
    },
    {
      id: '2',
      name: 'Anthropic Claude',
      type: 'anthropic',
      apiKey: 'sk-ant-api03-xyz789abc456def123ghi890jkl567mno234pqr901stu678',
      isActive: true,
      isDefault: false,
      model: 'claude-3-opus-20240229',
      status: 'connected',
      usage: { requests: 523, tokens: 145672, cost: 18.32 },
      addedAt: '2024-02-01T09:15:00Z',
      lastUsed: '2024-03-12T13:10:00Z',
    },
    {
      id: '3',
      name: 'Google Gemini',
      type: 'google',
      apiKey: 'AIzaSyB1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9',
      isActive: false,
      isDefault: false,
      model: 'gemini-pro',
      status: 'connected',
      usage: { requests: 89, tokens: 23456, cost: 2.15 },
      addedAt: '2024-02-20T11:45:00Z',
      lastUsed: '2024-03-10T16:30:00Z',
    },
  ]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newProvider, setNewProvider] = useState({
    name: '',
    type: 'openai' as AIProvider['type'],
    apiKey: '',
    model: 'gpt-4-turbo',
  });

  const [featureAssignments, setFeatureAssignments] = useState({
    taskChatbot: '1',
    taskSuggestions: '1',
    smartSearch: '2',
    textAnalysis: '2',
  });

  const [showApiKey, setShowApiKey] = useState<{ [key: string]: boolean }>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const aiProviderConfigs = {
    openai: {
      name: 'OpenAI',
      color: 'emerald',
      icon: '🤖',
      models: ['gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo', 'gpt-4o'],
    },
    anthropic: {
      name: 'Anthropic',
      color: 'orange',
      icon: '🧠',
      models: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
    },
    google: {
      name: 'Google AI',
      color: 'blue',
      icon: '✨',
      models: ['gemini-pro', 'gemini-pro-vision', 'gemini-ultra'],
    },
    cohere: {
      name: 'Cohere',
      color: 'purple',
      icon: '💬',
      models: ['command', 'command-light', 'command-nightly'],
    },
    custom: {
      name: 'Custom API',
      color: 'slate',
      icon: '⚡',
      models: ['custom-model'],
    },
  };

  const handleAddProvider = () => {
    const provider: AIProvider = {
      id: Date.now().toString(),
      name: newProvider.name,
      type: newProvider.type,
      apiKey: newProvider.apiKey,
      isActive: true,
      isDefault: providers.length === 0,
      model: newProvider.model,
      status: 'testing',
      usage: { requests: 0, tokens: 0, cost: 0 },
      addedAt: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
    };

    setProviders([...providers, provider]);

    console.log('🤖 CODEX: AI Provider added', {
      providerId: provider.id,
      providerName: provider.name,
      providerType: provider.type,
      timestamp: new Date().toISOString(),
    });

    console.log('📡 MESSAGE COMMAND CENTER: New AI provider configured', {
      event: 'AI_PROVIDER_ADDED',
      provider: provider.name,
      type: provider.type,
      timestamp: new Date().toISOString(),
    });

    setShowAddModal(false);
    setNewProvider({ name: '', type: 'openai', apiKey: '', model: 'gpt-4-turbo' });
  };

  const handleDeleteProvider = (id: string) => {
    const provider = providers.find((p) => p.id === id);
    if (provider?.isDefault) {
      alert('Cannot delete the default provider. Please set another provider as default first.');
      return;
    }

    if (confirm(`Are you sure you want to delete "${provider?.name}"?`)) {
      setProviders(providers.filter((p) => p.id !== id));

      console.log('🗑️ CODEX: AI Provider deleted', {
        providerId: id,
        providerName: provider?.name,
        timestamp: new Date().toISOString(),
      });

      console.log('📡 MESSAGE COMMAND CENTER: AI provider removed', {
        event: 'AI_PROVIDER_DELETED',
        provider: provider?.name,
        timestamp: new Date().toISOString(),
      });
    }
  };

  const handleSetDefault = (id: string) => {
    setProviders(
      providers.map((p) => ({
        ...p,
        isDefault: p.id === id,
      }))
    );

    const provider = providers.find((p) => p.id === id);
    console.log('⭐ CODEX: Default AI provider changed', {
      providerId: id,
      providerName: provider?.name,
      timestamp: new Date().toISOString(),
    });
  };

  const handleToggleActive = (id: string) => {
    setProviders(
      providers.map((p) => (p.id === id ? { ...p, isActive: !p.isActive } : p))
    );

    const provider = providers.find((p) => p.id === id);
    console.log('🔄 CODEX: AI Provider toggled', {
      providerId: id,
      providerName: provider?.name,
      isActive: !provider?.isActive,
      timestamp: new Date().toISOString(),
    });
  };

  const handleTestConnection = (id: string) => {
    const provider = providers.find((p) => p.id === id);
    
    setProviders(
      providers.map((p) => (p.id === id ? { ...p, status: 'testing' } : p))
    );

    console.log('🧪 CODEX: Testing AI provider connection', {
      providerId: id,
      providerName: provider?.name,
      timestamp: new Date().toISOString(),
    });

    console.log('📡 MESSAGE COMMAND CENTER: AI connection test initiated', {
      event: 'AI_CONNECTION_TEST',
      provider: provider?.name,
      timestamp: new Date().toISOString(),
    });

    // Simulate API test
    setTimeout(() => {
      setProviders(
        providers.map((p) => (p.id === id ? { ...p, status: 'connected' } : p))
      );
      alert(`✅ Connection successful to ${provider?.name}!`);
    }, 2000);
  };

  const handleCopyApiKey = (apiKey: string, id: string) => {
    navigator.clipboard.writeText(apiKey);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const toggleShowApiKey = (id: string) => {
    setShowApiKey({ ...showApiKey, [id]: !showApiKey[id] });
  };

  const totalUsage = providers.reduce(
    (acc, p) => ({
      requests: acc.requests + p.usage.requests,
      tokens: acc.tokens + p.usage.tokens,
      cost: acc.cost + p.usage.cost,
    }),
    { requests: 0, tokens: 0, cost: 0 }
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center shadow-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">AI Configuration</h1>
              <p className="text-sm text-slate-500">Manage AI providers and configure intelligent features</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-3 py-1.5 rounded-lg bg-amber-100 border border-amber-200 text-xs font-bold text-amber-700 flex items-center gap-1">
              <Crown className="w-3 h-3" />
              Admin Only
            </span>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
            >
              <Plus className="w-4 h-4" />
              Add AI Provider
            </button>
          </div>
        </div>
      </div>

      {/* Usage Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl border-2 border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Total Requests</p>
              <p className="text-2xl font-bold text-slate-900">{totalUsage.requests.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border-2 border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Brain className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Tokens Used</p>
              <p className="text-2xl font-bold text-slate-900">{totalUsage.tokens.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border-2 border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Zap className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Total Cost</p>
              <p className="text-2xl font-bold text-slate-900">${totalUsage.cost.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* AI Providers */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-slate-900 mb-4">AI Providers</h2>
        <div className="space-y-4">
          {providers.map((provider) => {
            const config = aiProviderConfigs[provider.type];
            const colorClasses = {
              emerald: 'from-emerald-500 to-teal-500',
              orange: 'from-orange-500 to-rose-500',
              blue: 'from-blue-500 to-indigo-500',
              purple: 'from-purple-500 to-pink-500',
              slate: 'from-slate-500 to-gray-500',
            };

            return (
              <div
                key={provider.id}
                className={`bg-white rounded-2xl border-2 p-6 transition-all ${
                  provider.isActive ? 'border-slate-200' : 'border-slate-200 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-14 h-14 rounded-xl bg-gradient-to-br ${
                        colorClasses[config.color as keyof typeof colorClasses]
                      } flex items-center justify-center text-2xl shadow-lg`}
                    >
                      {config.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold text-slate-900">{provider.name}</h3>
                        {provider.isDefault && (
                          <span className="px-2 py-1 rounded-md bg-amber-100 border border-amber-200 text-xs font-bold text-amber-700 flex items-center gap-1">
                            <Crown className="w-3 h-3" />
                            Default
                          </span>
                        )}
                        {provider.status === 'connected' && (
                          <span className="px-2 py-1 rounded-md bg-emerald-100 border border-emerald-200 text-xs font-bold text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Connected
                          </span>
                        )}
                        {provider.status === 'testing' && (
                          <span className="px-2 py-1 rounded-md bg-blue-100 border border-blue-200 text-xs font-bold text-blue-700 flex items-center gap-1">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            Testing...
                          </span>
                        )}
                        {provider.status === 'error' && (
                          <span className="px-2 py-1 rounded-md bg-rose-100 border border-rose-200 text-xs font-bold text-rose-700 flex items-center gap-1">
                            <XCircle className="w-3 h-3" />
                            Error
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        {config.name} • Model: <span className="font-mono font-semibold">{provider.model}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={provider.isActive}
                        onChange={() => handleToggleActive(provider.id)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-100 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-indigo-600 peer-checked:to-purple-600"></div>
                    </label>
                  </div>
                </div>

                {/* API Key */}
                <div className="mb-4">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">
                    API Key
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        type={showApiKey[provider.id] ? 'text' : 'password'}
                        value={provider.apiKey}
                        readOnly
                        className="w-full px-4 py-3 pr-12 rounded-xl border-2 border-slate-200 bg-slate-50 text-sm font-mono"
                      />
                      <button
                        onClick={() => toggleShowApiKey(provider.id)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showApiKey[provider.id] ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <button
                      onClick={() => handleCopyApiKey(provider.apiKey, provider.id)}
                      className="px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 border-2 border-slate-200 text-slate-700 font-semibold transition-all"
                    >
                      {copiedKey === provider.id ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Usage Stats */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-xs text-slate-500 mb-1">Requests</p>
                    <p className="text-lg font-bold text-slate-900">{provider.usage.requests.toLocaleString()}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-xs text-slate-500 mb-1">Tokens</p>
                    <p className="text-lg font-bold text-slate-900">{provider.usage.tokens.toLocaleString()}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-xs text-slate-500 mb-1">Cost</p>
                    <p className="text-lg font-bold text-slate-900">${provider.usage.cost.toFixed(2)}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleTestConnection(provider.id)}
                    disabled={!provider.isActive || provider.status === 'testing'}
                    className="flex-1 px-4 py-2 rounded-lg bg-blue-100 hover:bg-blue-200 border-2 border-blue-200 text-blue-700 font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <RefreshCw className={`w-4 h-4 ${provider.status === 'testing' ? 'animate-spin' : ''}`} />
                    Test Connection
                  </button>
                  {!provider.isDefault && (
                    <button
                      onClick={() => handleSetDefault(provider.id)}
                      className="flex-1 px-4 py-2 rounded-lg bg-amber-100 hover:bg-amber-200 border-2 border-amber-200 text-amber-700 font-semibold transition-all flex items-center justify-center gap-2"
                    >
                      <Crown className="w-4 h-4" />
                      Set as Default
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteProvider(provider.id)}
                    disabled={provider.isDefault}
                    className="px-4 py-2 rounded-lg bg-rose-100 hover:bg-rose-200 border-2 border-rose-200 text-rose-700 font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Feature Assignments */}
      <div className="bg-white rounded-2xl border-2 border-slate-200 p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-indigo-600" />
          AI Feature Assignments
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          Configure which AI provider handles each intelligent feature
        </p>

        <div className="space-y-4">
          {[
            {
              key: 'taskChatbot',
              label: 'Task Creation Chatbot',
              description: 'AI-powered conversational task creation',
              icon: MessageSquare,
            },
            {
              key: 'taskSuggestions',
              label: 'Smart Task Suggestions',
              description: 'Intelligent task recommendations and auto-complete',
              icon: Sparkles,
            },
            {
              key: 'smartSearch',
              label: 'Smart Search',
              description: 'Natural language search and semantic understanding',
              icon: Brain,
            },
            {
              key: 'textAnalysis',
              label: 'Text Analysis',
              description: 'Content analysis, summarization, and insights',
              icon: Zap,
            },
          ].map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.key}
                className="flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 hover:border-indigo-200 transition-all"
              >
                <div className="w-12 h-12 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900 mb-1">{feature.label}</p>
                  <p className="text-xs text-slate-500">{feature.description}</p>
                </div>
                <select
                  value={featureAssignments[feature.key as keyof typeof featureAssignments]}
                  onChange={(e) =>
                    setFeatureAssignments({
                      ...featureAssignments,
                      [feature.key]: e.target.value,
                    })
                  }
                  className="px-4 py-2 rounded-lg border-2 border-slate-200 text-sm font-medium focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none min-w-[200px]"
                >
                  {providers
                    .filter((p) => p.isActive)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Provider Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Add AI Provider</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Provider Type */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">
                  Provider Type
                </label>
                <select
                  value={newProvider.type}
                  onChange={(e) => {
                    const type = e.target.value as AIProvider['type'];
                    const defaultModel = aiProviderConfigs[type].models[0];
                    setNewProvider({ ...newProvider, type, model: defaultModel });
                  }}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none transition-all text-sm"
                >
                  {Object.entries(aiProviderConfigs).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.icon} {config.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Provider Name */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">
                  Provider Name
                </label>
                <input
                  type="text"
                  value={newProvider.name}
                  onChange={(e) => setNewProvider({ ...newProvider, name: e.target.value })}
                  placeholder="e.g., OpenAI - Development"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none transition-all text-sm"
                />
              </div>

              {/* Model */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">
                  Model
                </label>
                <select
                  value={newProvider.model}
                  onChange={(e) => setNewProvider({ ...newProvider, model: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none transition-all text-sm"
                >
                  {aiProviderConfigs[newProvider.type].models.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </div>

              {/* API Key */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">
                  API Key
                </label>
                <input
                  type="password"
                  value={newProvider.apiKey}
                  onChange={(e) => setNewProvider({ ...newProvider, apiKey: e.target.value })}
                  placeholder="Enter your API key"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none transition-all text-sm font-mono"
                />
              </div>

              {/* Info */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-blue-700">
                    <p className="font-bold mb-1">Keep your API keys secure</p>
                    <p>Never share your API keys publicly or commit them to version control.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 border-2 border-slate-200 text-slate-700 font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleAddProvider}
                disabled={!newProvider.name || !newProvider.apiKey}
                className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              >
                Add Provider
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
