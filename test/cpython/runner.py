"""Evaluates test cases in CPython and prints normalized JSON results.

Reads a JSON list of Python snippets on stdin. A snippet containing
`result =` is executed and `result` is returned; anything else is evaluated
as an expression. Exceptions become {"error": "<ExceptionName>"}.
"""
import bisect
import collections
import functools
import heapq
import itertools
import json
import math
import sys
from collections import Counter, defaultdict, deque

BASE = {
    'bisect': bisect, 'collections': collections, 'functools': functools,
    'heapq': heapq, 'itertools': itertools, 'math': math,
    'Counter': Counter, 'defaultdict': defaultdict, 'deque': deque,
}


def norm(x):
    if x is None or isinstance(x, bool):
        return x
    if isinstance(x, int):
        return x if abs(x) <= 2 ** 53 else {'int': str(x)}
    if isinstance(x, float):
        if math.isnan(x):
            return {'float': 'nan'}
        if math.isinf(x):
            return {'float': 'inf' if x > 0 else '-inf'}
        return x + 0.0
    if isinstance(x, str):
        return x
    if isinstance(x, dict):
        return {'dict': [[norm(k), norm(v)] for k, v in x.items()]}
    if isinstance(x, (set, frozenset)):
        items = [norm(i) for i in x]
        return {'set': sorted(items, key=lambda i: json.dumps(i, separators=(',', ':')))}
    if isinstance(x, (list, tuple, deque, range)) or hasattr(x, '__next__'):
        return [norm(i) for i in x]
    return {'repr': repr(x)}


def run(snippet):
    ns = dict(BASE)
    try:
        if 'result =' in snippet:
            exec(snippet, ns)
            return norm(ns['result'])
        return norm(eval(snippet, ns))
    except Exception as e:  # noqa: BLE001
        return {'error': type(e).__name__}


snippets = json.load(sys.stdin)
json.dump([run(s) for s in snippets], sys.stdout)
