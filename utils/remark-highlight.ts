type MdastNode = {
  type: string;
  value?: string;
  children?: MdastNode[];
  data?: {
    hName?: string;
  };
};

function parseInlineMarkdown(value: string): MdastNode[] {
  const nodes: MdastNode[] = [];
  let index = 0;

  const pushText = (text: string) => {
    if (text.length > 0) {
      nodes.push({ type: "text", value: text });
    }
  };

  while (index < value.length) {
    const char = value[index];

    if (char === "\\") {
      if (index + 1 < value.length) {
        pushText(value[index + 1]);
        index += 2;
        continue;
      }
    }

    if (char === "`") {
      const end = value.indexOf("`", index + 1);
      if (end !== -1) {
        const inner = value.slice(index + 1, end);
        nodes.push({ type: "inlineCode", value: inner });
        index = end + 1;
        continue;
      }
    }

    if (char === "*") {
      const isStrong = value[index + 1] === "*";
      const delimiter = isStrong ? "**" : "*";
      const start = index + delimiter.length;
      const end = value.indexOf(delimiter, start);
      if (end !== -1) {
        const inner = value.slice(start, end);
        const children = parseInlineMarkdown(inner);
        nodes.push({
          type: isStrong ? "strong" : "emphasis",
          children,
        });
        index = end + delimiter.length;
        continue;
      }
    }

    let nextIndex = value.length;
    const nextBacktick = value.indexOf("`", index + 1);
    if (nextBacktick !== -1 && nextBacktick < nextIndex) {
      nextIndex = nextBacktick;
    }
    const nextStar = value.indexOf("*", index + 1);
    if (nextStar !== -1 && nextStar < nextIndex) {
      nextIndex = nextStar;
    }
    const nextEscape = value.indexOf("\\", index + 1);
    if (nextEscape !== -1 && nextEscape < nextIndex) {
      nextIndex = nextEscape;
    }

    if (nextIndex === value.length) {
      pushText(value.slice(index));
      break;
    }

    pushText(value.slice(index, nextIndex));
    index = nextIndex;
  }

  return nodes;
}

function splitHighlightText(value: string): MdastNode[] | null {
  const nodes: MdastNode[] = [];
  let index = 0;
  let changed = false;

  while (index < value.length) {
    const start = value.indexOf("==", index);
    if (start === -1) {
      break;
    }

    const end = value.indexOf("==", start + 2);
    if (end === -1) {
      break;
    }

    if (start > index) {
      nodes.push({ type: "text", value: value.slice(index, start) });
    }

    const inner = value.slice(start + 2, end);
    if (inner.length > 0) {
      nodes.push({
        type: "mark",
        data: { hName: "mark" },
        children: parseInlineMarkdown(inner),
      });
      changed = true;
    } else {
      nodes.push({ type: "text", value: "====" });
    }

    index = end + 2;
  }

  if (!changed) {
    return null;
  }

  if (index < value.length) {
    nodes.push({ type: "text", value: value.slice(index) });
  }

  return nodes;
}

function transformNodeInPlace(node: MdastNode) {
  if (!node.children || node.children.length === 0) {
    return;
  }

  const nextChildren: MdastNode[] = [];
  for (const child of node.children) {
    if (child.type === "text" && typeof child.value === "string") {
      const split = splitHighlightText(child.value);
      if (split) {
        nextChildren.push(...split);
        continue;
      }
    }
    transformNodeInPlace(child);
    nextChildren.push(child);
  }

  node.children = nextChildren;
}

export function remarkHighlight() {
  return (tree: MdastNode) => {
    transformNodeInPlace(tree);
  };
}
