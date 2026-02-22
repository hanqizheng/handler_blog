import Script from "next/script";

import { SiteFooter } from "@/components/site-footer";
import { SiteNavigation } from "@/components/site-navigation";

export default function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Script id="baidu-analytics" strategy="afterInteractive">
        {`var _hmt = _hmt || [];
(function() {
  var hm = document.createElement("script");
  hm.src = "https://hm.baidu.com/hm.js?629978b4cd088fe99da4cc1bcd3bc976";
  var s = document.getElementsByTagName("script")[0];
  s.parentNode.insertBefore(hm, s);
})();`}
      </Script>
      <SiteNavigation />
      {children}
      <SiteFooter />
    </>
  );
}
