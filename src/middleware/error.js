function errorHandler(err, req, res, _next) {
  console.error(`[error] ${req.method} ${req.path}:`, err.message);

  if (req.accepts('html')) {
    return res.status(500).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head><meta charset="utf-8"><title>Error</title>
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <style>body{background:#1e1e2e;color:#cdd6f4;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}div{text-align:center}h1{color:#f38ba8}p{color:#a6adc8}</style>
      </head>
      <body><div><h1>500</h1><p>Something went wrong</p><a href="/" style="color:#89b4fa">Go home</a></div></body>
      </html>
    `);
  }

  res.status(500).json({ error: 'Internal server error' });
}

function notFoundHandler(req, res) {
  if (req.accepts('html')) {
    const host = req.get('host') || 'oblog';
    return res.status(404).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head><meta charset="utf-8"><title>Not Found</title>
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <style>body{background:#1e1e2e;color:#cdd6f4;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}div{text-align:center}h1{color:#f38ba8}p{color:#a6adc8}</style>
      </head>
      <body><div><h1>404</h1><p>Page not found</p><a href="/" style="color:#89b4fa">Go home</a></div></body>
      </html>
    `);
  }

  res.status(404).json({ error: 'Not found' });
}

module.exports = { errorHandler, notFoundHandler };
