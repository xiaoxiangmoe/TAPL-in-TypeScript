export type Result<T, E> =
  | {
      readonly kind: 'OK';
      readonly value: T;
    }
  | {
      readonly kind: 'Err';
      readonly err: E;
    };

export const OK = <T>(value: T) => ({ kind: 'OK', value } as const);
export const Err = <E>(err: E) => ({ kind: 'Err', err } as const);
