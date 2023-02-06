import type { Either } from 'fp-ts/lib/Either.js';
import { isLeft } from 'fp-ts/lib/Either.js';
import { left, mapLeft } from 'fp-ts/lib/Either.js';
import type * as t from 'io-ts';
import { PathReporter } from 'io-ts/lib/PathReporter.js';
import type {
    GetPublicKeyOrSecret,
    JwtHeader,
    JwtPayload,
    Secret,
    VerifyCallback,
} from 'jsonwebtoken';
import jsonwebtoken from 'jsonwebtoken';
import { callbackify, promisify } from 'util';

import { LATEST_SESSION_KEY, SESSION_KEYS } from './secret';
import type { Session } from './types';
import { SessionType } from './types';
export function createSessionCookie(payload: Session) {
    return jsonwebtoken.sign(payload, LATEST_SESSION_KEY.privateKey, {
        algorithm: 'ES384',
        expiresIn: '7d',
        keyid: LATEST_SESSION_KEY.kid,
        issuer: ISSUER,
    });
}

export const ISSUER = 'yontriggers';

function getSesssionPublicKeyHelper(header: JwtHeader): Promise<Secret> {
    const key = SESSION_KEYS.filter((x) => x.kid === header.kid)[0];
    if (key === undefined) throw new Error(`no key matching kid ${String(header.kid)}`);
    return Promise.resolve(key.publicKey);
}
/** public key loader that can be used for jsonwebtoken.verify */
const getSesssionPublicKey: GetPublicKeyOrSecret = callbackify(getSesssionPublicKeyHelper);

export async function verifySessionCookie(jwt: string): Promise<Either<string, Session>> {
    try {
        const payload = await promisify((cb: VerifyCallback<JwtPayload | string>) =>
            jsonwebtoken.verify(
                jwt,
                getSesssionPublicKey,
                {
                    issuer: ISSUER,
                },
                cb
            )
        )();
        const decoded = SessionType.decode(payload);
        return mapLeft((errors: t.Errors) => PathReporter.report(left(errors)).join(';'))(decoded);
    } catch (e: unknown) {
        return left((e as Error).message ?? 'unknown error');
    }
}
export async function verifySessionCookieOrUndefined(jwt: string): Promise<Session | undefined> {
    const result = await verifySessionCookie(jwt);
    if (isLeft(result)) {
        return undefined;
    } else {
        return result.right;
    }
}
