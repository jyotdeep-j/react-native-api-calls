export const invalidEndpoint = name => `Invalid endpoint "${name}".`;

export const notLoggedIn = name =>
  `The endpoint "${name}" requires Authorization header.`;

export const noUrl = () =>
  'You need to set "url" first before requesting endpoints.';

export class ApiError extends Error {}
