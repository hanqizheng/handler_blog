"""Emit only allowlisted public build arguments; never read production env files."""
import os
import shlex
import sys
from pathlib import Path

PUBLIC_KEYS = {
    "NEXT_PUBLIC_SITE_URL", "NEXT_PUBLIC_SITE_NAME", "NEXT_PUBLIC_SITE_NAME_ZH",
    "NEXT_PUBLIC_SITE_DESCRIPTION_ZH", "NEXT_PUBLIC_SITE_DESCRIPTION_EN",
    "NEXT_PUBLIC_ALIYUN_CAPTCHA_PREFIX", "NEXT_PUBLIC_ALIYUN_CAPTCHA_SCENE_ID",
    "NEXT_PUBLIC_QINIU_DISPLAY_DOMAIN", "NEXT_PUBLIC_QINIU_SOURCE_DOMAIN",
}


def build_arguments(source, overrides):
    values = {}
    for line in source.splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        key, separator, raw = line.partition("=")
        key = key.strip()
        if not separator or key not in PUBLIC_KEYS or key in values:
            raise ValueError("Invalid/duplicate public build variable (values withheld)")
        tokens = shlex.split(raw, comments=True)
        if len(tokens) > 1:
            raise ValueError("Quote public values containing spaces (values withheld)")
        values[key] = tokens[0] if tokens else ""
    if values.keys() != PUBLIC_KEYS:
        raise ValueError("Public build configuration has missing variables")
    values.update({key: overrides[key] for key in PUBLIC_KEYS if overrides.get(key)})
    if any("\n" in value or "\r" in value or "\0" in value for value in values.values()):
        raise ValueError("Multiline public build values are unsupported")
    return "\n".join(f"{key}={values[key]}" for key in sorted(values))


if __name__ == "__main__":
    try:
        source_path = Path(__file__).resolve().parent.parent / "deploy/build.env"
        print(build_arguments(source_path.read_text(), os.environ))
    except (ValueError, OSError):
        sys.exit("Invalid public build configuration; values withheld")
