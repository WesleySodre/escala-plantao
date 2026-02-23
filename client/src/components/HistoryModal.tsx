import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { toast } from "sonner";
import { adminLogout, getAdminJwt, isAdmin } from "@/auth/adminAuth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type HistoryItem = {
  id: number;
  created_at: string;
};

interface HistoryModalProps {
  reloadState?: () => Promise<boolean> | Promise<void>;
}

export default function HistoryModal({ reloadState }: HistoryModalProps) {
  const admin = isAdmin();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<number | null>(null);

  if (!admin) return null;

  const handleAdminExpired = () => {
    adminLogout();
    alert("Sessão expirada. Entre como admin novamente.");
  };

  const formatHistoryDateTime = (value: string) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(parsed);
  };

  const fetchHistory = async () => {
    const token = getAdminJwt();
    if (!token) {
      handleAdminExpired();
      setOpen(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/.netlify/functions/list-history", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 401) {
        handleAdminExpired();
        setOpen(false);
        return;
      }

      if (!res.ok) {
        const text = await res.text();
        console.error("Erro ao carregar histórico:", text);
        setError("Não foi possível carregar o histórico.");
        return;
      }

      const payload = await res.json();
      const nextItems = Array.isArray(payload?.items) ? payload.items : [];
      setItems(nextItems);
    } catch (err) {
      console.error("Erro ao carregar histórico:", err);
      setError("Não foi possível carregar o histórico.");
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreHistory = async (historyId: number) => {
    const token = getAdminJwt();
    if (!token) {
      handleAdminExpired();
      setOpen(false);
      return;
    }

    const confirmed = window.confirm(
      "Tem certeza que deseja restaurar esta versão? A versão atual será salva automaticamente."
    );
    if (!confirmed) return;

    setRestoringId(historyId);

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
        setOpen(false);
        return;
      }

      if (!res.ok) {
        const text = await res.text();
        console.error("Erro ao restaurar histórico:", text);
        toast.error("Não foi possível restaurar a versão.");
        return;
      }

      if (reloadState) {
        await reloadState();
      }

      setOpen(false);
      toast.success("Versão restaurada com sucesso.");
    } catch (err) {
      console.error("Erro ao restaurar histórico:", err);
      toast.error("Não foi possível restaurar a versão.");
    } finally {
      setRestoringId(null);
    }
  };

  useEffect(() => {
    if (!open) return;
    fetchHistory();
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="link"
          className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
        >
          <Clock size={12} className="mr-1" />
          Ver versões anteriores
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Histórico de versões</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando histórico...</p>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma versão registrada</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-secondary rounded-lg"
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium text-foreground">
                      {formatHistoryDateTime(item.created_at)}
                    </div>
                    <div className="text-xs text-muted-foreground">ID {item.id}</div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRestoreHistory(item.id)}
                    disabled={restoringId === item.id}
                  >
                    {restoringId === item.id ? "Restaurando..." : "Restaurar"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
