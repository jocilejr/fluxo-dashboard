import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format, startOfDay, endOfDay, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

export type DateFilterType = "today" | "yesterday" | "7days" | "30days" | "custom";

export interface DateFilterValue {
  type: DateFilterType;
  startDate: Date;
  endDate: Date;
}

interface DateFilterProps {
  value: DateFilterValue;
  onChange: (value: DateFilterValue) => void;
}

// Get current date in Brazil timezone
function getBrazilNow(): Date {
  // Get current time in Brazil timezone as a string, then parse it back
  const brazilDateStr = new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' });
  return new Date(brazilDateStr);
}

export function DateFilter({ value, onChange }: DateFilterProps) {
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [isOpen, setIsOpen] = useState(false);

  const presets: { label: string; type: DateFilterType }[] = [
    { label: "Hoje", type: "today" },
    { label: "Ontem", type: "yesterday" },
    { label: "7 dias", type: "7days" },
    { label: "30 dias", type: "30days" },
  ];

  const handlePresetClick = (type: DateFilterType) => {
    const now = getBrazilNow();
    let startDate: Date;
    let endDate = endOfDay(now);

    switch (type) {
      case "today":
        startDate = startOfDay(now);
        break;
      case "yesterday":
        startDate = startOfDay(subDays(now, 1));
        endDate = endOfDay(subDays(now, 1));
        break;
      case "7days":
        startDate = startOfDay(subDays(now, 6));
        break;
      case "30days":
        startDate = startOfDay(subDays(now, 29));
        break;
      default:
        startDate = startOfDay(now);
    }

    onChange({ type, startDate, endDate });
  };

  const handleCustomRangeSelect = (range: DateRange | undefined) => {
    setCustomRange(range);
    if (range?.from && range?.to) {
      onChange({
        type: "custom",
        startDate: startOfDay(range.from),
        endDate: endOfDay(range.to),
      });
      setIsOpen(false);
    }
  };

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 -mb-2 scrollbar-hide">
      {presets.map((preset) => (
        <Button
          key={preset.type}
          variant={value.type === preset.type ? "default" : "outline"}
          size="sm"
          onClick={() => handlePresetClick(preset.type)}
          className="h-8 shrink-0 text-xs sm:text-sm"
        >
          {preset.label}
        </Button>
      ))}
      
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={value.type === "custom" ? "default" : "outline"}
            size="sm"
            className={cn("h-8 gap-2 shrink-0 text-xs sm:text-sm", value.type === "custom" && "min-w-[160px] sm:min-w-[200px]")}
          >
            <CalendarIcon className="h-4 w-4" />
            {value.type === "custom" ? (
              <span>
                {format(value.startDate, "dd/MM", { locale: ptBR })} - {format(value.endDate, "dd/MM", { locale: ptBR })}
              </span>
            ) : (
              <span className="hidden sm:inline">Personalizado</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={customRange?.from}
            selected={customRange}
            onSelect={handleCustomRangeSelect}
            numberOfMonths={1}
            locale={ptBR}
            className="pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function getDefaultDateFilter(): DateFilterValue {
  const now = getBrazilNow();
  return {
    type: "today",
    startDate: startOfDay(now),
    endDate: endOfDay(now),
  };
}
