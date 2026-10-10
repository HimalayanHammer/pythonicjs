require('../pythonicjs')

const {expect} = require('chai');

describe('pythonicjs', () => {
    it('should return correct max of a list', () => {
        const x = [1, 2, 5]
        const my_max = max(x)
        expect(my_max).to.deep.equal(5)
    });

    it('should return correct min of a list', () => {
        const x = [1, -2, 5, 0, -12.5, 6]
        const my_min = min(x)
        expect(my_min).to.deep.equal(-12.5)
    });

    it('print function logs messages to the console', () => {
        // Arrange
        const consoleSpy = console.log;
        let output = '';

        console.log = function (...args) {
            output = args.join(' ');
        };

        // Act
        print('Hello, World!');

        // Assert
        expect(output).to.equal('Hello, World!');

        // Restore console.log
        console.log = consoleSpy;
    });

    it('pprintr function returns a pretty-printed JSON string', () => {
        // Arrange
        const object = {key: 'value', nested: {key: 'nestedValue'}};
        const expectedOutput = JSON.stringify(object, null, 2);

        // Act
        const result = pprintr(object);

        // Assert
        expect(result).to.equal(expectedOutput);
    });

    it('pprint function pretty prints an object to the console', () => {
        // Arrange
        const consoleSpy = console.log;
        let output = '';
        const object = {key: 'value', nested: {key: 'nestedValue'}};
        const expectedOutput = JSON.stringify(object, null, 2);

        console.log = function (...args) {
            output = args.join(' ');
        };

        // Act
        pprint(object);

        // Assert
        expect(output).to.equal(expectedOutput);

        // Restore console.log
        console.log = consoleSpy;
    });

    it('type function returns correct type for an array', () => {
        // Arrange
        const input = [1, 2, 3];

        // Act
        const result = type(input);

        // Assert
        expect(result).to.equal('array');
    });

    it('type function returns correct type for other objects', () => {
        // Arrange
        const inputString = 'Hello, World!';
        const inputNumber = 42;
        const inputObject = {key: 'value'};

        // Act
        const resultString = type(inputString);
        const resultNumber = type(inputNumber);
        const resultObject = type(inputObject);

        // Assert
        expect(resultString).to.equal('string');
        expect(resultNumber).to.equal('number');
        expect(resultObject).to.equal('object');
    });

    it('abs function returns the absolute value of a number', () => {
        // Arrange
        const inputPositive = 42;
        const inputNegative = -42;

        // Act
        const resultPositive = abs(inputPositive);
        const resultNegative = abs(inputNegative);

        // Assert
        expect(resultPositive).to.equal(inputPositive);
        expect(resultNegative).to.equal(-inputNegative);
    });

    it('pow function returns the result of raising x to the power of y', () => {
        // Arrange
        const x = 2;
        const y = 3;

        // Act
        const result = pow(x, y);

        // Assert
        expect(result).to.equal(8);
    });

    it('sum function returns the sum of numbers in an array', () => {
        // Arrange
        const inputNumbers = [1, 2, 3, 4, 5];

        // Act
        const result = sum(inputNumbers);

        // Assert
        expect(result).to.equal(15);
    });

    it('sum function throws an error for non-array input', () => {
        // Arrange
        const inputNonArray = 'not an array';

        // Act and Assert
        expect(() => sum(inputNonArray)).to.throw(Error, 'Input must be an array');
    });

    it('len function returns the length of a string', () => {
        // Arrange
        const inputString = 'Hello, World!';

        // Act
        const result = len(inputString);

        // Assert
        expect(result).to.equal(inputString.length);
    });

    it('len function returns the length of an array', () => {
        // Arrange
        const inputArray = [1, 2, 3, 4, 5];

        // Act
        const result = len(inputArray);

        // Assert
        expect(result).to.equal(inputArray.length);
    });

    it('len function throws an error for non-string and non-array input', () => {
        // Arrange
        const inputNonStringArray = 42;

        // Act and Assert
        expect(() => len(inputNonStringArray)).to.throw(Error, 'Input must be a string or an array');
    });

    it('avg function returns the average of numbers in an array', () => {
        // Arrange
        const inputNumbers = [1, 2, 3, 4, 5];

        // Act
        const result = avg(inputNumbers);

        // Assert
        expect(result).to.equal(3);
    });

    it('avg function throws an error for empty array input', () => {
        // Arrange
        const inputEmptyArray = [];

        // Act and Assert
        expect(() => avg(inputEmptyArray)).to.throw(Error, 'Input must be a non-empty array');
    });

    it('mean function returns the same result as avg', () => {
        // Arrange
        const inputNumbers = [1, 2, 3, 4, 5];

        // Act
        const resultAvg = avg(inputNumbers);
        const resultMean = mean(inputNumbers);

        // Assert
        expect(resultMean).to.equal(resultAvg);
    });

    it('sorted function sorts an array of numbers in ascending order', () => {
        // Arrange
        const inputNumbers = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5];

        // Act
        const result = sorted(inputNumbers);

        // Assert
        expect(result).to.deep.equal([1, 1, 2, 3, 3, 4, 5, 5, 5, 6, 9]);
    });

    it('sorted function sorts an array of numbers in descending order', () => {
        // Arrange
        const inputNumbers = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5];

        // Act
        const result = sorted(inputNumbers, null, true);

        // Assert
        expect(result).to.deep.equal([9, 6, 5, 5, 5, 4, 3, 3, 2, 1, 1]);
    });


    it('sorted function sorts an object by keys in ascending order', () => {
        // Arrange
        const inputObject = {b: 3, a: 1, c: 2};

        // Act
        const result = sorted(inputObject);

        // Assert
        expect(result).to.deep.equal({a: 1, b: 3, c: 2});
    });

    it('sorted function throws an error for unsupported iterable type', () => {
        // Arrange
        const inputUnsupported = 42;

        // Act and Assert
        expect(() => sorted(inputUnsupported)).to.throw(Error, 'Unsupported iterable type');
    });

    it('str function converts an object to a string', () => {
        // Arrange
        const inputNumber = 42;

        // Act
        const result = str(inputNumber);

        // Assert
        expect(result).to.equal(inputNumber.toString());
    });

    it('int function converts a string to an integer', () => {
        // Arrange
        const inputString = '42';

        // Act
        const result = int(inputString);

        // Assert
        expect(result).to.equal(42);
    });

    it('float function converts a string to a floating-point number', () => {
        // Arrange
        const inputString = '3.14';

        // Act
        const result = float(inputString);

        // Assert
        expect(result).to.equal(3.14);
    });

    it('timestamp function returns the current timestamp in ISO format', () => {
        // Arrange
        const currentTimestamp = new Date().toISOString();

        // Act
        const result = timestamp();

        // Convert timestamps to Unix epoch so that they can be compared with a slight margin of error
        const currentTimestampUnix = new Date(currentTimestamp).getTime() / 1000;
        const resultUnix = new Date(result).getTime() / 1000;

        // Assert
        const marginInSeconds = 1;
        const difference = Math.abs(resultUnix - currentTimestampUnix);
        expect(difference).to.be.lessThan(marginInSeconds);
    });

    it('keys function returns an array of keys from an object', () => {
        // Arrange
        const inputObject = {a: 1, b: 2, c: 3};

        // Act
        const result = keys(inputObject);

        // Assert
        expect(result).to.deep.equal(['a', 'b', 'c']);
    });

    it('values function returns an array of values from an object', () => {
        // Arrange
        const inputObject = {a: 1, b: 2, c: 3};

        // Act
        const result = values(inputObject);

        // Assert
        expect(result).to.deep.equal([1, 2, 3]);
    });


    it('copy function returns a shallow copy of an array', () => {
        // Arrange
        const inputArray = [1, 2, 3];

        // Act
        const result = copy(inputArray);

        // Assert
        expect(result).to.deep.equal(inputArray);
        expect(result).to.not.equal(inputArray);
    });

    it('copy function returns a shallow copy of an object', () => {
        // Arrange
        const inputObject = {a: 1, b: 2, c: 3};

        // Act
        const result = copy(inputObject);

        // Assert
        expect(result).to.deep.equal(inputObject);
        expect(result).to.not.equal(inputObject);
    });

    it('deepcopy function returns a deep copy of an array', () => {
        // Arrange
        const inputArray = [1, [2, [3]]];

        // Act
        const result = deepcopy(inputArray);

        // Assert
        expect(result).to.deep.equal(inputArray);
        expect(result).to.not.equal(inputArray);
        expect(result[1]).to.not.equal(inputArray[1]);
    });

    it('deepcopy function returns a deep copy of an object', () => {
        // Arrange
        const inputObject = {a: 1, b: {c: 2, d: {e: 3}}};

        // Act
        const result = deepcopy(inputObject);

        // Assert
        expect(result).to.deep.equal(inputObject);
        expect(result).to.not.equal(inputObject);
        expect(result.b).to.not.equal(inputObject.b);
        expect(result.b.d).to.not.equal(inputObject.b.d);
    });

    it('is_empty function returns true for an empty object', () => {
        // Arrange
        const inputEmptyObject = {};

        // Act
        const result = is_empty(inputEmptyObject);

        // Assert
        expect(result).to.be.true;
    });

    it('is_empty function returns false for a non-empty object', () => {
        // Arrange
        const inputNonEmptyObject = {a: 1, b: 2};

        // Act
        const result = is_empty(inputNonEmptyObject);

        // Assert
        expect(result).to.be.false;
    });

    it('not function returns true for a null object', () => {
        // Arrange
        const inputNull = null;

        // Act
        const result = not(inputNull);

        // Assert
        expect(result).to.be.true;
    });

    it('not function returns true for an empty object', () => {
        // Arrange
        const inputEmptyObject = {};

        // Act
        const result = not(inputEmptyObject);

        // Assert
        expect(result).to.be.true;
    });

    it('not function returns false for a non-empty object', () => {
        // Arrange
        const inputNonEmptyObject = {a: 1, b: 2};

        // Act
        const result = not(inputNonEmptyObject);

        // Assert
        expect(result).to.be.false;
    });

    it('not function returns true for a non-truthy value', () => {
        // Arrange
        const inputFalsyValue = 0;

        // Act
        const result = not(inputFalsyValue);

        // Assert
        expect(result).to.be.true;
    });

    it('is_null function returns true for a null object', () => {
        // Arrange
        const inputNull = null;

        // Act
        const result = is_null(inputNull);

        // Assert
        expect(result).to.be.true;
    });

    it('is_null function returns false for a non-null object', () => {
        // Arrange
        const inputObject = {a: 1, b: 2};

        // Act
        const result = is_null(inputObject);

        // Assert
        expect(result).to.be.false;
    });

    it('is_undefined function returns true for an undefined object', () => {
        // Arrange
        let inputUndefined;

        // Act
        const result = is_undefined(inputUndefined);

        // Assert
        expect(result).to.be.true;
    });

    it('is_undefined function returns false for a defined object', () => {
        // Arrange
        const inputDefined = 42;

        // Act
        const result = is_undefined(inputDefined);

        // Assert
        expect(result).to.be.false;
    });


    it('equals function returns true for equal objects', () => {
        // Arrange
        const inputObject1 = {a: 1, b: 2, c: 3};
        const inputObject2 = {c: 3, a: 1, b: 2};

        // Act
        const result = equals(inputObject1, inputObject2);

        // Assert
        expect(result).to.be.true;
    });

    it('equals function returns false for non-equal objects', () => {
        // Arrange
        const inputObject1 = {a: 1, b: 2, c: 3};
        const inputObject2 = {a: 1, b: 2, c: 4};

        // Act
        const result = equals(inputObject1, inputObject2);

        // Assert
        expect(result).to.be.false;
    });

    it('index function returns the index of an item in an array', () => {
        // Arrange
        const inputArray = ['apple', 'banana', 'orange'];

        // Act
        const result = index(inputArray, 'banana');

        // Assert
        expect(result).to.equal(1);
    });

    it('index function returns -1 for an item not found in an array', () => {
        // Arrange
        const inputArray = ['apple', 'banana', 'orange'];

        // Act
        const result = index(inputArray, 'grape');

        // Assert
        expect(result).to.equal(-1);
    });

    it('first function returns the first element of an array', () => {
        // Arrange
        const inputArray = [1, 2, 3];

        // Act
        const result = first(inputArray);

        // Assert
        expect(result).to.equal(1);
    });

    it('last function returns the last element of an array', () => {
        // Arrange
        const inputArray = [1, 2, 3];

        // Act
        const result = last(inputArray);

        // Assert
        expect(result).to.equal(3);
    });

    it('last function returns undefined for an empty array', () => {
        // Arrange
        const inputEmptyArray = [];

        // Act
        const result = last(inputEmptyArray);

        // Assert
        expect(result).to.be.undefined;
    });

    it('remove function removes all instances of an item from an array', () => {
        // Arrange
        const inputArray = [1, 2, 3, 2, 4];
        const itemToRemove = 2;

        // Act
        const result = remove(inputArray, itemToRemove);

        // Assert
        expect(result).to.deep.equal([1, 3, 4]);
    });

    it('difference function returns elements in array a but not in array b', () => {
        // Arrange
        const arrayA = [1, 2, 3, 4];
        const arrayB = [3, 4, 5, 6];

        // Act
        const result = difference(arrayA, arrayB);

        // Assert
        expect(result).to.deep.equal([1, 2]);
    });

    it('union function returns the union of multiple arrays', () => {
        // Arrange
        const array1 = [1, 2, 3];
        const array2 = [2, 3, 4];
        const array3 = [3, 4, 5];

        // Act
        const result = union(array1, array2, array3);

        // Assert
        expect(result).to.deep.equal([1, 2, 3, 4, 5]);
    });

    it('intersection function returns the intersection of multiple arrays', () => {
        // Arrange
        const array1 = [1, 2, 3];
        const array2 = [2, 3, 4];
        const array3 = [3, 4, 5];

        // Act
        const result = intersection(array1, array2, array3);

        // Assert
        expect(result).to.deep.equal([3]);
    });

    it('unique function returns an array with unique elements', () => {
        // Arrange
        const inputArray = [1, 2, 2, 3, 4, 4, 5];

        // Act
        const result = unique(inputArray);

        // Assert
        expect(result).to.deep.equal([1, 2, 3, 4, 5]);
    });

    it('without function removes specified values from an array', () => {
        // Arrange
        const inputArray = [1, 2, 3, 4, 5];
        const valuesToRemove = [2, 4];

        // Act
        const result = without(inputArray, ...valuesToRemove);

        // Assert
        expect(result).to.deep.equal([1, 3, 5]);
    });


    it('base function returns the number in the specified base', () => {
        // Arrange
        const inputNumber = 42;
        const inputBase = 2;

        // Act
        const result = base(inputNumber, inputBase);

        // Assert
        expect(result).to.equal(inputNumber.toString(inputBase));
    });

    it('range function returns an array of numbers in the specified range', () => {
        // Arrange
        const start = 1;
        const end = 6;
        const step = 2;

        // Act
        const result = range(start, end, step);

        // Assert
        expect(result).to.deep.equal([1, 3, 5]);
    });

    it('reversed function returns a reversed copy of an array', () => {
        // Arrange
        const inputArray = [1, 2, 3];

        // Act
        const result = reversed(inputArray);

        // Assert
        expect(result).to.deep.equal([3, 2, 1]);
    });

    it('filter function returns an array of elements that satisfy the operation', () => {
        // Arrange
        const inputArray = [1, 2, 3, 4, 5];
        const isEven = (num) => num % 2 === 0;

        // Act
        const result = filter(isEven, inputArray);

        // Assert
        expect(result).to.deep.equal([2, 4]);
    });

    it('filter function returns an empty array if no elements satisfy the operation', () => {
        // Arrange
        const inputArray = [1, 3, 5];
        const isEven = (num) => num % 2 === 0;

        // Act
        const result = filter(isEven, inputArray);

        // Assert
        expect(result).to.deep.equal([]);
    });

    it('hex function returns a hex representation of a number', () => {
        // Arrange
        const inputNumber = 255;

        // Act
        const result = hex(inputNumber);

        // Assert
        expect(result).to.equal('0xff');
    });

    it('map function applies the operation to each element in the array', () => {
        // Arrange
        const inputArray = [1, 2, 3];
        const square = (num) => num ** 2;

        // Act
        const result = map(square, inputArray);

        // Assert
        expect(result).to.deep.equal([1, 4, 9]);
    });

    it('getattr function retrieves the value of an attribute from an object', () => {
        // Arrange
        const inputObject = {name: 'John', age: 30};

        // Act
        const result = getattr(inputObject, 'name');

        // Assert
        expect(result).to.equal('John');
    });

    it('setattr function sets the value of an attribute in an object', () => {
        // Arrange
        const inputObject = {name: 'John', age: 30};

        // Act
        setattr(inputObject, 'age', 31);

        // Assert
        expect(inputObject.age).to.equal(31);
    });

    it('hasattr function returns true if an object has a specified attribute', () => {
        // Arrange
        const inputObject = {name: 'John', age: 30};

        // Act
        const result = hasattr(inputObject, 'name');

        // Assert
        expect(result).to.be.true;
    });

    it('hasattr function returns false if an object does not have a specified attribute', () => {
        // Arrange
        const inputObject = {name: 'John', age: 30};

        // Act
        const result = hasattr(inputObject, 'address');

        // Assert
        expect(result).to.be.false;
    });

    it('invert function swaps keys and values in an object', () => {
        // Arrange
        const inputObject = {a: 1, b: 2, c: 3};

        // Act
        const result = invert(inputObject);

        // Assert
        expect(result).to.deep.equal({'1': 'a', '2': 'b', '3': 'c'});
    });

    it('random function generates a random number within the specified range', () => {
        // Arrange
        const min = 1;
        const max = 10;

        // Act
        const result = random(min, max);

        // Assert
        expect(result).to.be.within(min, max);
    });

    it('round function rounds a number to the specified number of decimal places', () => {
        // Arrange
        const inputNumber = 3.14159;

        // Act
        const result = round(inputNumber, 2);

        // Assert
        expect(result).to.equal(3.14);
    });

    it('round function rounds a number to the nearest integer if no decimal places specified', () => {
        // Arrange
        const inputNumber = 3.14159;

        // Act
        const result = round(inputNumber);

        // Assert
        expect(result).to.deep.equal(3);
    });

    // Additional Tests for hex function
  it('hex function returns "0x0" for input 0', () => {
    // Arrange
    const inputNumber = 0;

    // Act
    const result = hex(inputNumber);

    // Assert
    expect(result).to.equal('0x0');
  });

  // Additional Tests for random function
  it('random function returns a random number within the specified range (edge case)', () => {
    // Arrange
    const min = 5;
    const max = 5;

    // Act
    const result = random(min, max);

    // Assert
    expect(result).to.equal(5);
  });

  // Additional Tests for round function
  it('round function rounds a number to the nearest integer when ndigits is negative', () => {
    // Arrange
    const inputNumber = 3.14159;

    // Act
    const result = round(inputNumber, -1);

    // Assert
    expect(result).to.equal(0);
  });

  it('round function returns NaN for invalid input', () => {
    // Arrange
    const inputNumber = 'not a number';

    // Act
    const result = round(inputNumber);

    // Assert
    expect(result).to.be.NaN;
  });

  // Additional Tests for map function
  it('map function returns an empty array for an empty input array', () => {
    // Arrange
    const inputArray = [];
    const square = (num) => num ** 2;

    // Act
    const result = map(square, inputArray);

    // Assert
    expect(result).to.be.an('array').that.is.empty;
  });

  // Additional Tests for invert function
  it('invert function returns an empty object for an empty input object', () => {
    // Arrange
    const inputObject = {};

    // Act
    const result = invert(inputObject);

    // Assert
    expect(result).to.be.an('object').that.is.empty;
  });

  // Additional Tests for print function
  it('print function handles various input types without errors', () => {
    // Arrange
    const values = [1, 'string', { key: 'value' }, [1, 2, 3], true, null, undefined];

    // Act & Assert
    expect(() => print(...values)).to.not.throw();
  });

  // Additional Tests for pprintr function
  it('pprintr function handles various input types without errors', () => {
    // Arrange
    const values = [1, 'string', { key: 'value' }, [1, 2, 3], true, null, undefined];

    // Act & Assert
    expect(() => pprintr(...values)).to.not.throw();
  });

  // Additional Tests for log function
  it('log function handles various input types without errors', () => {
    // Arrange
    const values = [1, 'string', { key: 'value' }, [1, 2, 3], true, null, undefined];

    // Act & Assert
    expect(() => log(...values)).to.not.throw();
  });

  // Additional Tests for abs function
  it('abs function returns the absolute value of a negative number', () => {
    // Arrange
    const inputNumber = -5;

    // Act
    const result = abs(inputNumber);

    // Assert
    expect(result).to.equal(5);
  });

  // Additional Tests for pow function
  it('pow function returns the correct result for decimal exponents', () => {
    // Arrange
    const base = 2;
    const exponent = 0.5;

    // Act
    const result = pow(base, exponent);

    // Assert
    expect(result).to.equal(Math.sqrt(base));
  });

  // Additional Tests for sum function
  it('sum function returns 0 for an empty array', () => {
    // Arrange
    const inputArray = [];

    // Act
    const result = sum(inputArray);

    // Assert
    expect(result).to.equal(0);
  });

  // Additional Tests for len function
  it('len function returns 0 for an empty string', () => {
    // Arrange
    const inputString = '';

    // Act
    const result = len(inputString);

    // Assert
    expect(result).to.equal(0);
  });

  it('len function returns 0 for an empty array', () => {
    // Arrange
    const inputArray = [];

    // Act
    const result = len(inputArray);

    // Assert
    expect(result).to.equal(0);
  });


  // Additional Tests for sorted function
  it('sorted function returns an empty array for an empty array', () => {
    // Arrange
    const inputArray = [];

    // Act
    const result = sorted(inputArray);

    // Assert
    expect(result).to.deep.equal([]);
  });

  it('sorted function returns an empty object for an empty object', () => {
    // Arrange
    const inputObject = {};

    // Act
    const result = sorted(inputObject);

    // Assert
    expect(result).to.deep.equal({});
  });

  // Additional Tests for flatten function
  it('flatten function returns an empty array for an empty array', () => {
    // Arrange
    const inputArray = [];

    // Act
    const result = flatten(inputArray);

    // Assert
    expect(result).to.deep.equal([]);
  });

  it('flatten function returns a flat array for a nested array', () => {
    // Arrange
    const inputArray = [1, [2, [3, 4], 5], 6];

    // Act
    const result = flatten(inputArray);

    // Assert
    expect(result).to.deep.equal([1, 2, 3, 4, 5, 6]);
  });

  // Additional Tests for str function
  it('str function returns the string representation of an object', () => {
    // Arrange
    const inputObject = { key: 'value' };

    // Act
    const result = str(inputObject);

    // Assert
    expect(result).to.equal('[object Object]');
  });

  // Additional Tests for int function
  it('int function converts a valid string to an integer', () => {
    // Arrange
    const inputString = '42';

    // Act
    const result = int(inputString);

    // Assert
    expect(result).to.equal(42);
  });

  it('int function throws for an invalid string', () => {
    expect(() => int('not a number')).to.throw(Error, 'invalid literal for int()');
  });

  // Additional Tests for float function
  it('float function converts a valid string to a float', () => {
    // Arrange
    const inputString = '3.14';

    // Act
    const result = float(inputString);

    // Assert
    expect(result).to.equal(3.14);
  });

  it('float function throws for an invalid string', () => {
    expect(() => float('not a number')).to.throw(Error, 'could not convert string to float');
  });

  // Additional Tests for timestamp function
  it('timestamp function returns a valid ISO timestamp', () => {
    // Arrange & Act
    const result = timestamp();

    // Assert
    expect(result).to.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
  });

  // Additional Tests for keys and values functions
  it('keys function returns an empty array for an empty object', () => {
    // Arrange
    const inputObject = {};

    // Act
    const result = keys(inputObject);

    // Assert
    expect(result).to.deep.equal([]);
  });

  it('values function returns an empty array for an empty object', () => {
    // Arrange
    const inputObject = {};

    // Act
    const result = values(inputObject);

    // Assert
    expect(result).to.deep.equal([]);
  });

  // Additional Tests for copy function
  it('copy function returns a shallow copy of an array', () => {
    // Arrange
    const inputArray = [1, 2, 3];

    // Act
    const result = copy(inputArray);

    // Assert
    expect(result).to.deep.equal([1, 2, 3]);
    expect(result).to.not.equal(inputArray);
  });

  it('copy function returns a shallow copy of an object', () => {
    // Arrange
    const inputObject = { key: 'value' };

    // Act
    const result = copy(inputObject);

    // Assert
    expect(result).to.deep.equal({ key: 'value' });
    expect(result).to.not.equal(inputObject);
  });

  // Additional Tests for deepcopy function
  it('deepcopy function returns a deep copy of an array', () => {
    // Arrange
    const inputArray = [1, [2, [3, 4], 5], 6];

    // Act
    const result = deepcopy(inputArray);

    // Assert
    expect(result).to.deep.equal([1, [2, [3, 4], 5], 6]);
    expect(result).to.not.equal(inputArray);
    expect(result[1]).to.not.equal(inputArray[1]);
    expect(result[1][1]).to.not.equal(inputArray[1][1]);
  });

  it('deepcopy function returns a deep copy of an object', () => {
    // Arrange
    const inputObject = { key: { nestedKey: 'value' } };

    // Act
    const result = deepcopy(inputObject);

    // Assert
    expect(result).to.deep.equal({ key: { nestedKey: 'value' } });
    expect(result).to.not.equal(inputObject);
    expect(result.key).to.not.equal(inputObject.key);
  });

  // Additional Tests for is_empty function
  it('is_empty function returns true for an empty object', () => {
    // Arrange
    const inputObject = {};

    // Act
    const result = is_empty(inputObject);

    // Assert
    expect(result).to.be.true;
  });

  it('is_empty function returns true for an empty array', () => {
    // Arrange
    const inputArray = [];

    // Act
    const result = is_empty(inputArray);

    // Assert
    expect(result).to.be.true;
  });

  it('is_empty function returns false for a non-empty object', () => {
    // Arrange
    const inputObject = { key: 'value' };

    // Act
    const result = is_empty(inputObject);

    // Assert
    expect(result).to.be.false;
  });

  it('is_empty function returns false for a non-empty array', () => {
    // Arrange
    const inputArray = [1, 2, 3];

    // Act
    const result = is_empty(inputArray);

    // Assert
    expect(result).to.be.false;
  });

  // Additional Tests for not function
  it('not function returns true for a falsy value', () => {
    // Arrange
    const falsyValue = 0;

    // Act
    const result = not(falsyValue);

    // Assert
    expect(result).to.be.true;
  });

  it('not function returns false for a truthy value', () => {
    // Arrange
    const truthyValue = 'truthy';

    // Act
    const result = not(truthyValue);

    // Assert
    expect(result).to.be.false;
  });

  it('not function returns true for an empty object', () => {
    // Arrange
    const inputObject = {};

    // Act
    const result = not(inputObject);

    // Assert
    expect(result).to.be.true;
  });

  it('not function returns false for a non-empty object', () => {
    // Arrange
    const inputObject = { key: 'value' };

    // Act
    const result = not(inputObject);

    // Assert
    expect(result).to.be.false;
  });

  it('not function returns true for an empty array', () => {
    // Arrange
    const inputArray = [];

    // Act
    const result = not(inputArray);

    // Assert
    expect(result).to.be.true;
  });

  it('not function returns false for a non-empty array', () => {
    // Arrange
    const inputArray = [1, 2, 3];

    // Act
    const result = not(inputArray);

    // Assert
    expect(result).to.be.false;
  });

  // Additional Tests for is_null function
  it('is_null function returns true for null', () => {
    // Arrange
    const inputNull = null;

    // Act
    const result = is_null(inputNull);

    // Assert
    expect(result).to.be.true;
  });

})

// Additional Tests for flatten function
describe('flatten', () => {
  it('flatten function returns an empty array for an empty array', () => {
    // Arrange
    const inputArray = [];

    // Act
    const result = flatten(inputArray);

    // Assert
    expect(result).to.deep.equal([]);
  });

  it('flatten function returns a flat array for a deeply nested array', () => {
    // Arrange
    const inputArray = [1, [2, [3, [4, 5], 6], 7], 8];

    // Act
    const result = flatten(inputArray);

    // Assert
    expect(result).to.deep.equal([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('flatten function returns a flat array for a mixed nested array', () => {
    // Arrange
    const inputArray = [1, [2, 'string', [3, { key: 'value' }], true], null];

    // Act
    const result = flatten(inputArray);

    // Assert
    expect(result).to.deep.equal([1, 2, 'string', 3, { key: 'value' }, true, null]);
  });

  it('flatten function returns the same array for an already flat array', () => {
    // Arrange
    const inputArray = [1, 2, 3, 'string', { key: 'value' }, true, null];

    // Act
    const result = flatten(inputArray);

    // Assert
    expect(result).to.deep.equal([1, 2, 3, 'string', { key: 'value' }, true, null]);
  });
});

// Additional Tests for is_array function
describe('is_array', () => {
  it('is_array function returns true for an array', () => {
    // Arrange
    const inputArray = [1, 2, 3];

    // Act
    const result = is_array(inputArray);

    // Assert
    expect(result).to.be.true;
  });

  it('is_array function returns false for a non-array object', () => {
    // Arrange
    const inputObject = { key: 'value' };

    // Act
    const result = is_array(inputObject);

    // Assert
    expect(result).to.be.false;
  });

  it('is_array function returns false for a string', () => {
    // Arrange
    const inputString = 'string';

    // Act
    const result = is_array(inputString);

    // Assert
    expect(result).to.be.false;
  });

  it('is_array function returns false for a number', () => {
    // Arrange
    const inputNumber = 42;

    // Act
    const result = is_array(inputNumber);

    // Assert
    expect(result).to.be.false;
  });

  it('is_array function returns false for null', () => {
    // Arrange
    const inputNull = null;

    // Act
    const result = is_array(inputNull);

    // Assert
    expect(result).to.be.false;
  });
});

describe('List Methods', () => {
  let testArray;

  beforeEach(() => {
    // Initialize a test array before each test
    testArray = [1, 2, 3];
  });

  it('append function appends item to the array', () => {
    // Act
    append(testArray, 4);

    // Assert
    expect(testArray).to.deep.equal([1, 2, 3, 4]);
  });

  it('extend function extends array with iterable elements', () => {
    // Act
    extend(testArray, [4, 5]);

    // Assert
    expect(testArray).to.deep.equal([1, 2, 3, 4, 5]);
  });

  it('insert function inserts item at the specified index', () => {
    // Act
    insert(testArray, 1, 10);

    // Assert
    expect(testArray).to.deep.equal([1, 10, 2, 3]);
  });

  it('pop function removes and returns the last element if no index provided', () => {
    // Act
    const result = pop(testArray);

    // Assert
    expect(result).to.equal(3);
    expect(testArray).to.deep.equal([1, 2]);
  });

  it('pop function removes and returns element at the specified index if index provided', () => {
    // Act
    const result = pop(testArray, 1);

    // Assert
    expect(result).to.equal(2);
    expect(testArray).to.deep.equal([1, 3]);
  });

  it('clear function empties the array', () => {
    // Act
    clear(testArray);

    // Assert
    expect(testArray).to.deep.equal([]);
  });

  it('count function counts occurrences of an item in the array', () => {
    // Act
    const result = count([1, 2, 2, 3, 2], 2);

    // Assert
    expect(result).to.equal(3);
  });
});

describe('String Methods', () => {
  it('strip function removes leading and trailing whitespaces', () => {
    // Arrange
    const inputStr = '  Hello, World!  ';

    // Act
    const result = strip(inputStr);

    // Assert
    expect(result).to.equal('Hello, World!');
  });
});