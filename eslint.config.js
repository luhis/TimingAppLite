import typescriptEslint from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-plugin-prettier';
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
        project: './tsconfig.json',
      },
      globals: {
        ...globals.browser,
      },
    },
    plugins: {
      '@typescript-eslint': typescriptEslint,
      'react': react,
      'react-hooks': reactHooks,
      'prettier': prettier,
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
      ...typescriptEslint.configs['recommended-requiring-type-checking'].rules,
      ...react.configs['recommended'].rules,
      ...reactHooks.configs['recommended'].rules,
      ...prettier.configs['recommended'].rules,
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
      'react/react-in-jsx-scope': 'off',
      "functional/no-return-void": "off",
    },
  },
  {
    files: ['*.js'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },
];
