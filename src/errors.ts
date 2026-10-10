/**
 * Python-style exceptions. They extend Error, so `instanceof Error` and
 * `catch` keep working, and their `name` matches Python's exception names.
 * Python's TypeError maps to JavaScript's own TypeError.
 */

export class ValueError extends Error {
    constructor(message?: string) {
        super(message)
        this.name = 'ValueError'
    }
}

export class AttributeError extends Error {
    constructor(message?: string) {
        super(message)
        this.name = 'AttributeError'
    }
}

export class IndexError extends Error {
    constructor(message?: string) {
        super(message)
        this.name = 'IndexError'
    }
}

export class KeyError extends Error {
    constructor(message?: string) {
        super(message)
        this.name = 'KeyError'
    }
}

export class ZeroDivisionError extends Error {
    constructor(message?: string) {
        super(message)
        this.name = 'ZeroDivisionError'
    }
}

export class OverflowError extends Error {
    constructor(message?: string) {
        super(message)
        this.name = 'OverflowError'
    }
}

export class StopIteration extends Error {
    constructor(message?: string) {
        super(message)
        this.name = 'StopIteration'
    }
}
