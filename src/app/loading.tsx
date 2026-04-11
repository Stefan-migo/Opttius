export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div
          aria-hidden
          className="h-10 w-10 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-accent"
        />
        <p className="text-sm text-muted-foreground font-medium">Cargando...</p>
      </div>
    </div>
  );
}
