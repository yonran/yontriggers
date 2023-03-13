// based on https://developers.google.com/gmail/api/quickstart/nodejs
import type { Firestore } from 'firebase-admin/firestore';
import type {
    Credentials,
    OAuth2ClientOptions,
    UserRefreshClientOptions,
} from 'google-auth-library';
import { OAuth2Client, UserRefreshClient } from 'google-auth-library';
import { google } from 'googleapis';
import * as t from 'io-ts';

import { SECRET } from './secret.js';
import type { AccessTokenResponse, User } from './types.js';
import { AccessTokenResponseType, UserType } from './types.js';
import { decodeAs } from './util.js';

export const REDIRECT_PATH = '/oauth2code';

// If modifying these scopes, delete token.json.
const SCOPES = [
    // include openid, email claims
    // so that the response will have email and email_verified
    // https://developers.google.com/identity/openid-connect/openid-connect#scope-param
    'openid',
    'email',
    'https://www.googleapis.com/auth/gmail.readonly',
];

const UserKeyType = t.strict(
    {
        iss: t.string,
        sub: t.string,
    },
    'UserKey'
);
type UserKey = t.TypeOf<typeof UserKeyType>;
function databaseId(jwtPayload: UserKey): string {
    const { iss, sub } = jwtPayload;
    return JSON.stringify({ iss, sub });
}

/**
 * Reads previously authorized OAuth2 credentials from firestore.
 */
export async function loadSavedCredentialsIfExist(
    firestore: Firestore,
    userId: string
): Promise<OAuth2Client | undefined> {
    const user = await firestore.collection('google-auth').doc(userId).get();
    if (user.exists) {
        const userData = decodeAs(UserType, user.data());
        if (userData.token.refresh_token !== undefined) {
            const options: UserRefreshClientOptions = {
                clientId: SECRET.client_id,
                clientSecret: SECRET.client_secret,
                refreshToken: userData.token.refresh_token,
            };
            return new UserRefreshClient(options);
        } else {
            // google excludes refresh_token in testing
            const options: OAuth2ClientOptions = {
                clientId: SECRET.client_id,
                clientSecret: SECRET.client_secret,
            };
            return new OAuth2Client(options);
        }
    } else {
        return undefined;
    }
}

// based on authenticate in @google-cloud/local-auth
// https://github.com/googleapis/nodejs-local-auth/blob/v2.1.1/src/index.ts
/**
 */
export function getConsentPageUrl(appBaseUrl: URL) {
    const redirectUrl = new URL(REDIRECT_PATH, appBaseUrl);
    const { client_id, client_secret } = SECRET;
    const client = new OAuth2Client({
        clientId: client_id,
        clientSecret: client_secret,
    });
    return client.generateAuthUrl({
        redirect_uri: redirectUrl.toString(),
        access_type: 'offline',
        scope: SCOPES.join(' '),
    });
}
export async function handleRedirectRequest(appBaseUrl: URL, firestore: Firestore, code: string) {
    const { client_id, client_secret } = SECRET;
    const redirectUrl = new URL(REDIRECT_PATH, appBaseUrl);
    const client = new OAuth2Client({
        clientId: client_id,
        clientSecret: client_secret,
        redirectUri: redirectUrl.toString(),
    });
    const getTokenResponse = await client.getToken({ code });
    const tokens: Credentials = getTokenResponse.tokens;
    const accessTokenResponse: AccessTokenResponse = decodeAs(AccessTokenResponseType, tokens);
    // since requested scopes included openid connect,
    // it should contain id_token
    if (tokens.id_token == null) {
        throw new Error('id_token null (even though I did request openid scope)');
    }

    // verifyIdToken fetches google’s OAuth2 certs
    // from https://www.googleapis.com/oauth2/v1/certs,
    // verifies that the idToken JWT was signed by one of the certs,
    // verifies that it is not expired
    // (assuming that system clock is within 5 minutes of correct)
    // and verifies that the issuer (iss) is [https://]accounts.google.com
    const loginTicket = await client.verifyIdToken({ idToken: tokens.id_token });
    const payload = loginTicket.getPayload();
    if (payload == null) {
        throw new Error('no payload found in LoginTicket (should never happen)');
    }
    const userId = loginTicket.getUserId(); // aka payload.sub
    if (userId == null || userId.length === 0) {
        throw new Error('no user id (sub) found in the id_token');
    }
    const issuer = payload.iss;
    const userKey: UserKey = { iss: issuer, sub: userId };
    const user: User = {
        sub: userId,
        token: accessTokenResponse,
    };
    await firestore.collection('google-auth').doc(userId).set(user);
    return user;
}

/**
 * Lists the labels in the user's account.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
async function listLabels(auth: OAuth2Client) {
    const gmail = google.gmail({ version: 'v1', auth });
    const res = await gmail.users.labels.list({
        userId: 'me',
    });
    const labels = res.data.labels;
    if (!labels || labels.length === 0) {
        console.log('No labels found.');
        return;
    }
    console.log('Labels:');
    labels.forEach((label) => {
        console.log(`- ${String(label.name)}`);
    });
}
