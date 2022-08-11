/* Everything in Egg is an expression.
*
* do-|
*    |-define-|
*    |        |-x
*    |        |-10
*    |
*    |-print-|
*            |-x
 *
 * An expression can be the name of a binding, a number, a string or an application.
 *
 * A string is simply a sequence of characters that are not double quotes,
 * wrapped in double quotes.
 *
 * A number is a sequence of digits.
 *
 * Binding names can consist of any character that is not whitespace
 * and that does not have special meaning in the syntax.
 *
 * The data structure that the parser will use to describe a program
 * consists of EXPRESSION OBJECTS, each of which has a type property
 * indicating the kind of expression it is and other properties to
 * describe its content.
 *
 * Expressions of type "value" represent literal strings or numbers.
 * Their value property contains the string or number value that they
 * represent.
 * 
 * Expressions of type "valid identifier" are used for identifiers (names). Such
 * objects have a "name" property that holds the identifier's name as
 * a string.
 *
 * Expressions of type "apply" represent applications. They have an
 * "operator" property that refers to the expression that is being
 * applied, as well as an "args" property that holds an array of
 * argument expressions.
 *
 */

/**
 * Because Egg allows any amount of whitespace between its
 * elements, we have to repeatedly cut the whitespace off the
 * start of the program string. That is what the "skipSpace"
 * function is for.
 */
function skipSpace(string) {
  let first = string.search(/\S/);
  if (first == -1) return "";
  return string.slice(first);
}

/**
 * After skipping any leading space, "parseExpression" uses three
 * regular expressions to spot the three atomic elements that Egg
 * supports: strings, numbers, and valid identifiers.
 *
 * The parser constructs a
 * different kind of data structure depending on which one matches.
 * If the input doesn't match any of them, it is not valid, and the parser
 * throws an error.
 */
function parseExpression(program) {
  program = skipSpace(program);
  let match, expr;

  if ((match = /^"([^"]*)"/.exec(program))) {
    expr = { type: "value", value: match[1] };
  } else if ((match = /^\d+\b/.exec(program))) {
    expr = { type: "value", value: Number(match[0]) };
  } else if ((match = /^[^\s(),#"]+/.exec(program))) {
    expr = { type: "valid identifier", name: match[0] };
  } else {
    if (program === "") {
      program = "you typed nothing";
    }
    throw new SyntaxError("Unexpected syntax: " + program);
  }

  return parseApply(expr, program.slice(match[0].length));
}

/**
 * We then cut off the part that was matched from the program string
 * and pass that, along with the object for the expression, to
 * "parseApply", which checks whether the expression is an application.
 * If so, it parses a parenthesized list of arguments.
 *
 * If the next character is not an opening parenthesis, this is
 * not an application, and "parseApply" returns the expression it
 * was given.
 *
 * Otherwise, it skips the opening parenthesis and creates the syntax
 * tree object for this application expression. It then recursively
 * calls "parseExpression" to parse each argument until a closing
 * parenthesis is found. The recursion is indirect, through "parseApply"
 * and "parseExpression" calling each other.
 *
 * Because an application expression can itself be applied (such as in
 * multiplier(2)(1)), "parseApply" must, after it has parsed an application,
 * call itself again to check whether another pair of parenthesis follows.
 *
 */

function parseApply(expr, program) {
  program = skipSpace(program);
  if (program[0] != "(") {
    return { expr, rest: program };
  }

  expr = {
    type: "apply",
    operator: expr,
    args: [],
  };
  // Removes "(" character since expression is an application
  program = skipSpace(program.slice(1));

  while (program[0] != ")") {
    let arg = parseExpression(program);
    expr.args.push(arg.expr);
    program = skipSpace(arg.rest);

    if (program[0] == ",") {
      program = skipSpace(program.slice(1));
    } else if (program[0] != ")") {
      throw new SyntaxError("Expected ',' or ')'");
    }
  }

  return parseApply(expr, program.slice(1));
}

/**
 * This is all we need to parse Egg. We wrap it in a convenient "parse"
 * function that verifies that it has reached the end of the input string
 * after parsing the expression (an Egg program is a single expression),
 * and that gives us the program's data structure.
 *
 */

function parse(program) {
  let { expr, rest } = parseExpression(program);
  if (skipSpace(rest).length > 0) {
    throw new SyntaxError("Unexpected text after program: " + rest);
  }

  return expr;
}

/**
 * What can we do with the syntax tree for a program ? Run it, of course!
 * And that is what the evaluator does. You give it a syntax tree and a
 * scope object that associates names with values, and it will evaluate
 * the expression that the tree represets and return the value that is
 * it produces.
 */

/**
 * The evaluator has code for each of the expression types. A literal
 * value expression produces its value. (For example, the expression 100
 * just evaluates to the number 100.). For a binding, we must check
 * whether it is actually defined in the scope and, if it is, fetch the
 * binding value.
 *
 * Applications are more involved. If they are a special form, like "if",
 * we do not evaluate anything and pass the argument expressions, along
 * with the scope, to the function that handles this form. If it is a
 * normal call, we evaluate the operator, verify that it is a function,
 * and call it with the evaluated arguments.
 *
 * The recursive structure of evaluate resembles the similar structure
 * of the parser, and both mirror the structure of the language itself.
 * It would also be possible to integrate the parser with the evaluator
 * and evaluate during parsing, but splitting them up this way makes the
 * program clearer.
 */

function evaluate(expr, scope) {
  if (expr.type == "value") {
    return expr.value;
  } else if (expr.type == "valid identifier") {
    if (expr.name in scope) {
      return scope[expr.name];
    } else {
      throw new ReferenceError(`Undefined binding: ${expr.name}`);
    }
  } else if (expr.type == "apply") {
    let { operator, args } = expr;
    if (operator.type == "valid identifier" && operator.name in specialForms) {
      return specialForms[operator.name](expr.args, scope);
    } else {
      let op = evaluate(operator, scope);
      if (typeof op == "function") {
        return op(...args.map((arg) => evaluate(arg, scope)));
      } else {
        throw new TypeError("Applying a non-function.");
      }
    }
  }
}

/**
 * The "specialForms" object is used to define special syntax in
 * Egg. It associates valid identifiers with functions that evaluate such forms.
 */
const specialForms = Object.create(null);

/**
 * Egg's "if" construct expects exactly three arguments. It will
 * evaluate the first, and if the result isn't the value false, it
 * will evaluate the second. Otherwise, the third gets evaluated.
 * This "if" form is similar to JavaScript's ternary ?: operator than
 * to it's "if". It is an expression, not a statement, and it produces
 * a value, namely, the result of the second or third argument.
 */
specialForms.if = (args, scope) => {
  if (args.length != 3) {
    throw new SyntaxError("Wrong number of arguments to if");
  } else if (evaluate(args[0], scope) !== false) {
    return evaluate(args[1], scope);
  } else {
    return evaluate(args[2], scope);
  }
};

/**
 * The reason we need to represent "if" as a special form, rather than
 * a regular function, is that all arguments to functions are evaluated
 * before the function is called, whereas "if" should evaluate only either
 * its second or its third argument, depending on the value of the first.
 * The "while" form is similar.
 */

specialForms.while = (args, scope) => {
  if (args.length != 2) {
    throw new SyntaxError("Wrong number of args to while");
  }
  while (evaluate(args[0], scope) !== false) {
    evaluate(args[1], scope);
  }

  // Since undefined does not exist in Egg, we return false
  // for lack of a better result.
  return false;
};

/**
 * Another basic building block is "do", which executes all its arguments
 * from top to bottom. Its value is the value produced by the last
 * argument.
 */
specialForms.do = (args, scope) => {
  let value = false;
  for (let arg of args) {
    value = evaluate(arg, scope);
  }

  return value;
};

/**
 * To be able to create bindings and give them new values, we also create
 * a form called "define". It expects a valid identifier as its first argument and an
 * expression producing the value to assign to that valid identifier as its second
 * argument. Since "define", like everything, is an expression, it must
 * return a value. We'll make it return the value that was assigned
 * (just like JavaScript's = operator).
 */
specialForms.define = (args, scope) => {
  if (args.length != 2 || args[0].type != "valid identifier") {
    throw new SyntaxError("Incorrect use of define");
  }

  let value = evaluate(args[1], scope);
  scope[args[0].name] = value;

  return value;
};

/**
 * The scope accepted by evaluate is an object with properties whose
 * names correspond to binding names and whose values correspong to the
 * values those bindings are bound to. Let's define an object to represent
 * the global scope.
 *
 * To be able to use the "if" construct we just defined, we must have
 * access to Boolean values. Since there are only two Boolean values, we
 * do not need special syntax for them. We simply bind two names to the
 * values "true" and "false" and use them.
 */
const topScope = Object.create(null);
topScope.true = true;
topScope.false = false;

/**
 * To supply basic arithmetic and comparison operators, we will also
 * add some function values to the scope. In the interest of keeping the
 * code short, we'll use "Function" to synthesize a bunch of operator
 * functions in a loop, instead of defining them individually.
 */
for (let op of ["+", "-", "*", "/", "==", "<", ">"]) {
  topScope[op] = Function("a, b", `return a ${op} b`);
}

/**
 * A way to output values is also useful, so we'll wrap console.log in a
 * function and call it print.
 */
topScope.print = (value) => {
  console.log(value);
  return value;
};

/**
 * Support for arrays to Egg by adding a function to construct an array
 * containing the argument values: "array(...values)"
 */
topScope.array = (...values) => values;

/**
 * Another function "length(array)" to get an array's length
 */
topScope.length = (array) => array.length;

/**
 * And another function "element(array, n)" to fetch the nth element from an
 * array
 */
topScope.element = (array, n) => array[n];

/**
 * "run" provides a convenient way to parse a program and run it in a
 * fresh scope.
 */
function run(program) {
  return evaluate(parse(program), Object.create(topScope));
}

/**
 * A programming language without functions is a poor programming
 * language indeed. Fortunately, it isn't hard to add a "fun"
 * construct, which treats its last argument as the function's
 * body and uses all arguments before that as the names of the
 * function's parameters.
 *
 * Functions in Egg get their own local scope. The function produced
 * by the fun form creates this local scope and adds the argument bindings
 * to it. It then evaluates the function body in this scope and returns the
 * result.
 */
specialForms.fun = (args, scope) => {
  if (!args.length) {
    throw new SyntaxError("Functions need a body");
  }

  let body = args[args.length - 1];
  let params = args.slice(0, args.length - 1).map((expr) => {
    if (expr.type != "valid identifier") {
      throw new SyntaxError("Parameter names must be valid identifiers");
    }

    return expr.name;
  });

  return function () {
    if (arguments.length != params.length) {
      throw new TypeError("Wrong number of arguments");
    }

    let localScope = Object.create(scope);
    for (let i = 0; i < arguments.length; i++) {
      localScope[params[i]] = arguments[i];
    }

    return evaluate(body, localScope);
  };
};

run(`

do(
  define(x, array(1, 2)),
  print(x)
)

`);
