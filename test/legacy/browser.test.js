const fs = require('fs');
const path = require('path');
const vm = require('vm');

const {expect} = require('chai');

// Runs the library the way a <script> tag would: no module, no require.
describe('browser usage', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'pythonicjs.js'), 'utf8');

    it('installs globals on window and exposes window.pythonicjs', () => {
        const logs = [];
        const window = {console: {log: (...args) => logs.push(args.join(' '))}};
        window.window = window;
        window.globalThis = window;
        const context = vm.createContext(window);
        vm.runInContext(source, context);
        vm.runInContext('print(sum(range(5)), len("abc"))', context);

        expect(logs).to.deep.equal(['10 3']);
        expect(vm.runInContext('typeof pythonicjs.sorted', context)).to.equal('function');
    });

    it('runs in strict mode', () => {
        const context = vm.createContext({console});
        vm.runInContext('"use strict";\n' + source, context);
        expect(vm.runInContext('max(1, 2)', context)).to.equal(2);
    });
});
