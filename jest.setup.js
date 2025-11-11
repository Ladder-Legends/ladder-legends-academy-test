import '@testing-library/jest-dom'

// Mock Next.js web APIs for API routes
if (typeof Request === 'undefined') {
  global.Request = class Request {
    constructor(input, init) {
      this._url = typeof input === 'string' ? input : input.url;
      this._init = init;
    }

    get url() {
      return this._url;
    }

    get method() {
      return this._init?.method || 'GET';
    }

    get headers() {
      return new Headers(this._init?.headers || {});
    }
  };
}

if (typeof Response === 'undefined') {
  global.Response = class Response {
    constructor(body, init) {
      this.body = body;
      this.init = init;
    }
  };
}

if (typeof Headers === 'undefined') {
  global.Headers = class Headers {
    constructor() {
      this.headers = {};
    }
    get(name) {
      return this.headers[name];
    }
    set(name, value) {
      this.headers[name] = value;
    }
  };
}

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: null,
    status: 'unauthenticated',
  })),
  SessionProvider: ({ children }) => children,
  signIn: jest.fn(),
  signOut: jest.fn(),
}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  })),
  usePathname: jest.fn(() => '/'),
  useSearchParams: jest.fn(() => new URLSearchParams()),
  notFound: jest.fn(),
}))

// Mock environment variables
process.env.NEXTAUTH_SECRET = 'test-secret'
process.env.NEXTAUTH_URL = 'http://localhost:3000'
