import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  icon: Icon,
  note
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  note?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold">{value}</p>
          {note ? <p className="mt-1 text-xs text-muted-foreground">{note}</p> : null}
        </div>
        <div className="flex size-11 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon size={22} />
        </div>
      </CardContent>
    </Card>
  );
}
