import { Label } from "@/components/ui/label";

interface PresbyopiaSolutionSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function PresbyopiaSolutionSelector({
  value,
  onChange,
}: PresbyopiaSolutionSelectorProps) {
  const solutions = [
    { id: "progressive", title: "Lente Progresivo", desc: "Un solo lente con graduación progresiva (lejos + cerca)" },
    { id: "single", title: "Lentes Bifocales", desc: "Dos graduaciones en un mismo lente (lejos y cerca)" },
    { id: "two_separate", title: "Dos Lentes Separados", desc: "Un lente para lejos y otro para cerca" },
  ];

  return (
    <div className="mt-4 p-3 border border-amber-200 rounded-lg bg-amber-50 dark:bg-amber-900/20">
      <Label className="text-amber-700 dark:text-amber-300 font-medium block mb-2">
        Solución de Presbicia
      </Label>
      <p className="text-xs text-amber-600 dark:text-amber-400 mb-3">
        Esta receta tiene adición. Selecciona cómo quieres fabricar los lentes:
      </p>
      <div className="space-y-2">
        {solutions.map((sol) => (
          <div
            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
              value === sol.id
                ? "border-primary bg-primary/5"
                : "hover:border-muted-foreground"
            }`}
            key={sol.id}
            onClick={() => onChange(sol.id)}
          >
            <div className="font-medium">{sol.title}</div>
            <div className="text-xs text-muted-foreground">{sol.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
