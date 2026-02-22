export type AdminSearchParams = Record<string, string | string[] | undefined>;

function getSingleParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export function parsePositiveIntParam(value: string | string[] | undefined) {
  const raw = getSingleParam(value).trim();
  if (!raw) {
    return null;
  }

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export function parseDrawerState<TMode extends string>(
  searchParams: AdminSearchParams,
  modes: readonly TMode[],
) {
  const rawMode = getSingleParam(searchParams.drawer).trim();
  const mode = modes.includes(rawMode as TMode) ? (rawMode as TMode) : null;
  const id = mode ? parsePositiveIntParam(searchParams.id) : null;

  return { mode, id };
}

export function buildDrawerUrl(
  pathname: string,
  currentSearchParams: URLSearchParams,
  mode: string | null,
  id?: number | null,
) {
  const nextSearchParams = new URLSearchParams(currentSearchParams.toString());

  if (!mode) {
    nextSearchParams.delete("drawer");
    nextSearchParams.delete("id");
  } else {
    nextSearchParams.set("drawer", mode);
    if (typeof id === "number" && id > 0) {
      nextSearchParams.set("id", String(id));
    } else {
      nextSearchParams.delete("id");
    }
  }

  const query = nextSearchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}
