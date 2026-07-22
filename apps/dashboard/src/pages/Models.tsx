import { useState, useCallback } from 'react';
import { PROVIDERS, OPENCODE_MODELS } from '@vestara/constants';
import { useProviders, useOllama, useOpenCodeStatus } from '../hooks/useProviders';
import { useToast } from '../contexts/ToastContext';
import { ModelStatsBar } from '../components/models/ModelStatsBar';
import { DefaultModelSelector } from '../components/models/DefaultModelSelector';
import { OpenCodeCard } from '../components/models/OpenCodeCard';
import { OllamaCard } from '../components/models/OllamaCard';
import { ProviderListCard } from '../components/models/ProviderListCard';
import { AddProviderDialog } from '../components/settings/AddProviderDialog';
import { ConfirmDialog } from '../components/ConfirmDialog';

export function Models() {
  const { addToast } = useToast();
  const {
    providers,
    loading: providersLoading,
    connectedCount,
    toggleProvider,
    addProvider,
    deleteProvider,
    testConnection,
    getProviderByType,
  } = useProviders();

  const ollama = useOllama();
  const opencode = useOpenCodeStatus();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Calculate stats
  const providerCount = providers.length + 2; // +2 for opencode and ollama (always present)
  const modelCount = OPENCODE_MODELS.length + (ollama.status?.models.length || 0);
  const localCount = ollama.status?.models.length || 0;

  const handleDelete = useCallback(async () => {
    if (!deleteId) return;
    const ok = await deleteProvider(deleteId);
    if (ok) addToast('Provider deleted');
    setDeleteId(null);
  }, [deleteId, deleteProvider, addToast]);

  if (providersLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-5 w-5 border-2 border-vestara-gold border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-vestara-text-muted">Loading providers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-vestara-text">Model Manager</h1>
        <p className="text-sm text-vestara-text-muted">Configure AI providers, manage models, and set defaults.</p>
      </div>

      {/* Stats */}
      <ModelStatsBar
        providerCount={providerCount}
        modelCount={modelCount}
        connectedCount={connectedCount + (opencode.status?.serverRunning ? 1 : 0) + (ollama.status?.running ? 1 : 0)}
        localCount={localCount}
      />

      {/* Default Model */}
      <DefaultModelSelector
        connectedProviders={providers.filter((p) => p.enabled).map((p) => p.type)}
      />

      {/* OpenCode */}
      <OpenCodeCard
        status={opencode.status}
        onStart={() => opencode.startServer()}
        onStop={() => opencode.stopServer()}
      />

      {/* Ollama */}
      <OllamaCard
        status={ollama.status}
        loading={ollama.loading}
        onPull={ollama.pullModel}
        onDelete={ollama.deleteModel}
        onStart={ollama.startServer}
        onStop={ollama.stopServer}
      />

      {/* Cloud Providers */}
      <ProviderListCard
        providers={providers}
        onToggle={toggleProvider}
        onDelete={(id) => setDeleteId(id)}
        onTest={testConnection}
        onAdd={() => setShowAddDialog(true)}
      />

      {/* Dialogs */}
      <AddProviderDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onAdded={() => addToast('Provider added')}
      />

      <ConfirmDialog
        open={deleteId !== null}
        title="Delete Provider"
        message="Are you sure you want to delete this provider? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
