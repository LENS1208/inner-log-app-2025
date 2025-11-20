import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import type { AIResponse, TradeRow } from '../services/ai-coaching/types';
import { callAutoReviewAI } from '../services/ai-coaching/callAutoReviewAI';
import { getCoachingJob, saveCoachingJob, deleteCoachingJob, getUserSettings } from './db.service';
import { supabase } from './supabase';

interface CoachingTask {
  dataset: string;
  status: 'running' | 'completed' | 'failed';
  result?: AIResponse;
  error?: string;
}

interface AICoachingContextType {
  currentTask: CoachingTask | null;
  startGeneration: (dataset: string, dataRows: TradeRow[]) => Promise<void>;
  getResult: (dataset: string) => AIResponse | null;
  isGenerating: (dataset: string) => boolean;
  clearResult: (dataset: string) => void;
  loadCachedResult: (dataset: string) => Promise<void>;
}

const AICoachingContext = createContext<AICoachingContextType | undefined>(undefined);

export function AICoachingProvider({ children }: { children: React.ReactNode }) {
  const [currentTask, setCurrentTask] = useState<CoachingTask | null>(null);
  const [completedResults, setCompletedResults] = useState<Map<string, AIResponse>>(new Map());
  const [loadedDatasets, setLoadedDatasets] = useState<Set<string>>(new Set());
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadCachedResult = useCallback(async (dataset: string) => {
    if (loadedDatasets.has(dataset)) {
      return;
    }

    try {
      const cached = await getCoachingJob(dataset);
      if (cached && cached.status === 'completed' && cached.result) {
        console.log('📦 キャッシュから読み込み:', dataset);
        setCompletedResults(prev => {
          const newMap = new Map(prev);
          newMap.set(dataset, cached.result);
          return newMap;
        });
      }
      setLoadedDatasets(prev => new Set(prev).add(dataset));
    } catch (error) {
      console.error('❌ キャッシュ読み込みエラー:', error);
      setLoadedDatasets(prev => new Set(prev).add(dataset));
    }
  }, [loadedDatasets]);

  const startGeneration = useCallback(async (dataset: string, dataRows: TradeRow[]) => {
    if (currentTask?.status === 'running') {
      console.warn('既に生成中です');
      return;
    }

    console.log('🚀 バックグラウンドでAI分析を開始:', dataset);

    setCurrentTask({
      dataset,
      status: 'running',
    });

    abortControllerRef.current = new AbortController();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      let coachAvatarPreset = 'teacher';

      if (user) {
        const settings = await getUserSettings(user.id);
        if (settings?.coach_avatar_preset) {
          coachAvatarPreset = settings.coach_avatar_preset;
        }
      }

      const result = await callAutoReviewAI(dataRows, {
        coachAvatarPreset,
      });

      console.log('✅ AI分析完了:', dataset);

      await saveCoachingJob(dataset, result);

      setCompletedResults(prev => {
        const newMap = new Map(prev);
        newMap.set(dataset, result);
        return newMap;
      });

      setCurrentTask({
        dataset,
        status: 'completed',
        result,
      });

      setTimeout(() => {
        setCurrentTask(null);
      }, 3000);

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('⚠️ AI分析がキャンセルされました');
        setCurrentTask(null);
        return;
      }

      console.error('❌ AI分析エラー:', error);

      setCurrentTask({
        dataset,
        status: 'failed',
        error: error.message || 'AI分析に失敗しました',
      });

      setTimeout(() => {
        setCurrentTask(null);
      }, 5000);
    }
  }, [currentTask]);

  const getResult = useCallback((dataset: string): AIResponse | null => {
    return completedResults.get(dataset) || null;
  }, [completedResults]);

  const isGenerating = useCallback((dataset: string): boolean => {
    return currentTask?.dataset === dataset && currentTask.status === 'running';
  }, [currentTask]);

  const clearResult = useCallback(async (dataset: string) => {
    try {
      await deleteCoachingJob(dataset);
    } catch (error) {
      console.error('❌ キャッシュ削除エラー:', error);
    }

    setCompletedResults(prev => {
      const newMap = new Map(prev);
      newMap.delete(dataset);
      return newMap;
    });

    setLoadedDatasets(prev => {
      const newSet = new Set(prev);
      newSet.delete(dataset);
      return newSet;
    });
  }, []);

  return (
    <AICoachingContext.Provider
      value={{
        currentTask,
        startGeneration,
        getResult,
        isGenerating,
        clearResult,
        loadCachedResult,
      }}
    >
      {children}
    </AICoachingContext.Provider>
  );
}

export function useAICoaching() {
  const context = useContext(AICoachingContext);
  if (!context) {
    throw new Error('useAICoaching must be used within AICoachingProvider');
  }
  return context;
}
