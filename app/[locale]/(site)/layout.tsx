import { SiteFooter } from "@/components/site-footer";
import { SiteNavigation } from "@/components/site-navigation";

export default function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <SiteNavigation />
      {children}
      <SiteFooter />
    </>
  );
}
