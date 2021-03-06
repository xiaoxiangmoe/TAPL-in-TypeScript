export type PosInfo = {
  readonly overallPos: number;
  readonly line: number;
  readonly offset: number;
};

export type info =
  | {
      readonly kind: 'UNKNOWN';
    }
  | {
      readonly kind: 'FILE_INFORMATION';
      // readonly filename: string;
      readonly start: PosInfo;
      readonly end: PosInfo;
    };

export const dummy_info: info = {
  kind: 'UNKNOWN',
} as const;

export const createInfo = (
  // filename: string,
  {
    start,
    end,
  }: {
    readonly start: PosInfo;
    readonly end: PosInfo;
  }
): info => ({
  kind: 'FILE_INFORMATION',
  // filename,
  start,
  end,
});

export const infoToString = (info: info) =>
  info.kind === 'UNKNOWN'
    ? 'Unknown file and line>' // : `${info.filename}:${info.start.line}.${info.start.offset}`;
    : `filename:${info.start.line}.${info.start.offset + 1}`;
