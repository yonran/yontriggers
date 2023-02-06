import * as t from 'io-ts';

// authorized user credentials
// see saveCredentials in https://developers.google.com/gmail/api/quickstart/nodejs
/**
 * Same as Credentials from google-auth-library,
 * except that refresh_token, access_token, scope, token_type are required.
 *
 * Based on the OAuth 2 Access Token Response,
 * except that expires_in is replaced by expiry_date
 * and it has extra field id_token from OpenID Connect
 *
 * @see 4.1.4. Access Token Response https://www.rfc-editor.org/rfc/rfc6749#section-4.1.4
 */
export const AccessTokenResponseType = t.type(
    {
        token_type: t.literal('Bearer'),
        access_token: t.string,
        // even if we ask for offline token, google excludes refresh_token in testing
        refresh_token: t.union([t.string, t.undefined]),
        expiry_date: t.union([t.number, t.null, t.undefined]),
        id_token: t.string,
        scope: t.string,
    },
    'AccessTokenResponse'
);
export type AccessTokenResponse = t.TypeOf<typeof AccessTokenResponseType>;
export const UserType = t.type(
    {
        sub: t.string,
        token: AccessTokenResponseType,
    },
    'User'
);
export type User = t.TypeOf<typeof UserType>;
export const SecretType = t.type(
    {
        client_id: t.string,
        client_secret: t.string,
        session_secret: t.type(
            {
                keys: t.array(
                    t.type(
                        {
                            kty: t.string,
                            kid: t.string,
                            // other fields omitted
                        },
                        'JWK'
                    )
                ),
            },
            'JWKSet'
        ),
    },
    'Secret'
);
export type Secret = t.TypeOf<typeof SecretType>;

export const SessionType = t.type(
    {
        sub: t.string,
    },
    'Session'
);
export type Session = t.TypeOf<typeof SessionType>;
