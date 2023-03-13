module.exports = {
    // based on https://github.com/TypeStrong/ts-node-repros/blob/2f1890dc82e0a5e8af5cd7c9cbea9f9676146611/.mocharc.cjs
    extension: ['js', 'jsx', 'ts', 'tsx'],
    spec: ['src/test/**.{js,ts,jsx,tsx}'],
    loader: 'ts-node/esm',
};
