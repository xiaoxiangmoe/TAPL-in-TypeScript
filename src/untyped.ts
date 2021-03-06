import { ASTKinds, Term, Command } from './grammar/untyped-pegjs';
import { createInfo, exhaustiveCheck, info } from './utils';

////////////////////////////////////////////////////////////////////////////////
// Data types

export type term =
  | {
      readonly kind: 'variable';
      readonly de_bruijn_index: number;
      readonly info: info;
    }
  | {
      readonly kind: 'abstraction';
      readonly parameter_name: string;
      readonly body: term;
      readonly info: info;
    }
  | {
      readonly kind: 'application';
      readonly func: term;
      readonly argument: term;
      readonly info: info;
    };

export type binding = {
  readonly kind: 'NameBind';
};
const NameBind = { kind: 'NameBind' } as const;

export type context = ReadonlyArray<{
  readonly name: string;
  readonly binding: binding;
}>;

export type command =
  | {
      readonly kind: 'eval';
      readonly term: term;
      readonly info: info;
    }
  | {
      readonly kind: 'bind';
      readonly name: string;
      readonly binding: binding;
      readonly info: info;
    };

////////////////////////////////////////////////////////////////////////////////
// Convert data types

function remove_term_name(term: Term, context: context): term {
  const info = createInfo(term);
  switch (term.kind) {
    case ASTKinds.AbstractionTerm:
      const { parameter_name } = term;
      return {
        kind: 'abstraction',
        parameter_name,
        body: remove_term_name(term.body, add_name(context, parameter_name)),
        info,
      };
    case ASTKinds.ApplicationTerm:
      return {
        kind: 'application',
        func: remove_term_name(term.func, context),
        argument: remove_term_name(term.argument, context),
        info,
      };
    case ASTKinds.VariableTerm:
      return {
        kind: 'variable',
        de_bruijn_index: name2index(info, context, term.name),
        info,
      };
    default:
      return exhaustiveCheck(term);
  }
}

////////////////////////////////////////////////////////////////////////////////
// Printing

export function term2string(context: context, term: term): string {
  switch (term.kind) {
    case 'variable':
      return index2name(term.info, context, term.de_bruijn_index);
    case 'application':
      const func = term2string(context, term.func);
      const argument = term2string(context, term.argument);
      return `(${func} ${argument})`;
    case 'abstraction':
      const { parameter_name } = term;
      const body_context = add_name(context, parameter_name);
      const body = term2string(body_context, term.body);
      return `(λ ${parameter_name}. ${body})`;
    default:
      return exhaustiveCheck(term);
  }
}

////////////////////////////////////////////////////////////////////////////////
// Context management
// 这里和书上的实现略有不同
// 书上会再用 pickfreshname 给重名的参数名自动加 "'" 用来区分
// 这里删掉这个功能了, 直接用 add_name

const add_binding = (
  context: context,
  name: string,
  binding: binding
): context => [{ name, binding }, ...context];

const add_name = (context: context, name: string): context =>
  add_binding(context, name, NameBind);

const index2name = (
  info: info,
  context: context,
  de_bruijn_index: number
): string => context[de_bruijn_index].name;
const name2index = (info: info, context: context, name: string): number =>
  context.findIndex(x => x.name == name);

////////////////////////////////////////////////////////////////////////////////
// Shifting

/**
 * The d-place shift of a term t above cutoff c
 *
 * @param d d-place shift
 * @param c above cutoff c
 * @param t term t
 */
function termShiftAbove(d: number, c: number, t: term): term {
  switch (t.kind) {
    case 'variable':
      const k = t.de_bruijn_index;
      return {
        ...t,
        de_bruijn_index: k < c ? k : k + d,
      };
    case 'abstraction':
      return {
        ...t,
        body: termShiftAbove(d, c + 1, t.body),
      };
    case 'application':
      return {
        ...t,
        func: termShiftAbove(d, c, t.func),
        argument: termShiftAbove(d, c, t.argument),
      };
    default:
      return exhaustiveCheck(t);
  }
}

/**
 * The d-place shift of a term t above cutoff 0
 *
 * @param d d-place shift
 * @param t term t
 */
export const termShift = (d: number, t: term) => termShiftAbove(d, 0, t);

/**
 * [j ↦ s] t
 */
function termSubst(j: number, s: term, t: term): term {
  switch (t.kind) {
    case 'variable':
      const k = t.de_bruijn_index;
      return k === j
        ? s
        : {
            ...t,
            de_bruijn_index: k,
          };
    case 'abstraction':
      return {
        ...t,
        body: termSubst(j + 1, termShift(1, s), t.body),
      };
    case 'application':
      return {
        ...t,
        func: termSubst(j, s, t.func),
        argument: termSubst(j, s, t.argument),
      };
    default:
      return exhaustiveCheck(t);
  }
}

/**
 * ((λ. t) s)
 */
const termSubstTop = (s: term, t: term) =>
  termShift(-1, termSubst(0, termShift(1, s), t));

////////////////////////////////////////////////////////////////////////////////
// Evaluation

const is_value = (term: term) => term.kind === 'abstraction';

function smallStepEvaluation(term: term): term | undefined {
  if (
    term.kind === 'application' &&
    term.func.kind === 'abstraction' &&
    // (is_value(term.argument) || term.argument.kind === 'variable')
    is_value(term.argument)
  ) {
    return termSubstTop(term.argument, term.func.body);
  }

  if (term.kind === 'application') {
    if (is_value(term.func)) {
      const argument = smallStepEvaluation(term.argument);
      if (argument === undefined) return undefined;
      return {
        ...term,
        argument,
      };
    } else {
      const func = smallStepEvaluation(term.func);
      if (func === undefined) return undefined;
      return {
        ...term,
        func,
      };
    }
  }
  return undefined;
}

export function evaluation(term: term): term {
  const t = smallStepEvaluation(term);
  return t === undefined ? term : evaluation(t);
}

////////////////////////////////////////////////////////////////////////////////
// Process commands

function process_command(context: context, command: command) {
  switch (command.kind) {
    case 'bind':
      const { name } = command;
      return {
        string: `ℬ ${name};\n`,
        context: add_name(context, name),
      } as const;
    case 'eval':
      return {
        string: term2string(context, evaluation(command.term)) + ';\n',
        context,
      } as const;
    default:
      return exhaustiveCheck(command);
  }
}

export const process_commands = (commands: ReadonlyArray<Command>) =>
  commands.reduce<{
    readonly string: string;
    readonly context: context;
  }>(
    (prev, curr) => {
      const info = createInfo(curr);
      const command: command =
        curr.kind === ASTKinds.Eval
          ? {
              kind: 'eval',
              term: remove_term_name(curr.term, prev.context),
              info,
            }
          : {
              kind: 'bind',
              name: curr.name,
              binding: NameBind,
              info,
            };
      const ret = process_command(prev.context, command);
      return {
        string: prev.string + ret.string,
        context: ret.context,
      };
    },
    {
      string: '',
      context: [],
    }
  ).string;
