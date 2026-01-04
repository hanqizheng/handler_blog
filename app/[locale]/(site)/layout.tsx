export default function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <div className="text-5xl font-bold">handler_blog</div>
      </header>
      {children}
    </>
  );
}
