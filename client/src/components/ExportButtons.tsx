import { useState } from "react";
import { toast } from "sonner";
import { isAdmin } from "@/auth/adminAuth";
import type {
  Holiday,
  Scale,
  ShiftSwap,
  TeamMember,
  TimeOff,
} from "@/contexts/ScheduleContext";
import { Button } from "@/components/ui/button";
import { exportCalendarToPdf } from "@/lib/exportPdf";
import { exportCalendarToExcel } from "@/lib/exportExcel";

interface ExportButtonsProps {
  calendarElementId: string;
  year: number;
  month: number;
  teamMembers: TeamMember[];
  scales: Scale[];
  timeOffs: TimeOff[];
  holidays: Holiday[];
  shiftSwaps: ShiftSwap[];
  isPersonOnTimeOff?: (personName: string, dateStr: string) => boolean;
}

export default function ExportButtons({
  calendarElementId,
  year,
  month,
  teamMembers,
  scales,
  timeOffs,
  holidays,
  shiftSwaps,
  isPersonOnTimeOff,
}: ExportButtonsProps) {
  const admin = isAdmin();
  const [pdfLoading, setPdfLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);

  if (!admin) return null;

  const handleExportPdf = async () => {
    setPdfLoading(true);
    try {
      await exportCalendarToPdf(calendarElementId);
    } catch (err) {
      console.error("Erro ao exportar PDF:", err);
      toast.error("Não foi possível exportar o PDF.");
    } finally {
      setPdfLoading(false);
    }
  };

  const handleExportExcel = async () => {
    setExcelLoading(true);
    try {
      await exportCalendarToExcel({
        year,
        month,
        teamMembers,
        scales,
        timeOffs,
        holidays,
        shiftSwaps,
        isPersonOnTimeOff,
      });
    } catch (err) {
      console.error("Erro ao exportar Excel:", err);
      toast.error("Não foi possível exportar o Excel.");
    } finally {
      setExcelLoading(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        variant="ghost"
        className="h-auto px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
        onClick={handleExportPdf}
        disabled={pdfLoading}
      >
        {pdfLoading ? "Exportando PDF..." : "Exportar PDF"}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-auto px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
        onClick={handleExportExcel}
        disabled={excelLoading}
      >
        {excelLoading ? "Exportando Excel..." : "Exportar Excel"}
      </Button>
    </div>
  );
}
