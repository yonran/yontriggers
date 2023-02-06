import { isRight } from 'fp-ts/lib/Either.js';
import type * as t from 'io-ts';
import { PathReporter } from 'io-ts/lib/PathReporter.js';
export function decodeAs<A, O>(type: t.Type<A, O, unknown>, obj: unknown): A {
    const decoded = type.decode(obj);
    if (isRight(decoded)) {
        return decoded.right;
    } else {
        console.info('could not parse as', type.name, ':', obj);
        throw new Error(PathReporter.report(decoded).join('; '));
    }
}
export function assertDefined<T>(x: T | undefined | null, name: string): T {
    if (x == null) throw Error(`${name} was null`);
    else return x;
}
