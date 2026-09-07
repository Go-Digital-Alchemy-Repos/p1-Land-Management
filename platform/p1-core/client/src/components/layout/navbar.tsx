/** The P1 dashboard is an administration surface; public navigation lives on the website. */
export function Navbar() {
  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-5">
        <a href="/" className="flex items-center gap-3 text-foreground" data-testid="link-p1-website-brand">
          <img src="/admin/p1-symbol.svg" alt="" width={56} height={42} className="h-10 w-14 object-contain" />
          <span className="text-sm font-semibold sm:text-base">P1 Land &amp; Property Management</span>
        </a>
        <a href="/" className="text-sm font-medium text-primary underline-offset-4 hover:underline" data-testid="link-back-to-p1">
          Back to P1 website
        </a>
      </div>
    </header>
  );
}
