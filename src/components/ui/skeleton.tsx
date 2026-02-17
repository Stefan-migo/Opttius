import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-epoch-primary/5 rounded-none",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-epoch-accent/10 before:to-transparent",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
