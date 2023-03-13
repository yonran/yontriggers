import type {
    GetPublicKeyOrSecret,
    JwtHeader,
    JwtPayload,
    Secret,
    VerifyCallback,
} from 'jsonwebtoken';
import { verify } from 'jsonwebtoken';
import type JwksRsa from 'jwks-rsa';
import { JwksClient } from 'jwks-rsa';
import { callbackify, promisify } from 'util';

import certs from './google-certs.json';

async function getJwtKeyHelper(header: JwtHeader): Promise<Secret> {
    const jwksClient = new JwksClient({
        jwksUri: 'https://www.googleapis.com/oauth2/v3/certs',
        // eslint-disable-next-line @typescript-eslint/require-await
        async getKeysInterceptor(): Promise<JwksRsa.JSONWebKey[]> {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            return certs.keys as JwksRsa.JSONWebKey[];
        },
    });
    const key = await jwksClient.getSigningKey(header.kid);
    return key.getPublicKey();
}
/** public key loader that can be used for jsonwebtoken.verify */
export const getJwtKey: GetPublicKeyOrSecret = callbackify(getJwtKeyHelper);

/**
 * This is more or less like
 * import type { OAuth2Client } from 'google-auth-library';
 * client.verifyIdToken so we will use that instead.
 * extract the google user id from the id_token
 * https://developers.google.com/identity/openid-connect/openid-connect#obtainuserinfo
 * @param id_token
 * @returns
 */
export async function verifyAndGetGoogleUserId(
    id_token: string | null | undefined
): Promise<string> {
    if (id_token == null) {
        throw new Error('google returned a null id_token');
    }
    const payload = await promisify((cb: VerifyCallback<JwtPayload | string>) =>
        verify(id_token, getJwtKey, cb)
    )();
    if (payload == null || typeof payload !== 'object') {
        throw new Error('id_token could not be decoded to a payload');
    }
    if (payload.sub == null) {
        throw new Error('id_token sub was null');
    }
    return payload.sub;
}
