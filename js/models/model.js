/*
 *      Copyright (c) 2014 Samsung Electronics Co., Ltd
 *
 *      Licensed under the Flora License, Version 1.1 (the "License");
 *      you may not use this file except in compliance with the License.
 *      You may obtain a copy of the License at
 *
 *              http://floralicense.org/license/
 *
 *      Unless required by applicable law or agreed to in writing, software
 *      distributed under the License is distributed on an "AS IS" BASIS,
 *      WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *      See the License for the specific language governing permissions and
 *      limitations under the License.
 */

/*global define, console*/

/**
 * Main view module.
 *
 * @module models/model
 * @requires {@link models/errors}
 * @namespace models/model
 */
define({
    name: 'models/model',
    requires: [
        'models/errors'//,
        //'models/math.min'
    ],
    def: function initView(errors) {
        'use strict';
        /**
         * Operators.
         *
         * @memberof models/model
         * @private
         * @const {string[]}
         */
        var OPERATORS = ['+', '-', '*', '/', '^'],
        MODIFIERS = ['^2', '^3', '^-1', '!'], //Like an operator but only takes 1 parameter. "Modifies last argument"
        
        FUNCTIONS = ['sqrt(', 'sin(', 'cos(', 'tan(', 'asin(', 'acos(', 'atan(', 'log(', 'log10(', 'pow(E,', 'pow(2,', 'E'],

            /**
             * Decimal separator.
             *
             * @memberof models/model
             * @private
             * @const {string}
             */
            DECIMAL = '.',

            /**
             * Maximum count of digits in the equation.
             *
             * @memberof models/model
             * @private
             * @const {number}
             */
            MAX_DIGITS = 9,

            /**
             * Exponential regular expression.
             *
             * @memberof models/model
             * @private
             * @const {RegExp}
             */
            EXPONENTIAL_REGEXP = /E[\-\+]?$/i,

            /**
             * Open bracket sign.
             *
             * @memberof models/model
             * @private
             * @const {string}
             */
            BRACKET_OPEN = '(',

            /**
             * Close bracket sign.
             *
             * @memberof models/model
             * @private
             * @const {string}
             */
            BRACKET_CLOSE = ')',

            /**
             * Equation elements.
             *
             * @memberof models/model
             * @private
             * @type {string[]}
             */
            equation = [],

            /**
             * Indicates whether the equation is calculated or not.
             *
             * @memberof models/model
             * @private
             * @type {boolean}
             */
            calculated = false,

            /**
             * Last calculated result.
             *
             * @memberof models/model
             * @private
             * @type {number|string}
             */
            lastCalculationResult = '',
            
            /**
             * Array of past equation states
             */
            undoLog = [];

        /**
         * Returns equation.
         *
         * @memberof models/model
         * @public
         * @returns {string}
         */
        function getEquation() {
            return equation;
        }

        /**
         * Resets equation.
         *
         * @memberof models/model
         * @public
         */
        function resetEquation() {
            equation = [];
            calculated = false;
            updateUndoLog();
        }

        /**
         * Returns true if equation is empty, false otherwise.
         *
         * @memberof models/model
         * @public
         * @returns {boolean}
         */
        function isEmpty() {
            return equation.length === 0;
        }

        /**
         * Returns last component of equation.
         * If not exist, null is returned.
         *
         * @memberof models/model
         * @private
         * @param {boolean} correct
         * @returns {string|null}
         */
        function getLastComponent(correct) {
            var last = equation[equation.length - 1] || null;

            if (correct && last && last.slice(-1) === DECIMAL) {
                last = last.slice(0, -1);
                last.replace('.)', ')');
                equation[equation.length - 1] = last;
            }
            return last;
        }

        /**
         * Returns 2nd to last component of equation.
         * If not exist, null is returned.
         *
         * @memberof models/model
         * @private
         * @param {boolean} correct
         * @returns {string|null}
         */
        function getPenultimateComponent(correct) {
            var last = equation[equation.length - 2] || null;

            if (correct && last && last.slice(-1) === DECIMAL) {
                last = last.slice(0, -1);
                last.replace('.)', ')');
                equation[equation.length - 1] = last;
            }
            return last;
        }

        /**
         * Replaces last equation component with specified value.
         *
         * @memberof models/model
         * @private
         * @param {string} value
         */
        function replaceLastComponent(value) {
            var length = equation.length;

            if (length > 0) {
                equation[length - 1] = value;
                calculated = false;
            }
            updateUndoLog();
        }

        /**
         * Adds new component to equation.
         *
         * @memberof models/model
         * @private
         * @param {string} value
         */
        function addComponent(value) {
            equation.push(value);
            calculated = false;
            updateUndoLog();
        }

        /**
         * Returns true if specified value is an operator, false otherwise.
         *
         * @memberof models/model
         * @private
         * @param {string} value
         * @returns {boolean}
         */
        function isOperator(value) {
            return OPERATORS.indexOf(value) !== -1;
        }

        /**
         * Returns true if specified value is a modifier, false otherwise.
         *
         * @memberof models/model
         * @private
         * @param {string} value
         * @returns {boolean}
         */
        function isModifier(value) {
            return MODIFIERS.indexOf(value) !== -1;
        }
        
        /**
         * Returns true if specified value is a function, false otherwise.
         *
         * @memberof models/model
         * @private
         * @param {string} value
         * @returns {boolean}
         */
        function isFunction(value) {
            return FUNCTIONS.indexOf(value) !== -1;
        }

        /**
         * Checks if component is negative and fixes its format.
         *
         * @memberof models/model
         * @private
         * @param {string} component
         * @returns {string}
         */
        function checkNegativeFormat(component) {
            if (component && component.match(/^\-d+/)) {
                component = '(' + component + ')';
            }
            return component;
        }

        /**
         * Checks if component represents negative digit.
         *
         * @memberof models/model
         * @public
         * @returns {boolean}
         */
        function isNegativeComponent(component) {
            return (new RegExp('(\\()\\-(.*?)(\\))')).test(component);
        }

        /**
         * Checks if given value is one of bracket signs.
         *
         * @memberof models/model
         * @private
         * @param {string} val
         * @returns {boolean}
         */
        function isBracket(val) {
            return (val === BRACKET_CLOSE || val === BRACKET_OPEN);
        }

        function isOpenBracket(val) {
        	return (val === BRACKET_OPEN);
        }

        function isCloseBracket(val) {
        	return (val === BRACKET_CLOSE);
        }
        
        /**
         * Adds digit to equation.
         *
         * @memberof models/model
         * @public
         * @param {string} digit
         * @returns {boolean} True for success | false for fail.
         */
        function addDigit(digit) {
            /*jshint maxcomplexity:11 */
            var last = null;

            if (calculated) {
                resetEquation();
            }

            last = getLastComponent();

            // If the previous one is not a number
            // only start a new component,
            // unless there is only a minus before.
            if (
                ((!last || isOperator(last)) || isModifier(last) || isBracket(last) || isFunction(last)) &&
                (last !== '-' || equation.length > 1)
            ) {
                addComponent(digit);
                return true;
            }
            replaceLastComponent(checkNegativeFormat(last));

            if (isNegativeComponent(last) || last === '-') {
                last =
                    '(-' +
                    (RegExp.$2 === '0' ? '' : RegExp.$2) +
                    digit +
                    ')';
            } else if (last === '0') {
                last = digit;
            } else {
                last = last + digit;
            }
            if (last.replace(new RegExp('[^\\d]', 'g'), '')
                .length <= MAX_DIGITS) {
                replaceLastComponent(last);
                return true;
            }
            updateUndoLog();
            return false;
        }

        /**
         * Adds operator to equation.
         *
         * @memberof models/model
         * @public
         * @param {string} operator
         */
        function addOperator(operator) {
            var last = null, penultimate = null;

            if (calculated) {
                resetEquation();
                addComponent(lastCalculationResult);
            }

            last = getLastComponent(true);
            penultimate = getPenultimateComponent(true);

            // Operators other than '-' cannot be added to empty equations
            if (!last && operator !== '-') {
                return;
            }
            // Cannot replace minus if on first position
            if (last === '-' && equation.length === 1) {
                return;
            }
            if (last === '-' && isFunction(penultimate)) {
            	return;
            }
            //if last=='-' and penultimate is a function, then last could be overwritten to invalid operator. [like sqrt(- => sqrt(* ]

            replaceLastComponent(checkNegativeFormat(last));

            if (isOperator(last)) {
                // replace last operator with a new one
                replaceLastComponent(operator);
            } else if (isFunction(last)) {
            	if (operator === '-') {
            		addComponent(operator);
            	}
            	return;
            } else {
            
                // check for 'E' being the last character of the equation
                if (last && last.match(/E$/)) {
                    // add '-' to the number, ignore other operators
                    if (operator === '-') {
                        replaceLastComponent(last + '-');
                    }
                } else {
                    // add operator
                    addComponent(operator);
                }
            }
        }

        /**
         * Adds modifier to equation. Modifiers can go after closing brackets, modifier, and numbers only.
         *
         * @memberof models/model
         * @public
         * @param {string} operator
         */
        function addModifier(modifier) {
            var last = null, penultimate = null;

            if (calculated) {
                resetEquation();
                addComponent(lastCalculationResult);
            }

            last = getLastComponent(true);
            penultimate = getPenultimateComponent(true);

            // Operators cannot be added to empty equations
            if (!last) {
                return;
            }
            if (isNumeric(last) || isModifier(last) || isCloseBracket(last)) {
            	replaceLastComponent(checkNegativeFormat(last));
            	
                // check for 'E' being the last character of the equation - if so don't add modifier
                if (!(last && last.match(/E$/))) {
                    // add modifier
                    addComponent(modifier);
                }
            }
        }

        /**
         * Adds function to equation.
         * Functions can only come immediately after an operator or at the beginning of a equation.
         *
         * @memberof models/model
         * @public
         * @param {string} operator
         */
        function addFunction(func) {
            var last = null;

            if (calculated) {
                resetEquation();
            }

            last = getLastComponent(true);

            // Functions can be added to empty equations, or immediately after an operator or open bracket.
            // If the previous one is not a number and is not a closing bracket, start the function
            if ( ( !last || isOperator(last)) || isOpenBracket(last) || isFunction(last) ) {
                addComponent(func);
                return true;
            }
            else {//previous must be either a number, a modifier, or a closing bracket. So: add a multiply and then the funtion.
            	addOperator('*');
            	addComponent(func);
            }
        }

        /**
         * Adds decimal point to equation.
         *
         * @memberof models/model
         * @public
         */
        function addDecimal() {
            var last = getLastComponent();

            if (!last || isOperator(last) || isModifier(last)) {
                addComponent('0' + DECIMAL);
            } 
            else if (isFunction(last)) {
                addComponent('*');
                addComponent('0' + DECIMAL);
            } else {
                replaceLastComponent(checkNegativeFormat(last));
                if (last.indexOf(DECIMAL) === -1) {
                    if (isNegativeComponent(last)) {
                        last = '(-' + RegExp.$2 + DECIMAL + ')';
                    } else {
                        last += DECIMAL;
                    }
                    replaceLastComponent(last);
                }
            }
        }

        /**
         * Removes last character from the given string.
         *
         * @memberof models/model
         * @private
         * @param {string} str
         */
        function removeLastChar(str) {
            return str.substring(0, str.length - 1)
                .replace(EXPONENTIAL_REGEXP, '');
        }

        /**
         * Deletes last element from equation (digit or operator).
         *
         * @memberof models/model
         * @public
         */
        function deleteLast() {
        	//console.log("deleting last");
        	//console.log(equation);
            var last = null,
                lastPositive = '';

            /*
            if (calculated) {
                resetEquation();
                addComponent(lastCalculationResult);
                return;
            }*/

            last = getLastComponent();
            //console.log(last);

            if (!last) {
                return;
            }

            replaceLastComponent(checkNegativeFormat(last));
        	//console.log(equation);

            if (isNegativeComponent(last)) {
                lastPositive = RegExp.$2;
                if (lastPositive.length === 1) {
                    equation.pop();
                } else {
                    replaceLastComponent(
                        '(-' + removeLastChar(lastPositive) + ')'
                    );
                }
            } else if (last.length === 1 || last.match(/^\-[0-9]$/)) {
                equation.pop();
            } else if (isFunction(last) || isModifier(last)) {
            	equation.pop();
            }
            else {
                replaceLastComponent(removeLastChar(last));
            }
            
        	//console.log(equation);
            updateUndoLog();
        }

        /**
         * Returns true if equation can be calculated, false otherwise.
         *
         * @memberof models/model
         * @private
         * @returns {boolean}
         */
        function isValidEquation() {
            var last = getLastComponent(true);

            return (!isOperator(last) && !last.match(/E-?$/));
        }

        /**
         * Replaces left operand with specified value.
         *
         * @memberof models/model
         * @private
         * @param {string} value
         */
        function replaceLeftOperand(value) {
        	//TODO: This function is broken. Should only replace when left value is a number.
            var length = equation.length,
                leftOperandSize = 0;

            if (length === 0) {
                return;
            }
            if (length === 1) {
                leftOperandSize = 0;
            } else if (length === 2) {
                leftOperandSize = 1;
            } else {
                leftOperandSize = length - 3;
            }

            equation.splice(0, leftOperandSize);
            equation[0] = value;
            calculated = false;
            updateUndoLog();
        }

        /**
         * Formats value.
         *
         * @memberof models/model
         * @private
         * @param {number} value
         * @returns {string}
         */
        function formatValue(value) {
            var formatted = '',
                textValue = '',
                dotIndex = 0;

            // Round the mantissa to the nearest integer if it won't fit
            textValue = value.toString();
            dotIndex = textValue.indexOf('.');
            if (dotIndex >= MAX_DIGITS) {
                // If two first digits of the mantissa are higher than 95,
                // then round the result i.e. 0.95 and higher will be rounded
                // to 1
                // This is the behavior of the Calculator app in Samsung phones
                if (parseInt(textValue.substr(
                        dotIndex + 1,
                        Math.min(textValue.length, 2)
                    ), 10) >= 95) {
                    value += 1;
                }
            }
            // Set precision to match 10 digits limit
            formatted = value.toFixed(MAX_DIGITS).toString();
            formatted = formatted.substr(
                0,
                MAX_DIGITS + formatted.replace(/\d/g, '').length
            ).replace(/(\.(0*[1-9])*)0+$/, '$1').replace(/\.$/, '');

            // If the number:
            // - is too big (exceeds digits limit), or
            // - is too small (rounds to zero), or
            // - has scientific notation without decimals (1E23 vs 1.00000E23)
            // then use properly formatted scientific notation
            if (
                (formatted === '0' && value !== 0) ||
                value.toString().match(/[eE]/) ||
                Math.abs(value) >= Math.pow(10, 10)
            ) {
                formatted =
                    value.toExponential(5).toString();
            }
            // Uppercase 'E', remove optional '+' from exponent
            formatted = formatted.toUpperCase().replace('E+', 'E');

            return formatted;
        }

        /**
         * Changes sign of last component (if applicable).
         * Returns true if sign was changed, false otherwise.
         *
         * @memberof models/model
         * @public
         * @returns {boolean}
         */
        function changeSign() {
            var last = null;

            if (calculated) {
                resetEquation();
                addComponent(lastCalculationResult);
            }

            last = getLastComponent();
            // if there is at least one component
            // and last component isn't operator
            // and last component isn't zero
            if (last && !isOperator(last) && last !== '0') {
                if ((/^\-/).test(last)) {
                    last = '(' + last + ')';
                }
                if (isNegativeComponent(last)) {
                    last = RegExp.$2; // assign last matched value
                } else {
                    last = '(-' + last + ')';
                }
                replaceLastComponent(last);
                return true;
            }

            return false;
        }

        /**
         * Calculates equation value.
         *
         * @memberof models/model
         * @public
         * @returns {string}
         */
        function calculate() {
            /*jslint evil:true*/
            /*jslint unparam: true*/
        	console.log("calculate");
            var evaluation = '',
                result = '',
                /**
                 * Checks if the matched number is zero.
                 * @param {string} m Whole match including the division
                 * operator.
                 * @param {string} p1 Whole number, including sign and
                 * parenthesis.
                 * @param {string} number The matched number.
                 * @return {string}
                 */
                checkDivisionByZero = function checkDivisionByZero(m, p1,
                    number) {
                    if (parseFloat(number) === 0) {
                        throw new errors.DivisionByZeroError();
                    }
                    return '/ ' + number;
                };

            if (calculated) {
                replaceLeftOperand(lastCalculationResult);
            }

            if (!isValidEquation()) {
                throw new errors.EquationInvalidFormatError();
            }

            calculated = false;

            // Evaluate the equation.
            try {
                evaluation = equation.join(' ');
                evaluation = evaluation.replace(
                    /\/ *(\(?\-?([0-9\.]+)\)?)/g,
                    checkDivisionByZero
                );
                
                console.log(evaluation);

                //result = eval('(' + evaluation + ')');
                result = math.evaluate('(' + evaluation + ')');
                if (Math.abs(result) < 1.0E-300) {
                    result = 0;
                }
            } catch (e) {
                console.error(e);
                throw new errors.CalculationError();
            }

            if (isNaN(result)) {
                throw new errors.CalculationError();
            }
            if (result === Infinity || result === -Infinity) {
                throw new errors.InfinityError(result === Infinity);
            }

            calculated = true;
            // Format the result value.
            result = formatValue(result);
            // Save the calculated result.
            lastCalculationResult = result;

            return result;
        }

        /**
         * Finds specified component in the equation.
         *
         * @memberof models/model
         * @private
         * @param {string} val Search for value in the equation.
         * @returns {string[]}
         */
        function findComponent(val) {
            return equation.filter(function findComp(eqComp) {
                return eqComp === val;
            });
        }

        /**
         * Search for specified component in equation and
         * return the number of occurrence.
         *
         * @memberof models/model
         * @private
         * @param {string} val Searched value.
         * @returns {number}
         */
        function countComponent(val) {
            var found = findComponent(val);

            return found ? found.length : 0;
        }
        
        /**
         * count how many functions are in the equation.
         *
         * @memberof models/model
         * @private
         * @returns {number}
         */
        function countFunctions() {
            var found = equation.filter(function findComp(eqComp) {
                return (FUNCTIONS.indexOf(eqComp)>=0);
            });
            return found ? found.length : 0;
        }

        /**
         * Checks if given string is numeric value.
         *
         * @memberof models/model
         * @private
         * @param {string} str
         * @returns {boolean}
         */
        function isNumeric(str) {
            return /^[\d\.E∞-]+$/.test(str);
        }

        /**
         * Adds bracket sign to equation.
         *
         * @memberof models/model
         * @public
         */
        function addBracket() {
            var last = getLastComponent(),
                countOpened = countComponent(BRACKET_OPEN) + countFunctions(),
                countClosed = countComponent(BRACKET_CLOSE),
                i = 0,
                sign = '',
                l = 0;
            
            if (isEmpty(last)) {
                sign = BRACKET_OPEN;
                console.log("Open bracket: because isEmpty");
            } else if (isBracket(last)) {

                if (last === BRACKET_CLOSE && countOpened > countClosed) {
                    sign = BRACKET_CLOSE;
                    console.log("Close bracket: because last was closed");
                } else {
                    // Two or more brackets next to each other must be opened
                    sign = BRACKET_OPEN;
                    console.log("Open bracket: because last was open");
                }
            } else if (isNumeric(last) && countOpened === countClosed) {
                // If all brackets are closed or are not present at all
                // and if bracket is clicked just after digit by default
                // multiply operator is added.
                sign = '*' + BRACKET_OPEN;
                console.log("Open bracket with multiply: because last was numeric and opened===closed");
                // if last component is operator open bracket is added
            } else if (isOperator(last)) {
                sign = BRACKET_OPEN;
                console.log("Open bracket: because last component is operator");
                // close bracket
            } else if (last !== BRACKET_CLOSE && last !== BRACKET_OPEN &&
                (countOpened > countClosed)) {
                sign = BRACKET_CLOSE;
                console.log("Close bracket: more open than closed brackets");
                
            } else {
                // default
                sign = BRACKET_OPEN;
                console.log("Open bracket: default case");
            }

            l = sign.length;
            for (i = 0; i < l; i += 1) {
                addComponent(sign[i]);
            }
        }
        
        function arraysEqual(a, b) {
        	if (a === b) return true;
        	if (a == null || b == null) return false;
        	if (a.length != b.length) return false;

        	for (var i = 0; i < a.length; ++i) {
        		if (a[i] !== b[i]) return false;
        	}
        	return true;
        }
        
        /**
         * Undoes last step.
         *
         * @memberof models/model
         * @public
         */
        function undo() {
        	if (undoLog.length>0) {
        		var original_equation = Array.from(equation);
            	equation = undoLog.pop();
            	
            	if (arraysEqual(original_equation, equation) && undoLog.length>0) {
            		// When you do the first "undo" action, it just undoes to the current state, so does nothing.
            		// this deals with that error.
            		equation = undoLog.pop();
            	}
            		
        	}
        }

        /**
         * updates the undo log. 
         * TODO: Limit 200 entries?
         *
         * @memberof models/model
         * @public
         */
        function updateUndoLog() {
        	if (!arraysEqual(undoLog[undoLog.length-1], equation))
        	{
            	undoLog.push(Array.from(equation));
        	}
        	if (undoLog.length > 300) {
        		undoLog = undoLog.slice(100, undoLog.length); //keep last 200 items. Can't see myself needing more than that.
        	}
        }

        /**
         * Initializes the model.
         *
         * @memberof models/model
         * @public
         */
        function init() {
            resetEquation();
        }

        return {
            init: init,
            getEquation: getEquation,
            addDigit: addDigit,
            isNegativeComponent: isNegativeComponent,
            calculate: calculate,
            resetEquation: resetEquation,
            addOperator: addOperator,
            addFunction: addFunction,
            addModifier: addModifier,
            addDecimal: addDecimal,
            deleteLast: deleteLast,
            changeSign: changeSign,
            addBracket: addBracket,
            isEmpty: isEmpty,
            undo: undo
        };
    }
});
