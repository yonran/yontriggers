// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./undici.d.ts"/>
// Google Cloud Function entry point file
// must be the package.json main
// https://cloud.google.com/functions/docs/writing#directory-structure

import type {
    Request as ExpressRequest,
    Response as ExpressResponse,
} from '@google-cloud/functions-framework';
import * as functions from '@google-cloud/functions-framework';
import { authenticate } from '@google-cloud/local-auth';
import cookieParser from 'cookie-parser';
import escapeHtml from 'escape-html';
import express, { NextFunction } from 'express';
import firebaseAdmin from 'firebase-admin';
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { isRight } from 'fp-ts/lib/Either.js';
import type { AddressInfo } from 'net';

import { getConsentPageUrl, handleRedirectRequest, REDIRECT_PATH } from './oauth.js';
import { createSessionCookie, verifySessionCookie } from './session.js';
import type { Session } from './types.js';

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        // extend the global interface from
        // @types/express-serve-static-core/index.d.ts
        interface Request {
            session: Session | undefined;
            sessionError: string | undefined;
        }
    }
}

function getProtocol(req: ExpressRequest): string {
    if (req.hostname.split(':')[0] === 'localhost') {
        return req.protocol;
    } else {
        // req.protocol seems to return http on cloud functions
        // so we hard-code https
        return 'https';
    }
}
function getAppBaseUrl(req: ExpressRequest): URL {
    const protocol = getProtocol(req);
    const appBaseUrl = new URL(`${protocol}://${req.hostname}/`);
    let port;
    if (req.hostname.split(':')[0] === 'localhost') {
        port = (req.socket.address() as AddressInfo).port;
    } else {
        // on cloudfunctions, port cannot be trusted (it is 8080)
        port = undefined;
    }
    if (typeof port === 'number') {
        // on localhost, set the port to 8080
        appBaseUrl.port = String(port);
    } else {
        appBaseUrl.port = '';
    }
    return appBaseUrl;
}

const app = express();
app.use(cookieParser());
app.use((req, _res, next) => {
    (async () => {
        const isSecure = getProtocol(req) === 'https';
        const cookieName = isSecure ? '__Host-Session' : 'Session';
        const sessCookie = (req.cookies as Record<string, string>)[cookieName];
        if (sessCookie !== undefined) {
            const sess = await verifySessionCookie(sessCookie);
            if (isRight(sess)) {
                req.session = sess.right;
            } else {
                req.sessionError = sess.left;
            }
        } else {
            req.sessionError = `no ${cookieName} cookie found`;
        }
    })().then(next, next);
});
app.get('/', (req, res, _next) => {
    res.type('text/html');
    const appBaseUrl = getAppBaseUrl(req);
    res.end(`<!doctype HTML>
        ${req.sessionError === undefined ? '' : `<p>${escapeHtml(req.sessionError)}</p>`}
        ${
            req.session === undefined
                ? `<a href="${getConsentPageUrl(appBaseUrl)}">log in through google</a>`
                : `logged in as ${req.session.sub}`
        }
    `);
});
const firebaseApp = firebaseAdmin.initializeApp({});
const firestore = getFirestore(firebaseApp);
// allow undefined values e.g.
// Error: Value for argument "data" is not a valid Firestore document. Cannot use "undefined" as a Firestore value (found in field "token.refresh_token"). If you want to ignore undefined values, enable `ignoreUndefinedProperties`.
firestore.settings({ ignoreUndefinedProperties: true });
app.get(REDIRECT_PATH, (req, res, next) => {
    (async () => {
        const appBaseUrl = getAppBaseUrl(req);
        const code = req.query['code'];
        if (typeof code === 'string' && code.length > 0) {
            const isSecure = getProtocol(req) === 'https';
            const user = await handleRedirectRequest(appBaseUrl, firestore, code);
            const sessionCookie = createSessionCookie({
                sub: user.sub,
            });
            const cookieName = isSecure ? '__Host-Session' : 'Session';
            res.cookie(cookieName, sessionCookie, {
                maxAge: 1000 * 60 * 60 * 24 * 7,
                secure: isSecure,
                sameSite: 'strict',
                httpOnly: true,
            });
            res.redirect('/');
        } else {
            throw new Error('expected code query param from oauth2 consent redirect');
        }
    })().catch(next);
});

functions.http('oauthHandler', app);
