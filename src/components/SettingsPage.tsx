import React, { useState } from 'react';
import {
  AlertTriangle,
  Database,
  Download,
  HardDrive,
  RotateCcw,
} from 'lucide-react';
import { NeashAppState } from '../types/neash';
import { getLocalStorageBytes } from '../utils/storage';

interface SettingsPageProps {
  state: NeashAppState;
  onResetDemoData: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  state,
  onResetDemoData,
}) => {
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [resetDoneMessage, setResetDoneMessage] = useState(false);

  const storageBytes = getLocalStorageBytes();
  const storageKb = (storageBytes / 1024).toFixed(1);

  const handleExportWorkspace = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `neash-workspace-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="pb-5 border-b border-white/[0.07]">
        <h1 className="font-display text-2xl font-bold text-[#F8FAFC]">
          Settings & Data Transparency
        </h1>
        <p className="text-sm text-[#94A3B8] mt-1">
          Manage browser-local persistence, inspect demonstration boundaries, and reset workspace data.
        </p>
      </div>

      {resetDoneMessage && (
        <div className="p-4 rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/30 text-xs text-[#22C55E]">
          Workspace has been restored to the original NEASH demonstration dataset.
        </div>
      )}

      {/* Transparency Notice */}
      <section className="p-6 rounded-xl bg-[#111D30] border border-white/[0.07] space-y-3">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-[#60A5FA]" />
          <h2 className="font-display text-base font-semibold text-[#F8FAFC]">
            Prototype Architecture & Local Persistence
          </h2>
        </div>
        <div className="space-y-2 text-sm text-[#94A3B8] leading-relaxed">
          <p>
            NEASH stores projects, source metadata, extracted claims, human review decisions, edited claims, and generated handover reports in your browser&apos;s <span className="font-mono text-[#F8FAFC]">LocalStorage</span>.
          </p>
          <p>
            Refreshing the page preserves all your edits and verifications. Because this prototype operates strictly in browser-local storage without a remote database, <strong className="text-[#F8FAFC]">it does not support shared multi-user collaboration across devices</strong>.
          </p>
          <p>
            Preloaded project documents and sample extractions are explicitly labeled <span className="font-mono text-[#60A5FA]">DEMO DATA</span>. Real uploaded files (TXT, CSV, MD, JSON, and text-layer PDFs) are parsed locally in your browser without sending data to external APIs.
          </p>
        </div>
      </section>

      {/* Storage Metrics */}
      <section className="p-6 rounded-xl bg-[#111D30] border border-white/[0.07] space-y-4">
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-[#60A5FA]" />
          <h2 className="font-display text-base font-semibold text-[#F8FAFC]">
            Current Workspace Footprint
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-white/[0.06]">
          <div>
            <p className="text-xs text-[#94A3B8]">Projects</p>
            <p className="mt-1 font-mono text-lg font-semibold text-[#F8FAFC] tabular-nums">
              {state.projects.length}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#94A3B8]">Sources</p>
            <p className="mt-1 font-mono text-lg font-semibold text-[#F8FAFC] tabular-nums">
              {state.sources.length}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#94A3B8]">Extracted Claims</p>
            <p className="mt-1 font-mono text-lg font-semibold text-[#F8FAFC] tabular-nums">
              {state.claims.length}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#94A3B8]">LocalStorage Used</p>
            <p className="mt-1 font-mono text-lg font-semibold text-[#F8FAFC] tabular-nums">
              {storageKb} KB
            </p>
          </div>
        </div>
      </section>

      {/* Actions */}
      <section className="p-6 rounded-xl bg-[#111D30] border border-white/[0.07] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="font-display text-base font-semibold text-[#F8FAFC]">
            Workspace Maintenance
          </h2>
          <p className="text-xs text-[#94A3B8]">
            Export a JSON backup of your current state or reset everything back to the initial demo dataset.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleExportWorkspace}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-xs font-medium text-[#F8FAFC] cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON Backup</span>
          </button>

          <button
            type="button"
            onClick={() => setConfirmResetOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#EF4444]/15 hover:bg-[#EF4444]/25 text-xs font-semibold text-[#EF4444] cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo Data</span>
          </button>
        </div>
      </section>

      {/* Reset Confirmation Modal */}
      {confirmResetOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-[#111D30] border border-white/[0.1] rounded-xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-[#F59E0B]">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-display text-lg font-semibold text-[#F8FAFC]">
                Reset Demo Data?
              </h3>
            </div>
            <p className="text-sm text-[#94A3B8] leading-relaxed">
              This will clear all uploaded files, claim edits, and verification statuses from LocalStorage and restore the original NEASH demonstration dataset.
            </p>
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmResetOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.05] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onResetDemoData();
                  setConfirmResetOpen(false);
                  setResetDoneMessage(true);
                }}
                className="px-4 py-2 rounded-lg bg-[#EF4444] hover:bg-[#DC2626] text-xs font-semibold text-white cursor-pointer"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
