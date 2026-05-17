import { Label } from "@/components/ui/label";

interface FieldProps {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}

export function Field({ label, children, full }: FieldProps) {
  return (
    <div className={`space-y-1.5 ${full ? "col-span-2" : ""}`}>
      <Label className="text-xs font-medium">{label}</Label>
      {children}
    </div>
  );
}
