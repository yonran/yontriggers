/* eslint-disable no-undef */
module.exports = {
    extends: ['eslint:recommended'],
    plugins: ['prettier', 'simple-import-sort'],
    rules: {
        'prettier/prettier': 'error',
    },
    overrides: [
        {
            files: ['*.cjs', '*.mjs'],
        },
        {
            files: ['*.mjs'],
            parser: 'babel-eslint',
        },
        {
            files: ['*.ts'],
            parser: '@typescript-eslint/parser',
            parserOptions: {
                tsconfigRootDir: __dirname,
                project: ['./tsconfig.json'],
            },
            extends: [
                'plugin:@typescript-eslint/recommended',
                'plugin:@typescript-eslint/recommended-requiring-type-checking',
            ],
            rules: {
                '@typescript-eslint/consistent-type-exports': 'error',
                '@typescript-eslint/consistent-type-imports': 'error',
                'simple-import-sort/imports': 'error',
            },
        },
    ],
    root: true,
    ignorePatterns: ['!.prettierrc.cjs'],
};
