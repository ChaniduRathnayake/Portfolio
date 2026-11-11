/**
 * DES, written to be read: bits as arrays, tables straight from FIPS 46-3.
 * It drives the round-by-round lab on the page and records every round as it
 * goes. For looking at, not for protecting anything: DES has been broken for
 * decades, which is why it is worth studying.
 */

type Bits = number[];

// prettier-ignore
const IP = [58,50,42,34,26,18,10,2,60,52,44,36,28,20,12,4,62,54,46,38,30,22,14,6,64,56,48,40,32,24,16,8,57,49,41,33,25,17,9,1,59,51,43,35,27,19,11,3,61,53,45,37,29,21,13,5,63,55,47,39,31,23,15,7];
// prettier-ignore
const FP = [40,8,48,16,56,24,64,32,39,7,47,15,55,23,63,31,38,6,46,14,54,22,62,30,37,5,45,13,53,21,61,29,36,4,44,12,52,20,60,28,35,3,43,11,51,19,59,27,34,2,42,10,50,18,58,26,33,1,41,9,49,17,57,25];
// prettier-ignore
const E = [32,1,2,3,4,5,4,5,6,7,8,9,8,9,10,11,12,13,12,13,14,15,16,17,16,17,18,19,20,21,20,21,22,23,24,25,24,25,26,27,28,29,28,29,30,31,32,1];
// prettier-ignore
const P = [16,7,20,21,29,12,28,17,1,15,23,26,5,18,31,10,2,8,24,14,32,27,3,9,19,13,30,6,22,11,4,25];
// prettier-ignore
const PC1 = [57,49,41,33,25,17,9,1,58,50,42,34,26,18,10,2,59,51,43,35,27,19,11,3,60,52,44,36,63,55,47,39,31,23,15,7,62,54,46,38,30,22,14,6,61,53,45,37,29,21,13,5,28,20,12,4];
// prettier-ignore
const PC2 = [14,17,11,24,1,5,3,28,15,6,21,10,23,19,12,4,26,8,16,7,27,20,13,2,41,52,31,37,47,55,30,40,51,45,33,48,44,49,39,56,34,53,46,42,50,36,29,32];
const SHIFTS = [1, 1, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 1];

// prettier-ignore
const SBOX = [
  [14,4,13,1,2,15,11,8,3,10,6,12,5,9,0,7,0,15,7,4,14,2,13,1,10,6,12,11,9,5,3,8,4,1,14,8,13,6,2,11,15,12,9,7,3,10,5,0,15,12,8,2,4,9,1,7,5,11,3,14,10,0,6,13],
  [15,1,8,14,6,11,3,4,9,7,2,13,12,0,5,10,3,13,4,7,15,2,8,14,12,0,1,10,6,9,11,5,0,14,7,11,10,4,13,1,5,8,12,6,9,3,2,15,13,8,10,1,3,15,4,2,11,6,7,12,0,5,14,9],
  [10,0,9,14,6,3,15,5,1,13,12,7,11,4,2,8,13,7,0,9,3,4,6,10,2,8,5,14,12,11,15,1,13,6,4,9,8,15,3,0,11,1,2,12,5,10,14,7,1,10,13,0,6,9,8,7,4,15,14,3,11,5,2,12],
  [7,13,14,3,0,6,9,10,1,2,8,5,11,12,4,15,13,8,11,5,6,15,0,3,4,7,2,12,1,10,14,9,10,6,9,0,12,11,7,13,15,1,3,14,5,2,8,4,3,15,0,6,10,1,13,8,9,4,5,11,12,7,2,14],
  [2,12,4,1,7,10,11,6,8,5,3,15,13,0,14,9,14,11,2,12,4,7,13,1,5,0,15,10,3,9,8,6,4,2,1,11,10,13,7,8,15,9,12,5,6,3,0,14,11,8,12,7,1,14,2,13,6,15,0,9,10,4,5,3],
  [12,1,10,15,9,2,6,8,0,13,3,4,14,7,5,11,10,15,4,2,7,12,9,5,6,1,13,14,0,11,3,8,9,14,15,5,2,8,12,3,7,0,4,10,1,13,11,6,4,3,2,12,9,5,15,10,11,14,1,7,6,0,8,13],
  [4,11,2,14,15,0,8,13,3,12,9,7,5,10,6,1,13,0,11,7,4,9,1,10,14,3,5,12,2,15,8,6,1,4,11,13,12,3,7,14,10,15,6,8,0,5,9,2,6,11,13,8,1,4,10,7,9,5,0,15,14,2,3,12],
  [13,2,8,4,6,15,11,1,10,9,3,14,5,0,12,7,1,15,13,8,10,3,7,4,12,5,6,11,0,14,9,2,7,11,4,1,9,12,14,2,0,6,10,13,15,3,5,8,2,1,14,7,4,10,8,13,15,12,9,0,3,5,6,11],
];

const permute = (bits: Bits, table: readonly number[]): Bits => table.map((n) => bits[n - 1]);
const xor = (a: Bits, b: Bits): Bits => a.map((bit, i) => bit ^ b[i]);
const rotateLeft = (bits: Bits, n: number): Bits => [...bits.slice(n), ...bits.slice(0, n)];

const toBits = (bytes: readonly number[]): Bits => bytes.flatMap((byte) => Array.from({ length: 8 }, (_, i) => (byte >> (7 - i)) & 1));

const toHex = (bits: Bits): string => {
  let hex = "";
  for (let i = 0; i < bits.length; i += 4) hex += ((bits[i] << 3) | (bits[i + 1] << 2) | (bits[i + 2] << 1) | bits[i + 3]).toString(16);
  return hex.toUpperCase();
};

/** The sixteen 48-bit round keys. */
function subkeys(key: Bits): Bits[] {
  const start = permute(key, PC1);
  let c = start.slice(0, 28);
  let d = start.slice(28);
  return SHIFTS.map((shift) => {
    c = rotateLeft(c, shift);
    d = rotateLeft(d, shift);
    return permute([...c, ...d], PC2);
  });
}

/** F: expand R to 48 bits, mix in the round key, shrink back through the S-boxes, permute. */
function feistel(right: Bits, key: Bits): Bits {
  const mixed = xor(permute(right, E), key);
  const out: Bits = [];
  for (let box = 0; box < 8; box++) {
    const six = mixed.slice(box * 6, box * 6 + 6);
    const row = (six[0] << 1) | six[5];
    const column = (six[1] << 3) | (six[2] << 2) | (six[3] << 1) | six[4];
    const value = SBOX[box][row * 16 + column];
    out.push((value >> 3) & 1, (value >> 2) & 1, (value >> 1) & 1, value & 1);
  }
  return permute(out, P);
}

export interface DesRound {
  /** 1 to 16. */
  n: number;
  /** K n, 48 bits. */
  key: string;
  /** L and R going into the round. */
  leftIn: string;
  rightIn: string;
  /** F(R, K n). */
  f: string;
  /** L and R coming out: L = old R, R = old L xor F. */
  leftOut: string;
  rightOut: string;
}

export interface DesTrace {
  block: string;
  key: string;
  rounds: DesRound[];
  cipher: string;
}

/** Encrypts one 8-byte block with an 8-byte key and returns every round along the way, in hex. */
export function desTrace(block: readonly number[], key: readonly number[]): DesTrace {
  const blockBits = toBits(block);
  const keyBits = toBits(key);
  const start = permute(blockBits, IP);
  let left = start.slice(0, 32);
  let right = start.slice(32);

  const rounds = subkeys(keyBits).map((roundKey, i): DesRound => {
    const f = feistel(right, roundKey);
    const next = xor(left, f);
    const round = { n: i + 1, key: toHex(roundKey), leftIn: toHex(left), rightIn: toHex(right), f: toHex(f), leftOut: toHex(right), rightOut: toHex(next) };
    left = right;
    right = next;
    return round;
  });

  // The halves are swapped one last time before the final permutation.
  return { block: toHex(blockBits), key: toHex(keyBits), rounds, cipher: toHex(permute([...right, ...left], FP)) };
}

/** A string as exactly eight bytes: UTF-8, cut or zero-padded to fit. */
export function eightBytes(text: string): number[] {
  const bytes = Array.from(new TextEncoder().encode(text)).slice(0, 8);
  while (bytes.length < 8) bytes.push(0);
  return bytes;
}
