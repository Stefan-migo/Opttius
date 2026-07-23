import { cn } from "@/lib/utils";

// Simple Alert component substitution for the payment gateways page
export function Alert({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("p-4 rounded-lg border", className)}>{children}</div>;
}
export function AlertTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <h5 className={cn("font-medium leading-none tracking-tight", className)}>{children}</h5>;
}
export function AlertDescription({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("text-sm opacity-90", className)}>{children}</div>;
}
