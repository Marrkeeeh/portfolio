import { useAuth } from "@/contexts/AuthContext";
import {
    getSuppliesForUser,
    getSupplyHistory,
    updateSupplyStatus,
    type Supply,
    type SupplyHistoryEntry,
    type SupplyStatus,
} from "@/services/suppliesService";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

export interface UseSuppliesResult {
  supplies: Supply[];
  loading: boolean;
  updatingId: number | null;
  history: SupplyHistoryEntry[];
  refresh: () => Promise<void>;
  setSupplyStatus: (id: number, status: SupplyStatus) => Promise<void>;
  applyRemoteStatuses: (deviceId: number, statuses: Record<string, SupplyStatus>) => void;
}

export const useSupplies = (): UseSuppliesResult => {
  const { token } = useAuth();
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [history, setHistory] = useState<SupplyHistoryEntry[]>([]);

  const loadSupplies = useCallback(async () => {
    if (!token) {
      setSupplies([]);
      return;
    }

    setLoading(true);
    try {
      const response = await getSuppliesForUser(token);

      if (response.success && response.data?.supplies) {
        setSupplies(response.data.supplies);
      } else {
        setSupplies([]);
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadHistory = useCallback(async () => {
    if (!token) {
      setHistory([]);
      return;
    }

    try {
      const response = await getSupplyHistory(token);

      if (response.success && response.data?.history) {
        setHistory(response.data.history);
      } else {
        setHistory([]);
      }
    } catch {
      setHistory([]);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      void loadSupplies();
      void loadHistory();
    }, [loadSupplies, loadHistory]),
  );

  const setSupplyStatus = useCallback(
    async (id: number, status: SupplyStatus) => {
      if (!token) {
        return;
      }

      setUpdatingId(id);
      try {
        const response = await updateSupplyStatus(id, status, token);

        if (response.success && response.data?.supply) {
          const updated = response.data.supply;
          setSupplies((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
          await loadHistory();
        }
      } finally {
        setUpdatingId((current) => (current === id ? null : current));
      }
    },
    [token, loadHistory],
  );

  const refresh = useCallback(async () => {
    await Promise.all([loadSupplies(), loadHistory()]);
  }, [loadSupplies, loadHistory]);

  const applyRemoteStatuses = useCallback(
    (deviceId: number, statuses: Record<string, SupplyStatus>) => {
      if (!statuses) {
        return;
      }

      setSupplies((prev) =>
        prev.map((supply) => {
          if (supply.smart_device_id !== deviceId) {
            return supply;
          }

          const nextStatus = statuses[supply.type];

          if (!nextStatus || nextStatus === supply.status) {
            return supply;
          }

          return { ...supply, status: nextStatus };
        }),
      );
    },
    [],
  );

  return {
    supplies,
    loading,
    updatingId,
    history,
    refresh,
    setSupplyStatus,
    applyRemoteStatuses,
  };
};
