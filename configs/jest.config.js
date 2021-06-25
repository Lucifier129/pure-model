const { join } = require('path')

module.exports = {
  transform: {
    '.(ts|tsx|js|jsx)': 'ts-jest',
  },
  testRegex: '(/__tests__/.*|\\.(test|spec))\\.(ts|tsx|js)$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coveragePathIgnorePatterns: ['/examples/', '/node_modules/', '/test/'],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95,
    },
  },
  collectCoverageFrom: ['src/*.{js,ts}'],
  rootDir: join(__dirname, '..'),
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '@pure-model/isomorphic-unfetch': '<rootDir>/packages/isomorphic-unfetch',
    '@pure-model/([^/]+)(.*)$': '<rootDir>/packages/$1/src$2',
  },
  testPathIgnorePatterns: ['/node_modules/', '/examples/'],
}
