import typescriptEslint from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import functional from "eslint-plugin-functional";
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';

export default [
  {
    ignores: ['node_modules/**', 'public/**', '.cache/**', 'dist/**'],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
      },
    },
    plugins: {
      '@typescript-eslint': typescriptEslint,
      'react': react,
      'react-hooks': reactHooks,
      functional: functional,
    },
    settings: {
      react: {
        pragma: 'h',
        version: 'detect',
      },
    },
    rules: {
      ...typescriptEslint.configs['eslint-recommended'].rules,
      ...typescriptEslint.configs['recommended'].rules,
      ...react.configs['recommended'].rules,
      ...reactHooks.configs['recommended'].rules,
      ...functional.configs["lite"].rules,
      ...eslintConfigPrettier.rules,
      
      'react/no-unknown-property': ['error', { ignore: ['class'] }],
      'react/prop-types': ['off'],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      'no-duplicate-imports': 'error',
      'no-shadow': 'off',
      '@typescript-eslint/no-shadow': ['error'],
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      'no-implicit-globals': 'error',
      'linebreak-style': ['error', 'unix'],
      'semi': ['error', 'always'],
      'react/react-in-jsx-scope': 'off',
      "functional/no-return-void": "off",
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    rules: {
      ...typescriptEslint.configs['recommended-requiring-type-checking'].rules,
    },
  },
  {
    files: ['*.js'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },
  {
    files: ['*.graphql'],
    parser: '@graphql-eslint/eslint-plugin',
    plugins: ['@graphql-eslint'],
    rules: {
      '@graphql-eslint/no-anonymous-operations': 'error',
      '@graphql-eslint/naming-convention': [
        'error',
        {
          OperationDefinition: {
            style: 'PascalCase',
            forbiddenPrefixes: ['Query', 'Mutation', 'Subscription', 'Get'],
            forbiddenSuffixes: ['Query', 'Mutation', 'Subscription'],
          },
        },
      ],
    },
  },
];
