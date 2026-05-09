import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Construction } from "lucide-react";

export function ComingSoon({ title, description }: { title: string; description?: ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      <Card>
        <CardContent className="py-16 text-center">
          <Construction className="size-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Em desenvolvimento — fará parte da próxima fase.</p>
        </CardContent>
      </Card>
    </div>
  );
}
