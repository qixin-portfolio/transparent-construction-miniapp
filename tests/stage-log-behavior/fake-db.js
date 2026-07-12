function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function createCommand() {
  return {
    in: (values) => ({ __op: 'in', values }),
    gte: (value) => ({ __op: 'gte', value }),
    push: (value) => ({ __op: 'push', value })
  }
}

function matchesWhere(doc, where) {
  return Object.entries(where || {}).every(([key, expected]) => {
    const actual = doc[key]
    if (expected && expected.__op === 'in') return expected.values.indexOf(actual) !== -1
    if (expected && expected.__op === 'gte') return actual >= expected.value
    return actual === expected
  })
}

function applyUpdate(doc, data) {
  Object.entries(data || {}).forEach(([key, value]) => {
    if (value && value.__op === 'push') {
      const current = Array.isArray(doc[key]) ? doc[key] : []
      doc[key] = current.concat([clone(value.value)])
      return
    }
    doc[key] = clone(value)
  })
}

class FakeDocRef {
  constructor(db, name, id) {
    this.db = db
    this.name = name
    this.id = id
  }

  async get() {
    return { data: clone(this.db.data[this.name][this.id] || null) }
  }

  async update({ data }) {
    const doc = this.db.data[this.name][this.id]
    if (!doc) throw new Error(`${this.name}/${this.id} 不存在`)
    applyUpdate(doc, data)
    this.db.updates.push({ collection: this.name, id: this.id, data: clone(data) })
    return { stats: { updated: 1 } }
  }
}

class FakeQuery {
  constructor(db, name, where) {
    this.db = db
    this.name = name
    this.where = where || {}
  }

  async update({ data }) {
    let updated = 0
    Object.entries(this.db.data[this.name]).forEach(([id, doc]) => {
      if (!matchesWhere(doc, this.where)) return
      applyUpdate(doc, data)
      this.db.updates.push({ collection: this.name, id, data: clone(data) })
      updated += 1
    })
    return { stats: { updated } }
  }
}

class FakeCollection {
  constructor(db, name) {
    this.db = db
    this.name = name
    if (!this.db.data[this.name]) this.db.data[this.name] = {}
  }

  doc(id) {
    return new FakeDocRef(this.db, this.name, id)
  }

  where(where) {
    return new FakeQuery(this.db, this.name, where)
  }

  async add({ data }) {
    const id = `${this.name}_${++this.db.nextId}`
    this.db.data[this.name][id] = Object.assign({ _id: id }, clone(data))
    this.db.adds.push({ collection: this.name, id, data: clone(data) })
    return { _id: id }
  }
}

class FakeDb {
  constructor(seed = {}) {
    this.data = clone(seed)
    this.nextId = 0
    this.adds = []
    this.updates = []
    this.transactionLock = Promise.resolve()
    ;['projects', 'stage_logs', 'photos'].forEach((name) => {
      if (!this.data[name]) this.data[name] = {}
    })
  }

  collection(name) {
    return new FakeCollection(this, name)
  }

  async runTransaction(callback) {
    const previous = this.transactionLock
    let release
    this.transactionLock = new Promise((resolve) => {
      release = resolve
    })
    await previous
    try {
      return await callback(this)
    } finally {
      release()
    }
  }
}

module.exports = {
  FakeDb,
  createCommand,
  clone
}
