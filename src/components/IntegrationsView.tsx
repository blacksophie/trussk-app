import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, AlertCircle, RefreshCw, Link2, FlaskConical, RotateCcw } from 'lucide-react';
import { signInWithGoogle, signInWithMicrosoft, saveTokenToDB, auth } from '../lib/firebase';

interface TokenStatus {
  captured: boolean;
  preview: string | null;
}

function readStatus(provider: 'google' | 'microsoft'): TokenStatus {
  const raw = sessionStorage.getItem(`token:${provider}`);
  return { captured: !!raw, preview: raw ? raw.slice(0, 20) + '…' : null };
}

// Returns true if the signed-in user has this provider linked (regardless of token)
function isProviderLinked(providerId: 'google.com' | 'microsoft.com'): boolean {
  return auth.currentUser?.providerData.some(p => p.providerId === providerId) ?? false;
}

interface StatusRowProps {
  provider: 'Google' | 'Microsoft';
  icon: React.ReactNode;
  status: TokenStatus;
  isLinked: boolean;
  scopes: string[];
  onConnect?: () => void;
  onReconnect?: () => void;
  connecting?: boolean;
}

function StatusRow({ provider, icon, status, isLinked, scopes, onConnect, onReconnect, connecting }: StatusRowProps) {
  return (
    <div className="flex items-start justify-between p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div>
          <p className="text-[14px] font-semibold text-gray-900">{provider}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{scopes.join(' · ')}</p>
          {status.preview && (
            <p className="text-[10px] font-mono text-gray-400 mt-1">Token: {status.preview}</p>
          )}
          {isLinked && !status.captured && (
            <p className="text-[10px] text-amber-600 mt-1">Signed in — reconnect to capture token</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {status.captured ? (
          <>
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
              <CheckCircle2 className="w-3 h-3" />
              Connected
            </span>
            {onReconnect && (
              <button
                onClick={onReconnect}
                disabled={connecting}
                title="Reconnect to refresh token or add new scopes"
                className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 bg-gray-50 border border-gray-200 px-2.5 py-1.5 rounded-full hover:bg-gray-100 hover:text-gray-700 transition-colors disabled:opacity-50"
              >
                {connecting ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full" />
                ) : (
                  <RotateCcw className="w-3 h-3" />
                )}
                {connecting ? 'Reconnecting…' : 'Reconnect'}
              </button>
            )}
          </>
        ) : isLinked && onReconnect ? (
          <button
            onClick={onReconnect}
            disabled={connecting}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-full hover:bg-amber-100 transition-colors disabled:opacity-50"
          >
            {connecting ? (
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-3 h-3 border-2 border-amber-300 border-t-amber-700 rounded-full" />
            ) : (
              <RotateCcw className="w-3 h-3" />
            )}
            {connecting ? 'Reconnecting…' : 'Reconnect'}
          </button>
        ) : onConnect ? (
          <button
            onClick={onConnect}
            disabled={connecting}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-brand bg-orange-50 border border-orange-200 px-2.5 py-1.5 rounded-full hover:bg-orange-100 transition-colors disabled:opacity-50"
          >
            {connecting ? (
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-3 h-3 border-2 border-brand/30 border-t-brand rounded-full" />
            ) : (
              <Link2 className="w-3 h-3" />
            )}
            {connecting ? 'Connecting…' : 'Connect'}
          </button>
        ) : (
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-400 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full">
            <AlertCircle className="w-3 h-3" />
            Not connected
          </span>
        )}
      </div>
    </div>
  );
}

export function IntegrationsView() {
  const [googleStatus, setGoogleStatus] = useState<TokenStatus>(readStatus('google'));
  const [msStatus, setMsStatus] = useState<TokenStatus>(readStatus('microsoft'));
  const [googleLinked, setGoogleLinked] = useState(false);
  const [googleConnecting, setGoogleConnecting] = useState(false);
  const [msConnecting, setMsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pipelineResult, setPipelineResult] = useState<string | null>(null);
  const [pipelineTesting, setPipelineTesting] = useState(false);

  useEffect(() => {
    setGoogleStatus(readStatus('google'));
    setMsStatus(readStatus('microsoft'));
    setGoogleLinked(isProviderLinked('google.com'));
  }, []);

  // Reconnect Google — re-triggers popup with consent to get a fresh access token
  const handleReconnectGoogle = async () => {
    setError(null);
    setGoogleConnecting(true);
    try {
      const { result, accessToken } = await signInWithGoogle();
      if (accessToken) {
        await saveTokenToDB(result.user.uid, 'google', accessToken);
        setGoogleStatus(readStatus('google'));
        setGoogleLinked(true);
      } else {
        setError('Google returned a null token. Try signing out fully and signing back in.');
      }
    } catch (e: any) {
      setError(e?.message ?? 'Failed to reconnect Google.');
    } finally {
      setGoogleConnecting(false);
    }
  };

  const handleConnectOutlook = async () => {
    setError(null);
    setMsConnecting(true);
    try {
      const msResult = await signInWithMicrosoft();
      const uid = auth.currentUser?.uid ?? msResult.account?.localAccountId ?? 'ms-anon';
      await saveTokenToDB(uid, 'microsoft', msResult.accessToken);
      setMsStatus(readStatus('microsoft'));
    } catch (e: any) {
      setError(e?.message ?? 'Failed to connect Outlook.');
    } finally {
      setMsConnecting(false);
    }
  };

  const handleTestPipeline = async () => {
    setPipelineResult(null);
    setPipelineTesting(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) { setPipelineResult('Error: not signed in.'); return; }

      const res = await fetch('/api/fetch-threads?maxResults=3', {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const json = await res.json();

      if (!res.ok) {
        setPipelineResult(`${res.status} — ${json.error}\n${json.message}`);
      } else {
        const count = json.threads?.length ?? (json.id ? 1 : 0);
        const preview = JSON.stringify(json, null, 2).slice(0, 800);
        setPipelineResult(`✓ ${count} thread(s) returned.\n\n${preview}${preview.length >= 800 ? '\n…' : ''}`);
      }
    } catch (e: any) {
      setPipelineResult(`Fetch error: ${e.message}`);
    } finally {
      setPipelineTesting(false);
    }
  };

  const googleIcon = <img src="https://www.google.com/favicon.ico" alt="G" className="w-4 h-4" />;
  const msIcon = (
    <svg viewBox="0 0 21 21" className="w-4 h-4" fill="none">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );

  return (
    <div className="h-full overflow-y-auto p-6 bg-gray-50">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-[20px] font-bold text-gray-900 tracking-tight">Integrations</h1>
          <p className="text-[13px] text-gray-500 mt-1">
            Connect your email and calendar so Trussk can sync interviews and threads.
          </p>
        </div>

        <div className="space-y-3 mb-6">
          <StatusRow
            provider="Google"
            icon={googleIcon}
            status={googleStatus}
            isLinked={googleLinked}
            scopes={['gmail.readonly', 'calendar.readonly', 'calendar.events']}
            onReconnect={handleReconnectGoogle}
            connecting={googleConnecting}
          />
          <StatusRow
            provider="Microsoft"
            icon={msIcon}
            status={msStatus}
            isLinked={isProviderLinked('microsoft.com')}
            scopes={['Mail.Read', 'Calendars.Read']}
            onConnect={!msStatus.captured ? handleConnectOutlook : undefined}
            connecting={msConnecting}
          />
        </div>

        {error && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-[12px] text-red-600 mb-4"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </motion.div>
        )}

        {/* Utility row */}
        <div className="flex items-center gap-4 mb-3">
          <button
            onClick={() => {
              setGoogleStatus(readStatus('google'));
              setMsStatus(readStatus('microsoft'));
              setGoogleLinked(isProviderLinked('google.com'));
            }}
            className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh status
          </button>

          {/* Test button always visible when signed in — server will report missing token clearly */}
          {auth.currentUser && (
            <button
              onClick={handleTestPipeline}
              disabled={pipelineTesting}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-full hover:bg-indigo-100 transition-colors disabled:opacity-50"
            >
              {pipelineTesting ? (
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-3 h-3 border-2 border-indigo-200 border-t-indigo-600 rounded-full" />
              ) : (
                <FlaskConical className="w-3 h-3" />
              )}
              {pipelineTesting ? 'Calling Gmail API…' : 'Test Gmail pipeline'}
            </button>
          )}
        </div>

        {pipelineResult && (
          <motion.pre initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            className="mt-2 p-3 bg-gray-900 text-emerald-400 rounded-xl text-[11px] font-mono overflow-x-auto whitespace-pre-wrap"
          >
            {pipelineResult}
          </motion.pre>
        )}
      </div>
    </div>
  );
}
