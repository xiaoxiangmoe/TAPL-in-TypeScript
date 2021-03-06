import * as assert from 'assert';
import { isEqual } from 'lodash';
import { ASTKinds, Command, Term, Type } from './grammar/simplebool-pegjs';
import {
  createInfo,
  Err,
  exhaustiveCheck,
  info,
  infoToString,
  OK,
  Result,
} from './utils';

////////////////////////////////////////////////////////////////////////////////
// Data types

export type type =
  | {
      readonly kind: 'Bool';
    }
  | {
      readonly kind: 'Arrow';
      readonly parameter: type;
      readonly body: type;
    };
const typeEqual = (a: type, b: type) => isEqual(a, b);
export type term =
  | {
      readonly kind: 'variable';
      readonly de_bruijn_index: number;
      readonly info: info;
    }
  | {
      readonly kind: 'abstraction';
      readonly parameter_name: string;
      readonly parameter_type: type;
      readonly body: term;
      readonly info: info;
    }
  | {
      readonly kind: 'application';
      readonly func: term;
      readonly argument: term;
      readonly info: info;
    }
  | {
      readonly kind: 'true';
      readonly info: info;
    }
  | {
      readonly kind: 'false';
      readonly info: info;
    }
  | {
      readonly kind: 'if';
      readonly condition: term;
      readonly then: term;
      readonly else: term;
      readonly info: info;
    };

export type binding =
  | {
      readonly kind: 'NameBind';
    }
  | {
      readonly kind: 'VarBind';
      readonly type: type;
    };
const NameBind = { kind: 'NameBind' } as const;
const VarBind = (type: type) => ({ kind: 'VarBind', type } as const);

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
      readonly type: type;
      readonly info: info;
    };

////////////////////////////////////////////////////////////////////////////////
// Convert data types

function remove_type_name(type: Type): type {
  switch (type.kind) {
    case ASTKinds.BoolType:
      return {
        kind: 'Bool',
      };
    case ASTKinds.ArrowType:
      return {
        kind: 'Arrow',
        parameter: remove_type_name(type.parameter),
        body: remove_type_name(type.body),
      };
    default:
      return exhaustiveCheck(type);
  }
}
function remove_term_name(term: Term, context: context): term {
  const info = createInfo(term);
  switch (term.kind) {
    case ASTKinds.AbstractionTerm:
      const { parameter_name } = term;
      return {
        kind: 'abstraction',
        parameter_name,
        parameter_type: remove_type_name(term.parameter_type),
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
    case ASTKinds.TrueTerm:
      return {
        kind: 'true',
        info,
      };
    case ASTKinds.FalseTerm:
      return {
        kind: 'false',
        info,
      };
    case ASTKinds.IfTerm:
      return {
        kind: 'if',
        condition: remove_term_name(term.condition, context),
        then: remove_term_name(term.then, context),
        else: remove_term_name(term.else, context),
        info,
      };
    default:
      return exhaustiveCheck(term);
  }
}

////////////////////////////////////////////////////////////////////////////////
// Printing

export function type2string(type: type): string {
  switch (type.kind) {
    case 'Bool':
      return 'Bool';
    case 'Arrow':
      const parameter = type2string(type.parameter);
      const body = type2string(type.body);
      return `(${parameter} → ${body})`;
    default:
      return exhaustiveCheck(type);
  }
}
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
      const parameter_type = type2string(term.parameter_type);
      return `(λ ${parameter_name}: ${parameter_type}. ${body})`;
    case 'true':
      return 'true';
    case 'false':
      return 'false';
    case 'if':
      const condition = term2string(context, term.condition);
      const then = term2string(context, term.then);
      const else_ = term2string(context, term.else);
      return `if ${condition} then ${then} else ${else_}`;
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
const get_binding = (
  info: info,
  context: context,
  de_bruijn_index: number
): binding => context[de_bruijn_index].binding;

const getTypeFromContext = (
  info: info,
  context: context,
  de_bruijn_index: number
) => {
  const binding = get_binding(info, context, de_bruijn_index);

  assert.strictEqual(
    binding.kind,
    'VarBind' as const,
    `getTypeFromContext: Wrong kind of binding for variable ${index2name(
      info,
      context,
      de_bruijn_index
    )}  at ${infoToString(info)}`
  );
  return binding.type;
};

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
    case 'true':
      return t;
    case 'false':
      return t;
    case 'if':
      return {
        ...t,
        condition: termShiftAbove(d, c, t.condition),
        then: termShiftAbove(d, c, t.then),
        else: termShiftAbove(d, c, t.else),
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
    case 'true':
      return t;
    case 'false':
      return t;
    case 'if':
      return {
        ...t,
        condition: termSubst(j, s, t.condition),
        then: termSubst(j, s, t.then),
        else: termSubst(j, s, t.else),
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

const is_value = (term: term) =>
  term.kind === 'abstraction' || term.kind === 'true' || term.kind === 'false';

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
  if (term.kind === 'if') {
    if (is_value(term.condition)) {
      return term.condition.kind === 'true'
        ? term.then
        : term.condition.kind === 'false'
        ? term.else
        : undefined;
    } else {
      const condition = smallStepEvaluation(term.condition);
      if (condition === undefined) return undefined;
      return { ...term, condition };
    }
  }
  return undefined;
}

export function evaluation(term: term): term {
  const t = smallStepEvaluation(term);
  return t === undefined ? term : evaluation(t);
}

////////////////////////////////////////////////////////////////////////////////
// Typing

function typeOf(
  context: context,
  term: term
): Result<type, [file_info: info, text: string]> {
  const { info } = term;
  switch (term.kind) {
    case 'variable':
      return OK(getTypeFromContext(info, context, term.de_bruijn_index));
    case 'abstraction':
      const context2 = add_binding(
        context,
        term.parameter_name,
        VarBind(term.parameter_type)
      );
      const bodyTypeResult = typeOf(context2, term.body);
      if (bodyTypeResult.kind === 'Err') return bodyTypeResult;
      return OK({
        kind: 'Arrow',
        parameter: term.parameter_type,
        body: bodyTypeResult.value,
      });
    case 'application':
      const funcTypeResult = typeOf(context, term.func);
      if (funcTypeResult.kind === 'Err') return funcTypeResult;
      const funcType = funcTypeResult.value;

      const argumentTypeResult = typeOf(context, term.argument);
      if (argumentTypeResult.kind === 'Err') return funcTypeResult;
      const argumentType = argumentTypeResult.value;

      if (funcType.kind !== 'Arrow') {
        return Err([info, `arrow type expected`]);
      }
      if (!typeEqual(funcType.parameter, argumentType)) {
        return Err([info, `parameter type mismatch`]);
      }

      return OK(funcType.body);
    case 'true':
      return OK({ kind: 'Bool' });
    case 'false':
      return OK({ kind: 'Bool' });
    case 'if':
      const conditionTypeResult = typeOf(context, term.condition);
      if (conditionTypeResult.kind === 'Err') return conditionTypeResult;
      const conditionType = conditionTypeResult.value;

      const thenTypeResult = typeOf(context, term.then);
      if (thenTypeResult.kind === 'Err') return thenTypeResult;
      const thenType = thenTypeResult.value;

      const elseTypeResult = typeOf(context, term.else);
      if (elseTypeResult.kind === 'Err') return elseTypeResult;
      const elseType = elseTypeResult.value;

      if (conditionType.kind !== 'Bool') {
        return Err([info, `guard of conditional not a boolean`]);
      }
      if (!typeEqual(thenType, elseType)) {
        return Err([info, `arms of conditional have different types`]);
      }

      return OK(thenType);
    default:
      return exhaustiveCheck(term);
  }
}

////////////////////////////////////////////////////////////////////////////////
// Process commands

function process_command(context: context, command: command) {
  switch (command.kind) {
    case 'bind':
      return {
        string: `ℬ ${command.name}: ${type2string(command.type)};\n`,
        context: add_binding(context, command.name, command.binding),
      } as const;
    case 'eval':
      const typeResult = typeOf(context, command.term);
      const term = evaluation(command.term);

      if (typeResult.kind === 'Err')
        throw new Error(
          `${typeResult.err[1]}  at ${infoToString(typeResult.err[0])}`
        );
      const type = typeResult.value;
      return {
        string: `${term2string(context, term)}: ${type2string(type)};\n`,
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
          : ((): command => {
              const type = remove_type_name(curr.type);
              return {
                kind: 'bind',
                name: curr.name,
                binding: VarBind(type),
                type,
                info,
              };
            })();
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
