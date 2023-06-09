import crypto from 'crypto';

export const uuid = () =>
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });

export function insertAt(str: string, index: number, insert: string) {
    return str.slice(0, index) + insert + str.slice(index);
}

export function splitAt(str: string, index: number) {
    return [str.slice(0, index), str.slice(index)];
}

export function splitUpString(str: string, maxLen: number) {
    if (str.length <= maxLen) {
      return [str];
    }

    return str.match(new RegExp(`.{1,${maxLen}}`, 'gs')) || [];
}

/**
 * Hashes a string using the specified algorithm.
 *
 * @param {string} input - The string to hash.
 * @param {HashType} type - The hash algorithm to use.
 *  - 'md5': Produces a 128-bit hash. Commonly used for integrity checks. Not suitable for secure encryption.
 *  - 'sha1': Produces a 160-bit hash. No longer considered secure against well-funded attackers.
 *  - 'sha256': Part of SHA-2, computed with 32-bit words.
 *  - 'sha512': Part of SHA-2, computed with 64-bit words. More secure than SHA-256.
 *  - 'sha3-256', 'sha3-512': Part of SHA-3, the latest member of the Secure Hash Algorithm family.
 *  - 'blake2b512', 'blake2s256': BLAKE2 is faster than MD5, SHA-1, SHA-2, and SHA-3, but equally or more secure.
 * @returns {string} - The hashed string as a hexadecimal number.
 */
export function hashString(input: string, type: HashType = 'sha256'): string {
    const hash = crypto.createHash(type);
    hash.update(input);
    return hash.digest('hex');
}

export const replaceHtmlEntities = (str: string) =>
    str.replace(entityRegex, match => (htmlEntitiesMap as any)[match] || match);

const entityRegex = /&[^;]+;/g;

const htmlEntitiesMap = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&apos;": "'",
    "&quot;": "\"",
    "&nbsp;": " ",
    "&copy;": "©",
    "&uuml;": "ü",
    "&Uuml;": "Ü",
    "&ndash;": "–",
    "&mdash;": "—",
    "&iexcl;": "¡",
    "&iquest;": "¿",
    "&ldquo;": "“",
    "&rdquo;": "”",
    "&lsquo;": "‘",
    "&rsquo;": "’",
    "&laquo;": "«",
    "&raquo;": "»",
    "&bull;": "•",
    "&hellip;": "…",
    "&permil;": "‰",
    "&prime;": "′",
    "&Prime;": "″",
    "&lsaquo;": "‹",
    "&rsaquo;": "›",
    "&oline;": "‾",
    "&frasl;": "⁄",
    "&euro;": "€",
    "&trade;": "™",
    "&larr;": "←",
    "&uarr;": "↑",
    "&rarr;": "→",
    "&darr;": "↓",
    "&harr;": "↔",
    "&crarr;": "↵",
    "&lceil;": "⌈",
    "&rceil;": "⌉",
    "&lfloor;": "⌊",
    "&rfloor;": "⌋",
    "&loz;": "◊",
    "&clubs;": "♣",
    "&hearts;": "♥",
    "&diams;": "♦",
    "&spades;": "♠",
};
