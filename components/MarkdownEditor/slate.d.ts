import type { BaseEditor } from "slate";
import type { HistoryEditor } from "slate-history";
import type { ReactEditor } from "slate-react";

import type { MarkdownElement, MarkdownText } from "./type";

declare module "slate" {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor & HistoryEditor;
    Element: MarkdownElement;
    Text: MarkdownText;
  }
}
