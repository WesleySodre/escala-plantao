import { Redo2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isAdmin } from "@/auth/adminAuth";
import { useSchedule } from "@/contexts/ScheduleContext";

interface HistoryModalProps {
  reloadState?: () => Promise<boolean> | Promise<void>;
}

export default function HistoryModal(_props: HistoryModalProps) {
  const admin = isAdmin();
  const { undo, redo, canUndo, canRedo } = useSchedule();

  if (!admin) return null;

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={undo}
        disabled={!canUndo}
        className="gap-1"
      >
        <Undo2 size={14} />
        Desfazer
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={redo}
        disabled={!canRedo}
        className="gap-1"
      >
        <Redo2 size={14} />
        Refazer
      </Button>
    </div>
  );
}
