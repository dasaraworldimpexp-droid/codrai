export class VectorDatabaseAdapter {
  constructor({ provider }) {
    this.provider = provider;
  }

  upsert(records) {
    return this.provider.upsert(records);
  }

  search(query) {
    return this.provider.search(query);
  }

  deleteByScope(scope) {
    return this.provider.deleteByScope(scope);
  }
}
