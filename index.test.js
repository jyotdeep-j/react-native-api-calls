import env from 'src/config/env';
import moxios from 'moxios';
import api, {
  getUrl,
  setUrl,
  getHeader,
  setHeader,
  endpoint,
  createEndpoint,
  getPathParams,
  setPathParams,
  stripParamsFromData,
  HEADER_ACCESS_TOKEN,
  HEADER_CLIENT,
  HEADER_UID,
} from './';
import * as errors from './errors';
import endpointRules from './endpointRules';

beforeEach(() => {
  moxios.install(api);
});

afterEach(() => {
  moxios.uninstall(api);
});

test('api has correct baseUrl', () => {
  const url = getUrl();
  expect(url).toBe(env.API_URL);
});

test('api has correct client_key header', () => {
  const url = getHeader('client_key');
  expect(url).toBe(env.API_CLIENT_KEY);
});

test('api has correct client_secret header', () => {
  const url = getHeader('client_secret');
  expect(url).toBe(env.API_CLIENT_SECRET);
});

test('endpoint throws if invalid endpoint name is provided', () => {
  const name = 'logo';
  expect(() => endpoint(name)).toThrowError(errors.invalidEndpoint(name));
});

describe('endpoint', () => {
  const url = getUrl();
  beforeAll(() => {
    setUrl('');
  });
  afterAll(() => {
    setUrl(url);
  });
  test('throws if url is not set on an api', () => {
    expect(() => endpoint('logout')).toThrowError(errors.noUrl());
  });
});

test('returns handler function for valid endpoint', () => {
  expect(endpoint('login')).toBeInstanceOf(Function);
});

test('createEndpoint returns a function', () => {
  expect(createEndpoint('logout', endpointRules.logout)).toBeInstanceOf(
    Function,
  );
});

describe('Api endpoint handler', () => {
  const token = 'Bearer 1234';
  beforeEach(() => {
    setHeader(HEADER_ACCESS_TOKEN, token);
  });

  afterEach(() => {
    setHeader(HEADER_ACCESS_TOKEN);
  });

  test('sets api headers to the request', (done) => {
    endpoint('logout')();
    moxios.wait(() => {
      const request = moxios.requests.mostRecent();
      expect(request.headers[HEADER_ACCESS_TOKEN]).toBe(token);
      done();
    });
  });

  test('sets passed data to request query string for get requests', (done) => {
    const data = {
      email: 'nova@prospect.hl',
    };
    endpoint('getProfile')(data);
    moxios.wait(() => {
      const request = moxios.requests.mostRecent();
      expect(request.config.params).toEqual(data);
      done();
    });
  });

  test('replaces the url path params if there are any', (done) => {
    const data = {
      id: 1234,
    };
    endpoint('getLoad')(data);
    moxios.wait(() => {
      const request = moxios.requests.mostRecent();
      expect(request.config.url).toBe(
        endpointRules.getLoad.path.replace(':id', data.id),
      );
      done();
    });
  });

  test('replaces the url path params if there are any and adds the rest data to query for get|delete requests', (done) => {
    const extraData = {
      extra: 'data',
    };
    const data = {
      id: 1234,
      ...extraData,
    };
    endpoint('getLoad')(data);
    moxios.wait(() => {
      const request = moxios.requests.mostRecent();
      expect(request.config.url).toBe(
        endpointRules.getLoad.path.replace(':id', data.id),
      );
      expect(request.config.params).toEqual(extraData);
      done();
    });
  });

  test('replaces the url path params if there are any and adds the rest data to body for post|patch requests', (done) => {
    const extraData = {
      extra: 'data',
    };
    const data = {
      id: 1234,
      ...extraData,
    };
    endpoint('updateLoad')(data);
    moxios.wait(() => {
      const request = moxios.requests.mostRecent();
      expect(request.config.url).toBe(
        endpointRules.getLoad.path.replace(':id', data.id),
      );
      expect(request.config.data._data).toEqual(extraData);
      done();
    });
  });

  test('updates three auth headers if they are present in the response', (done) => {
    const accessToken = env.accessToken;
    const client = env.client;
    const uid = env.uid;
    endpoint('getProfile')();
    moxios.wait(() => {
      const request = moxios.requests.mostRecent();
      request
        .respondWith({
          status: 200,
          response: JSON.stringify({
            data: {
              foo: 'bar',
            },
          }),
          headers: {
            'access-token': accessToken,
            client,
            uid,
          },
        })
        .then((response) => {
          expect(getHeader(HEADER_ACCESS_TOKEN)).toBe(accessToken);
          expect(getHeader(HEADER_CLIENT)).toBe(client);
          expect(getHeader(HEADER_UID)).toBe(uid);
          done();
        });
    });
  });
});

describe('getPathParams', () => {
  test('should return an array of path parameters if there are any', () => {
    const params = getPathParams('/one/:two/:three');
    expect(params[0]).toBe('two');
    expect(params[1]).toBe('three');
  });
  test('should return an empty array if no path params present', () => {
    const params = getPathParams('/one/two/three');
    expect(params).toBeInstanceOf(Array);
    expect(params.length).toBe(0);
  });
});

describe('setPathParams', () => {
  test('replaces path params with their respected values', () => {
    const updatedPath = setPathParams('/one/:two/:three', {
      two: 'foo',
      three: 'bar',
    });
    expect(updatedPath).toBe('/one/foo/bar');
  });
});

test('given an array of property names and an object, strips those properties from the object', () => {
  const obj = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
  };
  const result = {
    two: 2,
    five: 5,
  };
  const names = ['one', 'three', 'four'];
  expect(stripParamsFromData(obj, names)).toEqual(result);
});
