import * as assert from 'assert';
import { Term, ASTKinds, Command } from './grammar/arith-pegjs';
import { createInfo, dummy_info, exhaustiveCheck, info } from './utils';

////////////////////////////////////////////////////////////////////////////////
// Data types
export type term =
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
    }
  | {
      readonly kind: 'zero';
      readonly info: info;
    }
  | {
      readonly kind: 'succ';
      readonly n: term;
      readonly info: info;
    }
  | {
      readonly kind: 'pred';
      readonly n: term;
      readonly info: info;
    }
  | {
      readonly kind: 'is_zero';
      readonly n: term;
      readonly info: info;
    };

export type command = {
  readonly kind: 'eval';
  readonly term: term;
  readonly info: info;
};

////////////////////////////////////////////////////////////////////////////////
// Convert data types

function remove_term_name(term: Term): term {
  const info = createInfo(term);
  switch (term.kind) {
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
        condition: remove_term_name(term.condition),
        then: remove_term_name(term.then),
        else: remove_term_name(term.else),
        info,
      };
    case ASTKinds.ZeroTerm:
      return {
        kind: 'zero',
        info,
      };
    case ASTKinds.IsZeroTerm:
      return {
        kind: 'is_zero',
        n: remove_term_name(term.n),
        info,
      };
    case ASTKinds.SuccTerm:
      return {
        kind: 'succ',
        n: remove_term_name(term.n),
        info,
      };
    case ASTKinds.PredTerm:
      return {
        kind: 'pred',
        n: remove_term_name(term.n),
        info,
      };
    default:
      return exhaustiveCheck(term);
  }
}

////////////////////////////////////////////////////////////////////////////////
// Printing

export function term2string(term: term): string {
  switch (term.kind) {
    case 'true':
      return 'true';
    case 'false':
      return 'false';
    case 'zero':
      return '0';
    case 'if':
      const condition = term2string(term.condition);
      const then = term2string(term.then);
      const else_ = term2string(term.else);
      return `if ${condition} then ${then} else ${else_}`;
    case 'pred':
      return `(pred ${term2string(term.n)})`;
    case 'succ':
      return `(succ ${term2string(term.n)})`;
    case 'is_zero':
      return `(is_zero ${term2string(term.n)})`;
    default:
      return exhaustiveCheck(term);
  }
}

////////////////////////////////////////////////////////////////////////////////
// Evaluation

function smallStepEvaluation(term: term): undefined | term {
  if (term.kind === 'if' && term.condition.kind === 'true') {
    return term.then;
  }
  if (term.kind === 'if' && term.condition.kind === 'false') {
    return term.else;
  }

  if (term.kind === 'if') {
    const condition = smallStepEvaluation(term.condition);
    if (condition === undefined) return undefined;
    return { ...term, condition };
  }
  if (term.kind === 'succ') {
    const n = smallStepEvaluation(term.n);
    if (n === undefined) return undefined;
    return { ...term, n };
  }
  if (term.kind === 'pred' && term.n.kind === 'zero') {
    return term.n;
  }
  if (term.kind === 'pred' && term.n.kind === 'succ') {
    return term.n.n;
  }
  if (term.kind === 'pred') {
    const n = smallStepEvaluation(term.n);
    if (n === undefined) return undefined;
    return { ...term, n };
  }
  if (term.kind === 'is_zero' && term.n.kind === 'zero') {
    return { kind: 'true', info: dummy_info };
  }
  if (term.kind === 'is_zero' && term.n.kind === 'succ') {
    return { kind: 'false', info: dummy_info };
  }
  if (term.kind === 'is_zero') {
    const n = smallStepEvaluation(term.n);
    if (n === undefined) return undefined;
    return { ...term, n };
  }

  return undefined;
}

export function evaluation(term: term): term {
  const t = smallStepEvaluation(term);
  return t === undefined ? term : evaluation(t);
}

////////////////////////////////////////////////////////////////////////////////
// Process commands

function process_command(command: command) {
  assert.strictEqual(command.kind, 'eval' as const);
  return {
    string: term2string(evaluation(command.term)) + ';\n',
  } as const;
}

export const process_commands = (commands: ReadonlyArray<Command>) =>
  commands
    .map(
      command =>
        process_command({
          kind: 'eval',
          info: createInfo(command),
          term: remove_term_name(command.term),
        }).string
    )
    .join('');
