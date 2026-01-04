import { createHmac, randomBytes } from "node:crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const DEFAULT_STEP_SECONDS = 30;
const DEFAULT_DIGITS = 6;

const toBase32 = (buffer: Uint8Array) => {
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      const index = (value >>> (bits - 5)) & 31;
      output += BASE32_ALPHABET[index];
      bits -= 5;
    }
  }

  if (bits > 0) {
    const index = (value << (5 - bits)) & 31;
    output += BASE32_ALPHABET[index];
  }

  return output;
};

const fromBase32 = (input: string) => {
  const normalized = input.replace(/=+$/g, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (const char of normalized) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) {
      continue;
    }
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
};

const padToken = (token: number, digits: number) =>
  token.toString().padStart(digits, "0");

const generateTotpForCounter = (
  secret: string,
  counter: number,
  digits: number,
) => {
  const key = fromBase32(secret);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", key).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  const token = code % 10 ** digits;
  return padToken(token, digits);
};

export const generateTotpSecret = (length = 20) => {
  const bytes = randomBytes(length);
  return toBase32(bytes);
};

export const generateTotpToken = (
  secret: string,
  time = Date.now(),
  stepSeconds = DEFAULT_STEP_SECONDS,
  digits = DEFAULT_DIGITS,
) => {
  const counter = Math.floor(time / 1000 / stepSeconds);
  return generateTotpForCounter(secret, counter, digits);
};

export const verifyTotpToken = (
  secret: string,
  token: string,
  window = 1,
  stepSeconds = DEFAULT_STEP_SECONDS,
  digits = DEFAULT_DIGITS,
) => {
  const normalized = token.replace(/\s+/g, "");
  if (!/^\d{6,8}$/.test(normalized)) {
    return false;
  }
  const counter = Math.floor(Date.now() / 1000 / stepSeconds);
  for (let offset = -window; offset <= window; offset += 1) {
    if (
      generateTotpForCounter(secret, counter + offset, digits) === normalized
    ) {
      return true;
    }
  }
  return false;
};

export const buildOtpAuthUri = (options: {
  secret: string;
  label: string;
  issuer?: string;
}) => {
  const label = encodeURIComponent(options.label);
  const params = new URLSearchParams({
    secret: options.secret,
    ...(options.issuer ? { issuer: options.issuer } : {}),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
};
