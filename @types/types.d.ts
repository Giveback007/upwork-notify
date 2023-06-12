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

// -- JS-Types -- //
type JsType =
    | 'array'
    | 'bigint'
    | 'boolean'
    | 'function'
    | 'NaN'
    | 'null'
    | 'number'
    | 'object'
    | 'string'
    | 'symbol'
    | 'undefined'
    | 'Date'
    | 'Map'
    | 'Set';

type JsTypeFind<S extends JsType> =
    S extends 'array'       ? any[] :
    S extends 'bigint'      ? bigint :
    S extends 'boolean'     ? boolean :
    S extends 'function'    ? Function :
    S extends 'NaN'         ? typeof NaN :
    S extends 'null'        ? null :
    S extends 'number'      ? number :
    S extends 'object'      ? object :
    S extends 'string'      ? string :
    S extends 'symbol'      ? symbol :
    S extends 'undefined'   ? undefined :
    S extends 'Date'        ? Date :
    S extends 'Map'         ? Map<any, any> :
    S extends 'Set'         ? Set<any> :
    never;