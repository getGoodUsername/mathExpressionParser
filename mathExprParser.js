function isNumber(num)
{
    return !Number.isNaN(+num);
}

function isOpeningParen(char)
{
    return char === '(';
}

function isClosingParen(char)
{
    return char === ')';
}

function isValidOperator(operator)
{
    switch (operator)
    {
        case '*': case '/': case '+': case '-':
            return true;
        default:
            return false;
    }
}

function getOperatorPrecedence(operator)
{
    // TODO: handle left to right vs right to left associativity
    if (!isValidOperator(operator)) return 3;
    switch (operator)
    {
        // the lower the number, the earlier the operator executes.
        case '*': case '/':
            return 1;
        case '+': case '-':
            return 2;
        default:
            return 3;
    }
}

function getOperatorExecutor(operator)
{
    switch (operator)
    {
        case '*':
            return (a, b) => a * b;
        case '/':
            return (a, b) => a / b;
        case '+':
            return (a, b) => a + b;
        case '-':
            return (a, b) => a - b;
        default:
            return (a, b) => NaN; // eslint-disable-line no-unused-vars
    }
}

function infixToRPN(mathExpression)
{
    function getNumber(str)
    {
        const unaryRe = /^[+-]$/;
        const floatingPointRe = /^\d+\.\d+/y;
        const integerRe = /^\d+/y;

        const numberHasUnaryOperator = unaryRe.test(str[0]);
        const sign = (() =>
        {
            if (numberHasUnaryOperator) return str[0] === '-' ? -1 : 1;
            return 1;
        })(); // IIFE
        const operatingStr = numberHasUnaryOperator ? str.slice(1) : str;

        /**
         * Think about as flattening out an expression to get out whats
         * expected from this function, a number. Also remember, this
         * is only called in infixToRPNImpl when it expects a number.
         */
        const isPossibleSubExpression = operatingStr[0] === '(';
        if (isPossibleSubExpression)
        {
            const expression = (() =>
            {
                let parenDepth = 1; // counting early openingParen from isPossibleSubExpression
                const expressionArray = ['('];

                for (let i = 1; parenDepth !== 0 && i < operatingStr.length; i += 1)
                {
                    const char = operatingStr[i];
                    if (isOpeningParen(char)) parenDepth += 1;
                    if (isClosingParen(char)) parenDepth -= 1;
                    expressionArray.push(char);
                }

                return expressionArray.join('');
            })(); // IIFE
            const value = sign * calc(expression); // eslint-disable-line no-use-before-define
            const isValidNumber = true;

            return {
                value,
                isValidNumber,
                length: expression.length + numberHasUnaryOperator,
            };
        }
        // else just a number, continue as normal

        const isFloatingPoint = floatingPointRe.test(operatingStr);
        const isInteger = integerRe.test(operatingStr);
        const isValidNumber = isFloatingPoint || isInteger;

        const numberLengthWithoutSign = isFloatingPoint
            ? floatingPointRe.lastIndex : integerRe.lastIndex;
        const numberStr = operatingStr.slice(0, numberLengthWithoutSign);

        /**
         * watch out on the length of the expression
         * unary plus may catch you off guard (since filtered
         * out after parseFloat is executed).
         */
        return {
            value: sign * parseFloat(numberStr),
            isValidNumber,
            length: numberStr.length + numberHasUnaryOperator,
        };
    }

    const ExpressionComponentTypes = Object.freeze({
        initDefault: 'initDefault',
        operator: 'operator',
        aNumber: 'aNumber',
        openParen: '(',
        closedParen: ')',
    });

    let parenDepth = 0;
    const RPNRepresentation = [];
    /**
     * Website to help thinking process:
     * https://www.free-online-calculator-use.com/infix-to-postfix-converter.html
     */
    function infixToRPNImpl(currMathExpression)
    {
        const operatorStack = [];
        const popOffRemainingOperatorsBeforeReturn = () =>
        {
            while (operatorStack.length) RPNRepresentation.push(operatorStack.pop());
        };

        let prevExpressionComponentType = ExpressionComponentTypes.initDefault;
        const addANumberToRPNRepresentation = (currIndex) =>
        {
            const number = getNumber(currMathExpression.slice(currIndex));
            if (!number.isValidNumber) throw Error(`Invalid Expression: ${mathExpression}`);
            RPNRepresentation.push(number.value.toString());
            prevExpressionComponentType = ExpressionComponentTypes.aNumber;
            return number.length;
        };

        for (let i = 0; i < currMathExpression.length; i += 1)
        {
            const currentChar = currMathExpression[i]; // eslint-disable-line

            if (isOpeningParen(currMathExpression[i]))
            {
                /**
                 * to handle parenthesis just treat them as their own
                 * expression island, with their own operatorStack, but
                 * still pushing to the same RPNRepresentation stack.
                 */
                parenDepth += 1;
                prevExpressionComponentType = ExpressionComponentTypes.openParen;
                /**
                 * final + 1 accounts for being slice(i + 1) not slice(i)
                 * in order to skip current openParen. after this expression
                 * is executed, currMathExpression[i] will be eq to the closing
                 * paren pair OR the final currExpression element if and only if
                 * the closing paren is to be omitted.
                 */
                i += infixToRPNImpl(currMathExpression.slice(i + 1)) + 1;
            }
            else if (isClosingParen(currMathExpression[i]))
            {
                parenDepth -= 1;
                prevExpressionComponentType = ExpressionComponentTypes.closedParen;
                popOffRemainingOperatorsBeforeReturn();
                return i;
                /**
                 * calling function will set new index
                 * according to how many iterations the called func
                 * (aka this func call) elapsed. Thats the reason for
                 * returning i.
                 */
            }
            else if (prevExpressionComponentType === ExpressionComponentTypes.operator)
            {
                // next thing must be a number: - or + are now treated as unary
                i += addANumberToRPNRepresentation(i) - 1;
            }
            else if (isValidOperator(currMathExpression[i]))
            {
                // it must be unary operator with a number
                if (prevExpressionComponentType === ExpressionComponentTypes.initDefault)
                {
                    i += addANumberToRPNRepresentation(i) - 1;
                }
                else
                {
                    const operator = currMathExpression[i];
                    if (operatorStack.length === 0) operatorStack.push(operator);
                    else
                    {
                        while (operatorStack.length > 0
                            && getOperatorPrecedence(operatorStack[operatorStack.length - 1])
                            <= getOperatorPrecedence(operator))
                        {
                            RPNRepresentation.push(operatorStack.pop());
                        }
                        operatorStack.push(operator);
                    }
                    prevExpressionComponentType = ExpressionComponentTypes.operator;
                }
            }
            else
            {
                // -1 accounts for loop auto increment
                i += addANumberToRPNRepresentation(i) - 1;
            }
        }

        popOffRemainingOperatorsBeforeReturn();
        return currMathExpression.length - 1; // only useful if expression is missing paren pair.
    }

    infixToRPNImpl(mathExpression.replace(/ /g, ''));

    if (parenDepth !== 0) throw Error(`Invalid Expression: ${mathExpression}`);

    return RPNRepresentation;
}

function RPNToResult(RPNRepresentation = [])
{
    let i = 0;
    while (
        RPNRepresentation.length > 1 // done, remaining element is the result.
        && i < RPNRepresentation.length
        && i >= 0)
    {
        if (!isValidOperator(RPNRepresentation[i])) i += 1;
        else if (i >= 2 && RPNRepresentation.slice(i - 2, i).every(isNumber))
        {
            const operator = RPNRepresentation[i];
            const [a, b] = RPNRepresentation.slice(i - 2, i).map(parseFloat);
            const result = getOperatorExecutor(operator)(a, b);
            RPNRepresentation.splice(i - 2, 3, result.toString());
            i -= 1;
        }
        else return NaN;
    }

    return parseFloat(RPNRepresentation[0]);
}

function calc(expression)
{
    return RPNToResult(infixToRPN(expression));
};
