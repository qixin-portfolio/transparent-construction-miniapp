function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function storageError(code, message) {
  const error = new Error(message)
  error.code = code
  return error
}

function comparableValue(value) {
  if (value instanceof Date) return value.getTime()
  const parsed = new Date(value).getTime()
  return Number.isNaN(parsed) ? value : parsed
}

function matchesWhere(doc, where) {
  return Object.entries(where || {}).every(([key, expected]) => {
    const actual = doc[key]
    if (expected && expected.__op === 'in') return expected.values.indexOf(actual) !== -1
    if (expected && expected.__op === 'gte') return comparableValue(actual) >= comparableValue(expected.value)
    if (expected && expected.__op === 'lt') return comparableValue(actual) < comparableValue(expected.value)
    return actual === expected
  })
}

function applyUpdate(doc, data) {
  Object.entries(data || {}).forEach(([key, value]) => {
    if (value && value.__op === 'push') {
      doc[key] = (Array.isArray(doc[key]) ? doc[key] : []).concat([clone(value.value)])
      return
    }
    doc[key] = clone(value)
  })
}

class StoreView {
  constructor(model, data) {
    this.model = model
    this.data = data
    this.adds = []
    this.updates = []
  }

  collection(name) {
    if (!Object.prototype.hasOwnProperty.call(this.data, name)) {
      throw storageError('COLLECTION_NOT_FOUND', `${name} collection does not exist`)
    }
    return new CollectionView(this, name)
  }
}

class DocumentView {
  constructor(store, name, id) {
    this.store = store
    this.name = name
    this.id = id
  }

  async get() {
    await this.store.model.beforeRead(this.name, this.id)
    return { data: clone(this.store.data[this.name][this.id] || null) }
  }

  async set({ data }) {
    this.store.model.beforeWrite(this.name, this.id)
    this.store.data[this.name][this.id] = Object.assign({ _id: this.id }, clone(data))
    this.store.updates.push({ collection: this.name, id: this.id, data: clone(data), set: true })
    return { stats: { updated: 1 } }
  }

  async update({ data }) {
    this.store.model.beforeWrite(this.name, this.id)
    const doc = this.store.data[this.name][this.id]
    if (!doc) throw storageError('DOCUMENT_NOT_FOUND', `${this.name}/${this.id} does not exist`)
    applyUpdate(doc, data)
    this.store.updates.push({ collection: this.name, id: this.id, data: clone(data) })
    return { stats: { updated: 1 } }
  }
}

class QueryView {
  constructor(store, name, where) {
    this.store = store
    this.name = name
    this.where = where || {}
    this.sort = null
    this.skipCount = 0
    this.limitCount = null
  }

  orderBy(field, direction) {
    this.sort = { field, direction }
    return this
  }

  skip(count) {
    this.skipCount = count
    return this
  }

  limit(count) {
    this.limitCount = count
    return this
  }

  async get() {
    await this.store.model.beforeRead(this.name, '*')
    let items = Object.values(this.store.data[this.name]).filter((item) => matchesWhere(item, this.where))
    if (this.sort) {
      const { field, direction } = this.sort
      items.sort((left, right) => (direction === 'desc' ? -1 : 1) * (comparableValue(left[field]) > comparableValue(right[field]) ? 1 : -1))
    }
    items = items.slice(this.skipCount)
    if (this.limitCount !== null) items = items.slice(0, this.limitCount)
    return { data: clone(items) }
  }

  async update({ data }) {
    this.store.model.beforeWrite(this.name, '*')
    Object.entries(this.store.data[this.name]).forEach(([id, doc]) => {
      if (!matchesWhere(doc, this.where)) return
      applyUpdate(doc, data)
      this.store.updates.push({ collection: this.name, id, data: clone(data) })
    })
    return { stats: { updated: 1 } }
  }
}

class CollectionView {
  constructor(store, name) {
    this.store = store
    this.name = name
  }

  doc(id) {
    return new DocumentView(this.store, this.name, id)
  }

  where(where) {
    return new QueryView(this.store, this.name, where)
  }

  async add({ data }) {
    this.store.model.beforeWrite(this.name, '*')
    const id = `${this.name}_${++this.store.model.nextId}`
    this.store.data[this.name][id] = Object.assign({ _id: id }, clone(data))
    this.store.adds.push({ collection: this.name, id, data: clone(data) })
    return { _id: id }
  }
}

class TransactionModelDb {
  constructor(seed = {}, options = {}) {
    this.data = clone(seed)
    this.options = options
    this.version = 0
    this.nextId = 0
    this.adds = []
    this.updates = []
    this.transactionAttempts = 0
    this.transactionConflicts = 0
  }

  beforeRead(name, id) {
    if (this.options.failReads && this.options.failReads.indexOf(name) !== -1) {
      throw storageError('PERMISSION_DENIED', `read denied for ${name}`)
    }
    if (this.options.onRead) return this.options.onRead(name, id)
  }

  beforeWrite(name, id) {
    if (this.options.failWrites && this.options.failWrites.indexOf(name) !== -1) {
      throw storageError('PERMISSION_DENIED', `write denied for ${name}`)
    }
    if (this.options.onWrite) return this.options.onWrite(name, id)
  }

  collection(name) {
    return new StoreView(this, this.data).collection(name)
  }

  async runTransaction(callback) {
    if (this.options.transactionUnavailable) {
      throw storageError('TRANSACTION_UNAVAILABLE', 'transaction service unavailable')
    }
    for (let attempt = 0; attempt < 3; attempt += 1) {
      this.transactionAttempts += 1
      const startVersion = this.version
      const view = new StoreView(this, clone(this.data))
      const result = await callback(view)
      if (startVersion !== this.version) {
        this.transactionConflicts += 1
        continue
      }
      if (this.options.failCommit) {
        throw storageError('TRANSACTION_COMMIT_FAILED', 'transaction commit failed')
      }
      this.data = view.data
      this.adds.push(...view.adds)
      this.updates.push(...view.updates)
      this.version += 1
      return result
    }
    throw storageError('TRANSACTION_CONFLICT', 'transaction conflict retry exhausted')
  }
}

module.exports = {
  TransactionModelDb
}
