import assert from 'assert';
import { isRight } from 'fp-ts/lib/Either.js';

import { createSessionCookie, ISSUER, verifySessionCookie } from '../session.js';
describe('session', function () {
    it('round trip should be identity', async function () {
        const signed = createSessionCookie({ sub: 'me' });
        const verified = await verifySessionCookie(signed);
        assert.ok(isRight(verified));
        const { sub } = verified.right;
        assert.deepEqual({ sub: 'me' }, { sub });
    });
    it('iss should be set', async () => {
        const signed = createSessionCookie({ sub: 'me' });
        const verified = await verifySessionCookie(signed);
        assert.ok(isRight(verified));
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
        assert.equal(ISSUER, (verified.right as any).iss);
    });
});
