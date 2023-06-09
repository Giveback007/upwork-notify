type AnyObj = {
    [key: string | number | symbol]: any;
};

type HashType = 'md5' | 'sha1' | 'sha256' | 'sha512' | 'sha3-256' | 'sha3-512' | 'blake2b512' | 'blake2s256';

// -- TUPELIFY -- //
type UnionToIntersection<U> = (
    U extends never ? never : (arg: U) => never
) extends (arg: infer I) => void ? I : never;
  
type UnionToTuple<T> = UnionToIntersection<
    T extends never ? never : (t: T) => T
> extends (_: never) => infer W
    ? [...UnionToTuple<Exclude<T, W>>, W]
    : [];

type TupleKeys<T> = UnionToTuple<keyof T>;