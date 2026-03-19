import { useEffect, useState } from "react";
import { Redo2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { adminLogout, getAdminJwt, isAdmin } from "@/auth/adminAuth";
import { Button } from "@/components/ui/button";

type HistoryItem = {
  id: number;
  created_at: string;
};

interface HistoryModalProps {
  reloadState?: () => Promise<boolean> | Promise<void>;
}

const HISTORY_ACTIVE_KEY = "historyActiveId";

export default function HistoryModal({ reloadState }: HistoryModalProps) {
  const admin = isAdmin();
  const [historyStack, setHistoryStack] = useState<HistoryItem[]>([]);
  const [historyPointer, setHistoryPointer] = useState(-1);
  const [activeHistoryId, setActiveHistoryId] = useState<number | null>(() => {
    try {
      const stored = sessionStorage.getItem(HISTORY_ACTIVE_KEY);
      const parsed = stored ? Number(stored) : NaN;
      return Number.isFinite(parsed) ? parsed : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);
  const [busyAction, setBusyAction] = useState<"undo" | "redo" | null>(null);

  const handleAdminExpired = () => {
    adminLogout();
    alert("Sessao expirada. Entre como admin novamente.");
  };

  const fetchHistory = async (desiredActiveId?: number | null) => {
    const token = getAdminJwt();
    if (!token) {
      handleAdminExpired();
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/.netlify/functions/list-history", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 401) {
        handleAdminExpired();
        return;
      }

      if (!res.ok) {
        const text = await res.text();
        console.error("Erro ao carregar historico:", text);
        toast.error("Nao foi possivel carregar o historico.");
        return;
      }

      const payload = await res.json();
      const nextItems: HistoryItem[] = Array.isArray(payload?.items) ? payload.items : [];
      setHistoryStack(nextItems);

      const activeId = typeof desiredActiveId !== "undefined" ? desiredActiveId : activeHistoryId;
      if (activeId) {
        const index = nextItems.findIndex((item) => item.id === activeId);
        if (index >= 0) {
          setHistoryPointer(index);
          setActiveHistoryId(activeId);
          return;
        }
        setHistoryPointer(-1);
        setActiveHistoryId(null);
        return;
      }

      setHistoryPointer(-1);
    } catch (err) {
      console.error("Erro ao carregar historico:", err);
      toast.error("Nao foi possivel carregar o historico.");
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreHistory = async (historyId: number, action: "undo" | "redo") => {
    const token = getAdminJwt();
    if (!token) {
      handleAdminExpired();
      return;
    }

    setBusyAction(action);

    try {
      const res = await fetch("/.netlify/functions/restore-history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ historyId }),
      });

      if (res.status === 401) {
        handleAdminExpired();
        return;
      }

      if (!res.ok) {
        const text = await res.text();
        console.error("Erro ao restaurar historico:", text);
        toast.error("Nao foi possivel restaurar a versao.");
        return;
      }

      if (reloadState) {
        await reloadState();
      }

      setActiveHistoryId(historyId);
      await fetchHistory(historyId);
      toast.success(action === "undo" ? "Desfazer aplicado." : "Refazer aplicado.");
    } catch (err) {
      console.error("Erro ao restaurar historico:", err);
      toast.error("Nao foi possivel restaurar a versao.");
    } finally {
      setBusyAction(null);
    }
  };

  useEffect(() => {
    if (!admin) return;
    fetchHistory();
  }, [admin]);

  useEffect(() => {
    try {
      if (activeHistoryId) {
        sessionStorage.setItem(HISTORY_ACTIVE_KEY, String(activeHistoryId));
      } else {
        sessionStorage.removeItem(HISTORY_ACTIVE_KEY);
      }
    } catch {
      /* ignore */
    }
  }, [activeHistoryId]);

  const canUndo = historyPointer < historyStack.length - 1;
  const canRedo = historyPointer > 0;

  const handleUndo = async () => {
    if (!canUndo || loading || busyAction) return;
    const targetIndex = historyPointer + 1;
    const target = historyStack[targetIndex];
    if (!target) return;
    await handleRestoreHistory(target.id, "undo");
  };

  const handleRedo = async () => {
    if (!canRedo || loading || busyAction) return;
    const targetIndex = historyPointer - 1;
    const target = historyStack[targetIndex];
    if (!target) return;
    await handleRestoreHistory(target.id, "redo");
  };

  if (!admin) return null;

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={handleUndo}
        disabled={!canUndo || loading || busyAction !== null}
        className="gap-1"
      >
        <Undo2 size={14} />
        Desfazer
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={handleRedo}
        disabled={!canRedo || loading || busyAction !== null}
        className="gap-1"
      >
        <Redo2 size={14} />
        Refazer
      </Button>
    </div>
  );
}
