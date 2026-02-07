export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 py-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <img alt="Huteng" className="h-10 w-auto" src="/brand/logo.svg" />
        <div className="flex flex-col gap-2 text-slate-600">
          <div className="flex flex-col text-slate-700">
            <a className="hover:text-slate-900" href="tel:13520922911">
              Phone: 13520922911
            </a>
            <a className="hover:text-slate-900" href="mailto:ht@huteng.com">
              Email: ht@huteng.com
            </a>
          </div>
          <span>
            友情链接：{" "}
            <a
              className="text-slate-700 hover:text-slate-900"
              href="https://www.aiaig.com/"
              rel="noreferrer"
              target="_blank"
            >
              AIAIG
            </a>{" "}
            <a
              className="text-slate-700 hover:text-slate-900"
              href="https://chunzuo.com/"
              rel="noreferrer"
              target="_blank"
            >
              春座
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
