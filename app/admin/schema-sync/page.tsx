'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, AlertCircle, Loader2, Database } from 'lucide-react';

export default function SchemaSyncPage() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [stats, setStats] = useState({ total: 0, processed: 0, updated: 0, created: 0, errors: 0 });

  const addLog = (msg: string) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);

  const runSync = async () => {
    setIsSyncing(true);
    setProgress(0);
    setLogs([]);
    setStats({ total: 0, processed: 0, updated: 0, created: 0, errors: 0 });
    addLog("Starting schema synchronization...");

    let offset = 0;
    const limit = 10;
    let keepGoing = true;

    try {
      while (keepGoing) {
        addLog(`Processing batch: offset ${offset}...`);
        
        const res = await fetch('/api/admin/sync-schema-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ offset, limit })
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to fetch batch');
        }

        const data = await res.json();
        const { total, results } = data;

        // Update stats
        let newUpdated = 0;
        let newCreated = 0;
        let newErrors = 0;

        results.forEach((r: any) => {
          if (r.status === 'updated') {
            newUpdated++;
            addLog(`✅ Updated table ${r.table}: Added columns [${r.columnsAdded.join(', ')}]`);
          } else if (r.status === 'created') {
            newCreated++;
            addLog(`✨ Created table ${r.table}`);
          } else if (r.status.startsWith('error')) {
            newErrors++;
            addLog(`❌ Error on table ${r.table}: ${r.error}`);
          }
        });

        setStats(prev => ({
          total,
          processed: prev.processed + results.length,
          updated: prev.updated + newUpdated,
          created: prev.created + newCreated,
          errors: prev.errors + newErrors
        }));

        const currentProgress = Math.min(100, Math.round(((offset + results.length) / total) * 100));
        setProgress(currentProgress);

        if (offset + results.length >= total || results.length === 0) {
          keepGoing = false;
        } else {
          offset += limit;
        }
      }
      addLog("Synchronization complete!");
    } catch (error: any) {
      addLog(`❌ Critical Error: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="container mx-auto py-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Database Schema Synchronization</h1>
          <p className="text-muted-foreground mt-2">
            Sync local PostgreSQL schema with Neon Serverless (Source of Truth).
          </p>
        </div>
        <Button onClick={runSync} disabled={isSyncing} size="lg">
          {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
          {isSyncing ? 'Syncing...' : 'Start Full Sync'}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Tables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total || '-'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Processed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.processed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tables Created</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.created}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tables Updated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.updated}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Progress</CardTitle>
          <CardDescription>Synchronizing 146 tables...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={progress} className="h-4" />
          <p className="text-sm text-muted-foreground text-right">{progress}% Complete</p>
        </CardContent>
      </Card>

      <Card className="flex-1">
        <CardHeader>
          <CardTitle>Sync Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] w-full rounded-md border p-4 bg-slate-950 text-slate-50 font-mono text-sm">
            {logs.length === 0 ? (
              <div className="text-slate-500 italic">Ready to start...</div>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
