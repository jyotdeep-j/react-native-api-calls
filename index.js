import axios from 'axios';
import env from 'src/config/env';

import endpointRules from './endpointRules';
import * as err from './errors';

const {ApiError} = err;

const api = axios.create({
  baseURL: env.API_URL,
  headers: {
    common: {
      client_key: env.API_CLIENT_KEY,
      client_secret: env.API_CLIENT_SECRET,
    },
  },
});

export const HEADER_ACCESS_TOKEN = 'access-token';
export const HEADER_UID = 'uid';
export const HEADER_CLIENT = 'client';
export const TIME_FORMAT = 'GGGG-MM-DDTHH:mm:ss.SSSZ';
export const DATE_FORMAT = 'MM/DD/YY';

export const setUrl = url => {
  api.defaults.baseURL = url;
};

export const getUrl = () => api.defaults.baseURL;

export const setHeader = (name, value, type = 'common') => {
  api.defaults.headers[type][name] = value;
};

export const getHeader = (name, type = 'common') =>
  api.defaults.headers[type][name];

export const endpoint = (
  name,
  options = {
    normalize: data => data,
  },
) => {
  const endpointRule = endpointRules[name];

  // throw for invalid endpoint endpointRule
  if (!endpointRule) {
    throw new ApiError(err.invalidEndpoint(name));
  }

  // throw for unset url
  if (!api.defaults.baseURL) {
    throw new ApiError(err.noUrl());
  }

  return createEndpoint(name, endpointRule, options);
};

export const createEndpoint = (name, endpointRule, options = {}) => {
  const {normalize} = options;
  // create endpoint handler
  const handler = (data = {}) => {
    // check if the endpoint requires path parameters
    let endpointPath = endpointRule.path;
    let requestData = data;
    const pathParams = getPathParams(endpointRule.path);
    if (pathParams.length) {
      endpointPath = setPathParams(endpointPath, data);
      requestData = stripParamsFromData(data, pathParams);
    }

    // set the request method and url
    const requestConfig = {
      url: endpointPath,
      method: endpointRule.method,
    };

    // Set data to request body for post|patch requests.
    if (['post', 'patch', 'put'].includes(endpointRule.method)) {
      requestConfig.data = getEndpointData(endpointRule, requestData);
    }

    // Set data to request query string for get|delete requests.
    if (['get', 'delete'].includes(endpointRule.method)) {
      requestConfig.params = requestData;
    }

    return api(requestConfig).then(res => {
      if (res.headers[HEADER_ACCESS_TOKEN]) {
        setHeader(HEADER_ACCESS_TOKEN, res.headers[HEADER_ACCESS_TOKEN]);
      }
      if (res.headers[HEADER_UID]) {
        setHeader(HEADER_UID, res.headers[HEADER_UID]);
      }
      if (res.headers[HEADER_CLIENT]) {
        setHeader(HEADER_CLIENT, res.headers[HEADER_CLIENT]);
      }

      // apply reponse normalizer
      if (typeof normalize === 'function') {
        res.data = normalize(res.data || {}, res.headers);
      }
      return res;
    });
  };

  return handler;
};

export const getPathParams = path => {
  const result = path.match(/:(\w+)/g);
  if (result) {
    return result.map(s => s.replace(':', ''));
  }
  return [];
};

export const setPathParams = (path, params) => {
  return path.replace(/(?::)(\w+)/g, (match, group) => params[group]);
};

export const stripParamsFromData = (data, params) => {
  return Object.keys(data).reduce((res, key) => {
    if (!params.includes(key)) {
      res[key] = data[key];
    }
    return res;
  }, {});
};

export const getEndpointData = (endpointRule, requestData = {}) => {
  if (endpointRule.type === 'form') {
    const data = new FormData();
    Object.keys(requestData).forEach(key => {
      data.append(key, requestData[key]);
    });
    return data;
  }
  return requestData;
};

export default api;
