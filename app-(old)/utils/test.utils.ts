/**
 * Checks if object has the key, made as a function for type transfer.
 *
 * Uses `obj.hasOwnProperty(key)` instead of `key in obj`
 *
 * https://stackoverflow.com/questions/13632999/if-key-in-object-or-ifobject-hasownpropertykey
 */
export const hasKey = <
    K extends (string | number)
>(obj: any, key: K): obj is { [P in K]: any } =>
  isType(obj, 'object') && obj.hasOwnProperty(key);


/// --- Type Guards --- ///

/**
 * The function will test if the type of the first
 * argument equals testType. Argument testType is a string
 * representing a javascript type.
 *
 * @param val value to be tested
 * @param testType to check if typeof val === testType
 * @example
 * ```js
 * isType([], 'array') //=> true
 * isType(null, 'undefined') //=> false
 * ```
 */
export const isType = <T extends JsType> (
    val: any, testType: T
): val is JsTypeFind<T> => type(val) === testType;

/** An extended `typeof` */
export function type(val: any): JsType {
    if (val === null) return 'null';
    if (Array.isArray(val)) return 'array';
    if (val !== val) return 'NaN';
    if (val instanceof Date) return 'Date';
    if (val instanceof Map) return 'Map';
    if (val instanceof Set) return 'Set';
    if (val instanceof RegExp) return 'RegExp';
    return typeof val;
}

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
    | 'Set'
    | 'RegExp'
    | 'never';

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
    S extends 'RegExp'      ? RegExp :
    never;
