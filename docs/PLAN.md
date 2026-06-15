# Oblog - Plan Técnico Completo

> **Proyecto**: Obsidian Vault as Blog - SSR con privacidad por defecto
> **Objetivo**: Hostear un vault de Obsidian en VPS, donde solo las notas con tag `#public` sean visibles sin login. Todo lo demás requiere autenticación JWT.
> **Licencia**: MIT (Open Source)
> **Deploy**: Docker + Coolify
> **Repo**: Privado en GitHub

---

## 1. Visión y Arquitectura

### Concepto Central
```
Privacidad por defecto, público por excepción.
```

- **Cualquier nota `.md` SIN el tag `#public`**: Inaccesible públicamente. Requiere login JWT.
- **Cualquier nota `.md` CON el tag `#public`**: Accesible en `/blog/*` sin autenticación.
- **Assets (imágenes, PDFs, etc.)**: Solo servidos si son referenciados por notas públicas O si el usuario está logueado. Si una nota pública referencia una imagen que está en una nota privada, la imagen se sirve igual porque la nota pública la necesita. **PERO** si alguien intenta acceder directamente a un asset sin referencia pública, debe requerir auth.

### Modelo de Renderizado: SSR (Server-Side Rendering)
**No se hace build estático.** Se indexa el vault en SQLite al iniciar/hacer pull, y cada nota se renderiza bajo demanda. Esto permite vaults de cualquier tamaño sin tiempos de build.

```
GitHub (repo privado) --push/webhook--> Coolify/VPS --pull--> Docker Container
                                                      |
                                                      v
                                              ┌─────────────────┐
                                              │ 1. git clone/pull
                                              │ 2. Indexar vault en SQLite
                                              │ 3. Servir con Express SSR
                                              └─────────────────┘
                                                      |
                                  ┌───────────────────┴───────────────────┐
                                  v                                       v
                          /blog/nota-publica                          /vault/nota-privada
                          (sin login, cacheable)                      (requiere JWT)
```

---

## 2. Stack Técnico

### Core
| Componente | Tecnología | Razón |
|------------|------------|-------|
| Runtime | Node.js 20 LTS | SSR, parseo markdown, ecosistema maduro |
| Framework | Express.js | Ligero, rápido, perfecto para SSR. Sin overhead de Next.js/Nuxt que no necesitamos |
| Base de datos | better-sqlite3 | Índice local del vault. Rápido, sin servidor, zero-config |
| Auth | jsonwebtoken + bcryptjs | JWT simple, stateless, múltiples usuarios |
| Git | nodegit o simple-git | Pull del repo privado |
| Cron | node-cron | Pull periódico como fallback si el webhook falla |

### Renderizado Markdown
| Plugin | NPM | Función |
|--------|-----|---------|
| markdown-it | `markdown-it` | Parser base |
| markdown-it-wikilinks | `markdown-it-wikilinks` | `[[Nota]]` → links. **Customizado** para verificar si el target es público antes de generar href |
| markdown-it-obsidian-images | `markdown-it-obsidian-images` | `![[imagen.png]]` → `<img>`. **Customizado** para resolver rutas relativas del vault |
| markdown-it-obsidian-callouts | `markdown-it-obsidian-callouts` | `> [!note]` callouts de Obsidian |
| markdown-it-katex | `@traptitech/markdown-it-katex` o `markdown-it-katex` | LaTeX `$...$` y `$$...$$` |
| markdown-it-task-lists | `markdown-it-task-lists` | Checkboxes `- [ ]` |
| markdown-it-footnote | `markdown-it-footnote` | Notas al pie `[^1]` |
| markdown-it-anchor | `markdown-it-anchor` | Anchors para headers |
| markdown-it-toc-done-right | `markdown-it-toc-done-right` | Tabla de contenidos (opcional) |
| highlight.js | `highlight.js` | Syntax highlighting para code blocks |
| gray-matter | `gray-matter` | Parseo de frontmatter YAML |

> **Nota**: `markdown-it-wikilinks` y `markdown-it-obsidian-images` deben ser **customizados o reemplazados** para que resuelvan rutas relativas al vault y validen visibilidad pública antes de generar links. Si una nota pública linkea a una privada, el link debe renderizarse como **texto plano** (sin `<a>`), no como link roto ni revelando que existe.

### UI / CSS
- **TailwindCSS** (via CDN o build simple) para estilos
- **Tema oscuro** default (estilo Obsidian)
- **CSS custom** para wikilinks, callouts, tags, blocks de código
- **KaTeX CSS** desde CDN

### Infraestructura
- **Docker** (Alpine Linux) para todo
- **Nginx** (opcional) como reverse proxy si Coolify no lo maneja
- **Coolify** para deploy y gestión de contenedores
- **GitHub Webhook** para auto-pull al hacer push
- **Git Deploy Key** o **Fine-grained PAT** para autenticación del contenedor con GitHub

---

## 3. Estructura de Carpetas del Proyecto

```
oblog/
├── docker/
│   └── Dockerfile
├── src/
│   ├── config/
│   │   └── index.js              # Variables de entorno, paths, defaults
│   ├── db/
│   │   ├── index.js              # Inicialización SQLite
│   │   ├── schema.sql            # Esquema de tablas
│   │   └── vault-indexer.js      # Indexador del vault
│   ├── git/
│   │   └── sync.js               # clone/pull del repo
│   ├── markdown/
│   │   ├── renderer.js           # Instancia markdown-it con todos los plugins
│   │   ├── plugins/
│   │   │   ├── wikilinks.js      # Customizado para validar visibilidad
│   │   │   ├── obsidian-images.js # Customizado para rutas del vault
│   │   │   └── tags.js           # Plugin custom para #public y #tag
│   │   └── cache.js              # Cache en disco de renders (LRU simple)
│   ├── routes/
│   │   ├── public.js             # /blog/* y /
│   │   ├── private.js            # /vault/* (requiere JWT)
│   │   ├── auth.js               # /login, /logout
│   │   └── assets.js             # /assets/* (imágenes, archivos)
│   ├── middleware/
│   │   ├── auth.js               # Verificación JWT
│   │   ├── cache.js              # Cache-Control para /blog
│   │   └── error.js              # Manejo de errores
│   ├── views/
│   │   ├── layout.html           # Layout base HTML
│   │   ├── note.html             # Template de nota
│   │   ├── blog-list.html        # Lista de posts públicos
│   │   └── login.html            # Formulario de login
│   ├── app.js                    # Entry point Express
│   └── server.js                 # Inicio del servidor + inicialización
├── vault/                        # Volumen Docker: el vault clonado (no commiteado)
├── data/                         # Volumen Docker: SQLite y cache
├── .env.example
├── .env
├── package.json
├── package-lock.json
└── README.md
```

---

## 4. Criterios de Privacidad y Tags

### Tag Público
- **Criterio**: Cualquier nota `.md` que contenga el tag `#public` en cualquier parte del contenido se considera pública.
- **No usa frontmatter** obligatoriamente, aunque el frontmatter se parsea y muestra.
- **Case-insensitive**: `#Public`, `#PUBLIC`, `#public` son válidos.
- **Delimitación**: El tag debe estar rodeado de espacios, nueva línea, o inicio/fin de string. No capturar `#publico` ni `#public123`.

### Ejemplo de Nota Pública
```markdown
# Mi Nota de Blog

#public

Aquí va el contenido que cualquiera puede ver.

[[Otra Nota Pública]]      --> Se convierte en link si Otra Nota Pública también es #public
[[Nota Privada]]             --> Se renderiza como texto plano "Nota Privada" (sin href)
![[imagen.png]]              --> Se muestra si existe en el vault
```

### Ejemplo de Nota Privada
```markdown
# Mi Nota Privada

#personal

Este contenido solo lo ven usuarios logueados.
No tiene #public, por lo tanto no aparece en /blog.
```

---

## 5. Esquema de Base de Datos (SQLite)

```sql
CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT NOT NULL UNIQUE,          -- Ruta relativa al vault root
    title TEXT,                          -- Primer H1 o nombre de archivo
    is_public INTEGER NOT NULL DEFAULT 0, -- 1 si tiene #public
    frontmatter TEXT,                    -- JSON del frontmatter
    tags TEXT,                           -- Tags encontrados (JSON array)
    content_hash TEXT,                   -- SHA256 del contenido para invalidar cache
    last_modified TEXT,                  -- Fecha del archivo
    indexed_at TEXT                      -- Cuándo se indexó
);

CREATE TABLE IF NOT EXISTS links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_path TEXT NOT NULL,           -- Nota que contiene el link
    target_path TEXT NOT NULL,           -- Nota/Archivo a la que apunta
    link_type TEXT NOT NULL,             -- 'wikilink' | 'embed' | 'external'
    FOREIGN KEY (source_path) REFERENCES notes(path)
);

CREATE TABLE IF NOT EXISTS assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT NOT NULL UNIQUE,           -- Ruta relativa al vault
    mime_type TEXT,
    referenced_by_public INTEGER DEFAULT 0 -- 1 si es referenciado por al menos una nota pública
);

CREATE INDEX IF NOT EXISTS idx_notes_public ON notes(is_public);
CREATE INDEX IF NOT EXISTS idx_notes_path ON notes(path);
CREATE INDEX IF NOT EXISTS idx_links_target ON links(target_path);
```

---

## 6. Flujo de Indexación

```
Inicio / Git Pull
      |
      v
  Recorrer todo el vault
      |
      v
  Para cada .md:
  1. Calcular hash
  2. Si hash cambió o no existe:
     - Parsear frontmatter (gray-matter)
     - Buscar #public en contenido
     - Extraer título (primer H1 o filename)
     - Extraer tags (#tag)
     - Extraer wikilinks [[...]] y embeds ![[...]]
     - Insertar/actualizar en SQLite
  3. Si hash igual: saltar
      |
      v
  Para cada asset (img, pdf, etc.):
  - Verificar si es referenciado por alguna nota pública
  - Actualizar `referenced_by_public`
      |
      v
  Invalidar cache de notas modificadas
```

### Rendimiento
- Con `better-sqlite3` y operaciones sincrónicas, indexar 5000 notas toma < 5 segundos en un VPS modesto.
- El indexador debe correr en un **worker thread** o al menos no bloquear el event loop de Express.
- Se puede usar `chokidar` para watch mode en desarrollo, pero en producción se dispara solo por webhook o cron.

---

## 7. Endpoints

### Públicos (sin auth)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Lista de posts públicos (ordenados por fecha de modificación, más nuevo primero) |
| GET | `/blog/:slug` | Renderizado SSR de una nota pública. Slug = nombre de archivo sin .md |
| GET | `/assets/*` | Archivos estáticos (imágenes, PDFs). Solo si `referenced_by_public=1` |
| GET | `/login` | Formulario de login |
| POST | `/login` | Autenticación, devuelve JWT en cookie httpOnly |

### Privados (requiere JWT válido)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/vault/:slug` | Renderizado SSR de cualquier nota (pública o privada) |
| GET | `/vault/` | Lista de TODAS las notas (públicas + privadas) con indicador de visibilidad |
| GET | `/assets/*` | Cualquier asset, sin restricción de `referenced_by_public` |
| POST | `/logout` | Limpia cookie JWT |

### API / Webhook
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/webhook/github` | Recibe push event de GitHub → dispara `git pull` + reindexación |
| POST | `/admin/sync` | Manual sync (protegido por admin key) |
| GET | `/health` | Healthcheck para Coolify/Docker |

---

## 8. Sistema de Autenticación JWT

### Diseño
- **Stateless**: No hay sesiones en servidor. Todo en JWT.
- **Cookie httpOnly**: El token se almacena en cookie `httpOnly; Secure; SameSite=Strict`.
- **No refresh tokens**: Tokens con expiración larga (ej: 30 días) para simplicidad. Se puede regenerar al login.
- **Múltiples usuarios**: Tabla `users` en SQLite (o variables de entorno para v1) con bcrypt.

### Variables de Entorno
```bash
JWT_SECRET=supersecreto_random_32chars
JWT_EXPIRES_IN=30d
ADMIN_PASSWORD_HASH=$2b$10$... # bcrypt hash para el primer usuario
```

### Flow
```
Usuario visita /login → POST /login (username, password)
  → bcrypt compare → Generar JWT → Set cookie → Redirect /vault/
```

### Middleware de Auth
```js
function requireAuth(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return res.redirect('/login');
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    res.clearCookie('token');
    return res.redirect('/login');
  }
}
```

---

## 9. Renderizado Markdown Detallado

### Plugins y Configuración

```js
const MarkdownIt = require('markdown-it');
const md = new MarkdownIt({
  html: true,        // Necesario para callouts y HTML en clippings
  linkify: true,     // Auto-detectar URLs
  typographer: true, // Guiones, comillas tipográficas
});

// Plugins
md.use(require('markdown-it-katex'), { throwOnError: false });
md.use(require('markdown-it-obsidian-callouts'));
md.use(require('markdown-it-task-lists'), { enabled: true });
md.use(require('markdown-it-footnote'));
md.use(require('markdown-it-anchor'));

// Wikilinks customizado
md.use(require('./plugins/wikilinks'), {
  vaultPath: VAULT_PATH,
  resolveVisibility: (targetPath) => {
    // Consulta SQLite: ¿es pública esta nota?
    return db.isPublic(targetPath);
  },
  onPrivateLink: (token) => {
    // Renderizar como texto plano, sin <a>
    return token.content;
  }
});

// Obsidian images customizado
md.use(require('./plugins/obsidian-images'), {
  vaultPath: VAULT_PATH,
  assetBaseUrl: '/assets',
  resolveExists: (imgPath) => fs.existsSync(imgPath),
});

// Tags customizado
md.use(require('./plugins/tags'), {
  onTag: (tag) => {
    if (tag === 'public') return null; // No renderizar #public
    return `<a href="/tag/${tag}" class="tag">#${tag}</a>`;
  }
});
```

### Comportamiento Crítico: Wikilinks Privados

```js
// En el plugin customizado de wikilinks
function renderWikilink(state, silent, text) {
  const match = text.match(/^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/);
  if (!match) return false;

  const target = match[1];
  const label = match[2] || target;
  const targetPath = resolveVaultPath(target); // Buscar en el vault

  // Si NO hay sesión y el target NO es público → texto plano
  if (!state.env.isAuthenticated && !isPublic(targetPath)) {
    state.push('text', '', 0).content = label;
    return true;
  }

  // Si es público o hay auth → link normal
  const href = state.env.isAuthenticated
    ? `/vault/${slugify(target)}`
    : `/blog/${slugify(target)}`;

  const token = state.push('link_open', 'a', 1);
  token.attrs = [['href', href], ['class', 'wikilink']];
  state.push('text', '', 0).content = label;
  state.push('link_close', 'a', -1);
  return true;
}
```

### Comportamiento de Embed Images
```markdown
![[imagen.png|300]]   --> <img src="/assets/img/imagen.png" alt="" style="width:300px" />
![[Pasted image 20240426183935.png]]  --> <img src="/assets/img/Pasted%20image%2020240426183935.png" />
```

Las imágenes deben servirse desde `/assets/` mapeando rutas relativas del vault. Ej:
- Vault: `img/Pasted image 20240426183935.png`
- Web: `/assets/img/Pasted%20image%2020240426183935.png`

---

## 10. Estrategia Git y Webhook

### GitHub Setup
1. **Deploy Key** (recomendado): Generar par de claves SSH en el contenedor, agregar la pública al repo como Deploy Key con permisos de lectura.
2. **Fine-grained PAT**: Alternativa, menos segura.

### Webhook
- En GitHub: Settings → Webhooks → Add webhook
- Payload URL: `https://tudominio.com/webhook/github`
- Content type: `application/json`
- Secret: configurado en `WEBHOOK_SECRET`
- Events: **Just the push event**

### En el Contenedor
```js
// webhook handler
app.post('/webhook/github', (req, res) => {
  const signature = req.headers['x-hub-signature-256'];
  if (!verifySignature(req.body, signature, WEBHOOK_SECRET)) {
    return res.status(401).send('Unauthorized');
  }

  // Responder inmediatamente para no timeout de GitHub
  res.status(200).send('OK');

  // Procesar async
  processWebhook(req.body);
});

async function processWebhook(payload) {
  await gitPull();       // simple-git pull
  await reindexVault();  // Reindexar solo archivos cambiados
  invalidateCache();   // Limpiar cache
}
```

### Fallback Cron
```js
// Cada 2 minutos, si el webhook no llegó (o falló)
cron.schedule('*/2 * * * *', async () => {
  const status = await git.status();
  if (status.behind > 0) {
    await gitPull();
    await reindexVault();
  }
});
```

---

## 11. Docker y Coolify

### Dockerfile
```dockerfile
FROM node:20-alpine

# Instalar git para pulls
RUN apk add --no-cache git openssh-client

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY src ./src
COPY docker/entrypoint.sh ./entrypoint.sh
RUN chmod +x entrypoint.sh

# Volumen para el vault y datos persistentes
VOLUME ["/app/vault", "/app/data"]

EXPOSE 3000

CMD ["./entrypoint.sh"]
```

### entrypoint.sh
```bash
#!/bin/sh
# Configurar SSH para GitHub si hay deploy key
if [ -f /app/data/ssh/id_ed25519 ]; then
  mkdir -p ~/.ssh
  cp /app/data/ssh/id_ed25519 ~/.ssh/
  chmod 600 ~/.ssh/id_ed25519
  ssh-keyscan -t ed25519 github.com >> ~/.ssh/known_hosts
fi

# Clonar si no existe el vault
if [ ! -d /app/vault/.git ]; then
  git clone "${GIT_REPO_URL}" /app/vault
fi

# Iniciar app
node src/server.js
```

### Coolify Config
- **Service type**: Docker Compose o Dockerfile
- **Volumes**: 
  - `/app/data` → persistente (SQLite, cache, SSH keys)
  - `/app/vault` → persistente (el repo clonado)
- **Environment variables**: definir en Coolify UI
- **Domain**: Coolify maneja el subdominio y SSL
- **Healthcheck**: `GET /health` esperando 200

### Variables de Entorno Requeridas
```bash
# Git
GIT_REPO_URL=git@github.com:usuario/vault-repo.git
# o https://github.com/usuario/vault-repo.git con PAT

# Auth
JWT_SECRET=changeme_32chars_minimum
JWT_EXPIRES_IN=30d
ADMIN_PASSWORD_HASH=bcrypt_hash

# Webhook
WEBHOOK_SECRET=otro_secreto

# Paths
VAULT_PATH=/app/vault
DATA_PATH=/app/data

# App
PORT=3000
NODE_ENV=production
CACHE_ENABLED=true
```

---

## 12. Cache y Rendimiento

### Cache de Renderizado
- **Nivel 1**: Cache en disco (filesystem) para notas públicas. `/app/data/cache/blog/:slug.html`
- **Invalidación**: Se borra el archivo de cache cuando el hash del .md cambia (detectado en reindexación).
- **TTL**: No necesario, ya que se invalida por hash.

### Middleware Express
```js
// Para /blog/*, servir cache si existe
app.use('/blog', (req, res, next) => {
  const cachePath = path.join(DATA_PATH, 'cache', req.path + '.html');
  if (fs.existsSync(cachePath)) {
    return res.sendFile(cachePath);
  }
  next();
});
```

### Assets
- Los assets se sirven con `express.static` pero **con middleware de autorización** que verifica `referenced_by_public` antes de responder.
- Imágenes grandes se sirven directamente, sin procesamiento.

---

## 13. Seguridad y Privacidad

### Checklist de Seguridad
- [ ] **Default deny**: Toda nota es privada a menos que tenga `#public`.
- [ ] **No directory listing**: No se puede listar `/vault/` o `/assets/` sin auth.
- [ ] **No path traversal**: Validar que `slug` no contenga `..` o caracteres especiales.
- [ ] **Asset protection**: Si un asset no es `referenced_by_public` y no hay auth, devolver 404 (no 403, para no revelar existencia).
- [ ] **Private links como texto**: Wikilinks a notas privadas desde notas públicas se renderizan sin `href`.
- [ ] **No metadata leakage**: Frontmatter de notas privadas no aparece en respuestas públicas.
- [ ] **HTTPS only**: Forzado por Coolify/Nginx.
- [ ] **Secure cookies**: `httpOnly`, `Secure`, `SameSite=Strict`.
- [ ] **Rate limiting**: `express-rate-limit` en `/login` y `/webhook`.
- [ ] **Webhook signature**: Verificar `x-hub-signature-256` de GitHub.

### Escenario de Riesgo
> **Usuario malicioso intenta adivinar `/blog/nota-secreta`**: El servidor debe buscar el archivo. Si no es `#public`, devolver **404 Not Found** (idéntico a si no existiera). Nunca 403.

---

## 14. Pasos de Implementación (Roadmap)

### Fase 1: MVP Core (Semana 1)
1. [ ] Scaffold de Express + Docker + SQLite schema
2. [ ] Indexador básico del vault (recorre .md, extrae #public, frontmatter, tags)
3. [ ] SSR básico de markdown con markdown-it + plugins core
4. [ ] Rutas `/blog/:slug` y `/vault/:slug` (sin auth todavía)
5. [ ] Servidor de assets `/assets/*` con mapeo de rutas
6. [ ] Customización de wikilinks para validar visibilidad
7. [ ] Customización de obsidian-images para rutas del vault
8. [ ] Git sync (simple-git clone/pull)

### Fase 2: Auth y Webhook (Semana 2)
1. [ ] JWT auth con bcrypt + cookies httpOnly
2. [ ] Middleware `requireAuth` para rutas `/vault/*`
3. [ ] Página `/login` y logout
4. [ ] Webhook GitHub con verificación de firma
5. [ ] Cron fallback para sync
6. [ ] Reindexación incremental (solo archivos modificados)

### Fase 3: Polish y Deploy (Semana 3)
1. [ ] TailwindCSS + tema oscuro tipo Obsidian
2. [ ] Página `/` con lista de posts públicos
3. [ ] Cache en disco para notas públicas
4. [ ] Soporte de LaTeX (KaTeX)
5. [ ] Soporte de callouts
6. [ ] Rate limiting y headers de seguridad
7. [ ] Healthcheck y logs estructurados
8. [ ] Deploy en Coolify con Docker

### Fase 4: Open Source (Semana 4)
1. [ ] README completo con instrucciones
2. [ ] LICENSE MIT
3. [ ] `.env.example` documentado
4. [ ] Script de setup automatizado
5. [ ] Publicar en GitHub como open source

---

## 15. Open Source Considerations

### Para que sirva a cualquier vault:
- **Configuración via env vars**: No hardcodear paths como `img/` o `Attachments/`.
- **Detectar attachments folder**: Parsear `.obsidian/app.json` si existe para leer `attachmentFolderPath`.
- **Slugify configurable**: Algunos usuarios prefieren títulos en lugar de filenames.
- **No dependencias de Obsidian específicas**: Solo markdown, Git, y SQLite.
- **Documentación**: Cómo instalar el plugin de Git en Obsidian, configurar el webhook, etc.

### Estructura del Repo Público
```
org/oblog
├── README.md          # Instalación, setup, deploy en Coolify
├── docs/
│   ├── setup.md       # Configuración paso a paso
│   ├── deploy.md      # Coolify, Docker, VPS
│   └── obsidian.md    # Configuración del plugin de Git
├── docker-compose.yml # Para self-hosting simple
└── src/               # Código fuente
```

---

## 16. Notas Técnicas Adicionales

### markdown-it-katex vs @traptitech/markdown-it-katex
- `markdown-it-katex` (original) tiene 10 años sin actualizar pero funciona.
- `@traptitech/markdown-it-katex` es un fork más moderno con mejor soporte de KaTeX. **Usar el fork.**

### Wikilinks con aliases
Obsidian soporta `[[Nota|Texto visible]]`. El plugin debe respetar el alias. Si la nota no es pública, se renderiza solo el alias como texto plano.

### Frontmatter `index: [[iatel]]`
Obsidian usa wikilinks incluso en el frontmatter. El indexador debe parsear esto como string, no intentar resolverlo a menos que sea necesario.

### Excalidraw
Los archivos `.excalidraw.md` son archivos de texto con JSON. El indexador debe tratarlos como `.md` o ignorarlos. Recomendación: **ignorarlos** a menos que se implemente un renderizador de SVG.

### `.obsidian` y `.trash`
El indexador debe ignorar siempre:
- `.obsidian/`
- `.trash/`
- `.git/`
- `.stfolder*/`
- Archivos ocultos que empiecen con `.`

### Manejo de tildes y espacios en filenames
```js
// Slugify para URLs
function slugify(filename) {
  return filename
    .replace(/\.md$/, '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quitar tildes
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 100);
}

// Pero para buscar en el vault, usar el nombre original
function resolveNote(slug) {
  // Buscar en SQLite por slug o por path
  return db.findBySlug(slug);
}
```

---

## 17. Ejemplo de Uso Final

```
# Tu PC (Obsidian)
Escribes una nota → Le pones #public → Git plugin hace commit → Push automático

# GitHub (repo privado)
Recibe el push → Dispara webhook a tu VPS

# VPS (Coolify + Docker)
Webhook recibido → Git pull → Reindexación SQLite → Cache invalidada

# Visitante anónimo
Entra a tu-blog.com → Ve lista de posts públicos
→ Click en "Docker Port Mapping" → Ve el contenido con imágenes, LaTeX, callouts
→ No puede acceder a /vault/ ni ver notas privadas

# Tú (logueado)
Entra a tu-blog.com/login → JWT cookie
→ Accedes a /vault/ → Ves TODO el vault, con búsqueda, navegación, backlinks
→ Las notas públicas se ven igual, pero ahora los wikilinks a privadas funcionan
```

---

## 18. Decisiones Clave Resumidas

| Decisión | Opción Elegida | Razón |
|----------|---------------|-------|
| Renderizado | SSR (no estático) | Vaults de cualquier tamaño, sin build times |
| Criterio público | Tag `#public` en contenido | Simple, flexible, visible en Obsidian |
| Links privados | Texto plano sin href | No revela existencia, no confunde al usuario |
| Auth | JWT + cookies httpOnly | Stateless, múltiples usuarios, seguro |
| Markdown engine | markdown-it + plugins custom | Más control, mejor rendimiento que MDX |
| Imágenes | Serve directo desde vault | Sin procesamiento, sin CDNs obligatorios |
| LaTeX | KaTeX | Más rápido que MathJax, más ligero |
| CSS | Tailwind + custom | Rápido de implementar, tema oscuro fácil |
| DB | SQLite | Zero-config, suficiente para indexado, no requiere servicio extra |
| Git | Deploy Key + webhook | Seguro, no requiere credenciales de usuario en servidor |
| Deploy | Docker + Coolify | El usuario ya lo tiene, gestiona SSL y dominio |

---

*Plan creado para implementación por otro modelo/agente. Incluir toda la investigación y decisiones arquitectónicas tomadas.*
