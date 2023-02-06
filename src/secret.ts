import type { KeyObject, webcrypto } from 'crypto';
import { createPrivateKey, createPublicKey } from 'crypto';

import type { Secret } from './types.js';
import { SecretType } from './types.js';
import { assertDefined, decodeAs } from './util.js';
function readSecret(): Secret {
    const secret = decodeAs(SecretType, JSON.parse(process.env['SECRET'] ?? ''));
    return secret;
}
export const SECRET = readSecret();

export interface SessionKey {
    kid: string;
    publicKey: KeyObject;
    privateKey: KeyObject;
}

function getSessionKeys(): SessionKey[] {
    // webcrypto api is less useful (no api to convert private key to public key,
    // and jsonwebtoken does not use it anyway, and it is async)
    // await webcrypto.subtle.importKey(
    //     'jwk',
    //     x,
    //     { name: 'ECDSA', namedCurve: 'P-384' },
    //     true,
    //     ['sign']
    // ),
    return SECRET.session_secret.keys.map((x) => ({
        kid: x.kid,
        publicKey: createPublicKey({ key: x, format: 'jwk' }),
        privateKey: createPrivateKey({ key: x, format: 'jwk' }),
    }));
}
export const SESSION_KEYS = getSessionKeys();
export const LATEST_SESSION_KEY: SessionKey = assertDefined(
    SESSION_KEYS[SESSION_KEYS.length - 1],
    'SESSION_KEYS[-1]'
);
