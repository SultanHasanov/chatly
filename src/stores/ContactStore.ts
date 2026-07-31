import { makeAutoObservable } from 'mobx'
import { CONTACTS } from '../data/mock'
import type { Contact } from '../types'

/** Выбор участников для новой группы (экран 5 прототипа). */
export class ContactStore {
  contacts: Contact[] = CONTACTS
  selectedIds: string[] = []
  query = ''

  constructor() {
    makeAutoObservable(this)
  }

  get filtered(): Contact[] {
    const q = this.query.trim().toLowerCase()
    if (!q) return this.contacts
    return this.contacts.filter((c) => c.name.toLowerCase().includes(q))
  }

  get selected(): Contact[] {
    return this.selectedIds
      .map((id) => this.contacts.find((c) => c.id === id))
      .filter((c): c is Contact => Boolean(c))
  }

  isSelected(id: string): boolean {
    return this.selectedIds.includes(id)
  }

  toggle(id: string) {
    this.selectedIds = this.isSelected(id)
      ? this.selectedIds.filter((x) => x !== id)
      : [...this.selectedIds, id]
  }

  setQuery(q: string) {
    this.query = q
  }

  reset() {
    this.selectedIds = []
    this.query = ''
  }
}
