const required = ["DATABASE_URL", "ADMIN_AUTH_SECRET"];
const missing = required.filter((key) => !process.env[key]?.trim());
const pairs = [
  ["ALIYUN_CAPTCHA_ACCESS_KEY_ID", "ALIYUN_CAPTCHA_ACCESS_KEY_SECRET"],
  ["QINIU_ACCESS_KEY", "QINIU_SECRET_KEY"],
];
for (const pair of pairs) {
  if (pair.some((key) => process.env[key]?.trim())) {
    missing.push(...pair.filter((key) => !process.env[key]?.trim()));
  }
}
if (missing.length) {
  console.error(`Missing runtime variables: ${missing.join(", ")}`);
  process.exit(1);
}
try {
  const url = new URL(process.env.DATABASE_URL);
  if (
    url.protocol !== "mysql:" ||
    !url.hostname ||
    !url.pathname ||
    url.pathname === "/"
  ) {
    throw new Error("Invalid URL");
  }
} catch {
  console.error("DATABASE_URL must be a MySQL URL with a database name");
  process.exit(1);
}
