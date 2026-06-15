test('errorHandler returns HTML error page', () => {
  jest.resetModules();
  const { errorHandler } = require('../src/middleware/error');

  const err = new Error('Test error');
  const req = { method: 'GET', path: '/test', accepts: () => true };
  const res = {
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
  };
  const next = jest.fn();

  errorHandler(err, req, res, next);

  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.send).toHaveBeenCalledWith(expect.stringContaining('500'));
  expect(res.send).toHaveBeenCalledWith(expect.stringContaining('Something went wrong'));
});

test('errorHandler returns JSON for API requests', () => {
  jest.resetModules();
  const { errorHandler } = require('../src/middleware/error');

  const err = new Error('API error');
  const req = { method: 'POST', path: '/api/test', accepts: () => false };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  const next = jest.fn();

  errorHandler(err, req, res, next);

  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
});

test('notFoundHandler returns HTML 404 page', () => {
  jest.resetModules();
  const { notFoundHandler } = require('../src/middleware/error');

  const req = { get: () => 'localhost', accepts: () => true };
  const res = {
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
  };
  notFoundHandler(req, res);

  expect(res.status).toHaveBeenCalledWith(404);
  expect(res.send).toHaveBeenCalledWith(expect.stringContaining('404'));
  expect(res.send).toHaveBeenCalledWith(expect.stringContaining('Page not found'));
});

test('notFoundHandler returns JSON for API requests', () => {
  jest.resetModules();
  const { notFoundHandler } = require('../src/middleware/error');

  const req = { accepts: () => false };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  notFoundHandler(req, res);

  expect(res.status).toHaveBeenCalledWith(404);
  expect(res.json).toHaveBeenCalledWith({ error: 'Not found' });
});
