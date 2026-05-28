import { randomUUID } from "node:crypto";

const DEFAULT_EXTENSIONS = [
  {
    id: "browser-computer-use",
    name: "Browser Computer Use",
    version: "1.0.0",
    description: "Playwright navigation, extraction, form filling, screenshots, and workflow memory.",
    permissions: ["browser.search", "browser.navigate", "browser.workflow"],
  },
  {
    id: "app-factory",
    name: "App Factory",
    version: "1.0.0",
    description: "Full-stack app generation, file persistence, debugging, and ZIP export.",
    permissions: ["app.generate", "code.execute", "filesystem.read"],
  },
  {
    id: "deployment-automation",
    name: "Deployment Automation",
    version: "1.0.0",
    description: "Generate deploy configs for Vercel, Railway, Render, Netlify, Docker, and CI/CD.",
    permissions: ["api.request", "terminal.exec"],
  },
];

export class PostgresMarketplaceExtensionRepository {
  constructor(pool) {
    this.pool = pool;
    this.defaultsSeeded = false;
    this.seedingDefaults = false;
  }

  async seedDefaults() {
    if (!this.pool || this.defaultsSeeded || this.seedingDefaults) return;
    this.seedingDefaults = true;
    try {
      for (const extension of DEFAULT_EXTENSIONS) {
        await this.#upsertManifest({ ...extension, manifest: extension });
      }
      this.defaultsSeeded = true;
    } finally {
      this.seedingDefaults = false;
    }
  }

  async find() {
    await this.seedDefaults();
    const result = await this.pool.query(
      `select e.*,
              coalesce(avg(r.rating), 0)::numeric(4,2) as rating,
              count(r.id)::int as review_count
       from marketplace_extensions e
       left join marketplace_reviews r on r.extension_id = e.id
       where e.status = 'published'
       group by e.id
       order by rating desc, name asc`
    );
    return result.rows;
  }

  async getById(id) {
    await this.seedDefaults();
    if (!this.pool) return DEFAULT_EXTENSIONS.find((extension) => extension.id === id) || null;
    const result = await this.pool.query("select * from marketplace_extensions where id = $1", [id]);
    return result.rows[0];
  }

  async upsert(manifest) {
    await this.#upsertManifest(manifest);
    return this.getById(manifest.id);
  }

  async #upsertManifest(manifest) {
    await this.pool.query(
      `insert into marketplace_extensions (id, name, version, description, manifest, permissions, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, now(), now())
       on conflict (id) do update set
         name = excluded.name,
         version = excluded.version,
         description = excluded.description,
         manifest = excluded.manifest,
         permissions = excluded.permissions,
         updated_at = now()`,
      [manifest.id, manifest.name, manifest.version, manifest.description || null, manifest, manifest.permissions || []]
    );
  }
}

export class PostgresMarketplaceInstallationRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async install({ workspaceId, extensionId, userId, permissions }) {
    const id = randomUUID();
    await this.pool.query(
      `insert into marketplace_installations (id, workspace_id, extension_id, user_id, permissions, installed_at)
       values ($1, $2, $3, $4, $5, now())
       on conflict (workspace_id, extension_id) do update set
         permissions = excluded.permissions,
         status = 'installed',
         installed_at = now()`,
      [id, workspaceId, extensionId, userId || null, permissions || []]
    );
    const result = await this.pool.query(
      "select * from marketplace_installations where workspace_id = $1 and extension_id = $2",
      [workspaceId, extensionId]
    );
    return result.rows[0];
  }

  async list({ workspaceId }) {
    const result = await this.pool.query(
      `select i.*, e.name, e.version, e.description, e.manifest
       from marketplace_installations i
       join marketplace_extensions e on e.id = i.extension_id
       where i.workspace_id = $1
       order by i.installed_at desc`,
      [workspaceId]
    );
    return result.rows;
  }
}

export class PostgresMarketplaceReviewRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async review({ workspaceId, extensionId, userId, rating, review }) {
    const id = randomUUID();
    await this.pool.query(
      `insert into marketplace_reviews (id, workspace_id, extension_id, user_id, rating, review, created_at)
       values ($1, $2, $3, $4, $5, $6, now())
       on conflict (workspace_id, extension_id, user_id) do update set
         rating = excluded.rating,
         review = excluded.review,
         created_at = now()`,
      [id, workspaceId, extensionId, userId || "anonymous", Number(rating), review || null]
    );
    return { extensionId, rating: Number(rating) };
  }
}
