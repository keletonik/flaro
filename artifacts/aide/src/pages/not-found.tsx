export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <div className="w-full max-w-md mx-4 text-center">
        <span className="font-mono text-4xl text-muted-foreground/30">404</span>
        <h1 className="text-sm font-medium text-foreground mt-3">Page not found</h1>
        <p className="mt-2 text-xs text-muted-foreground font-mono">
          Did you forget to add the page to the router?
        </p>
      </div>
    </div>
  );
}
