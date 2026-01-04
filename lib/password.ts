import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SCRYPT_KEYLEN = 64;
const SCRYPT_COST = 16384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;

const encodeHex = (buffer: Buffer) => buffer.toString("hex");
const decodeHex = (value: string) => Buffer.from(value, "hex");

export const hashPassword = (password: string) => {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, SCRYPT_KEYLEN, {
    N: SCRYPT_COST,
    r: SCRYPT_BLOCK_SIZE,
    p: SCRYPT_PARALLELIZATION,
  });
  return [
    "scrypt",
    SCRYPT_COST,
    SCRYPT_BLOCK_SIZE,
    SCRYPT_PARALLELIZATION,
    encodeHex(salt),
    encodeHex(derived),
  ].join(":");
};

export const verifyPassword = (password: string, stored: string) => {
  const [algo, rawCost, rawBlock, rawParallel, rawSalt, rawHash] =
    stored.split(":");
  if (algo !== "scrypt") return false;

  const cost = Number(rawCost);
  const blockSize = Number(rawBlock);
  const parallelization = Number(rawParallel);
  if (!cost || !blockSize || !parallelization || !rawSalt || !rawHash) {
    return false;
  }

  const salt = decodeHex(rawSalt);
  const expected = decodeHex(rawHash);
  const derived = scryptSync(password, salt, expected.length, {
    N: cost,
    r: blockSize,
    p: parallelization,
  });
  return timingSafeEqual(derived, expected);
};
