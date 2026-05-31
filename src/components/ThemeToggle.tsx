import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Monitor } from "lucide-react";

type Theme = "light" | "dark" | "system";

function apply(theme: Theme) {
  const root = document.documentElement;
  const isDark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", isDark);
}

export function initTheme() {
  if (typeof window === "undefined") return;
  const stored = (localStorage.getItem("theme") as Theme) || "system";
  apply(stored);
  // React to OS changes while in system mode
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", () => {
    const cur = (localStorage.getItem("theme") as Theme) || "system";
    if (cur === "system") apply("system");
  });
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<Theme>(
    typeof window === "undefined" ? "system" : ((localStorage.getItem("theme") as Theme) || "system")
  );

  useEffect(() => {
    localStorage.setItem("theme", theme);
    apply(theme);
  }, [theme]);

  const next: Theme = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;
  const label = theme === "light" ? "Tema claro" : theme === "dark" ? "Tema escuro" : "Tema do sistema";

  return (
    <Button
      variant="ghost"
      size={compact ? "icon" : "sm"}
      onClick={() => setTheme(next)}
      aria-label={`${label} (alterar)`}
      title={label}
      className={compact ? "size-9" : ""}
    >
      <Icon className="size-4" />
      {!compact && <span className="ml-2 text-xs">{label}</span>}
    </Button>
  );
}
