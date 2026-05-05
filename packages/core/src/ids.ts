import { randomBytes } from 'crypto'

function base62(buf: Buffer): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
  let n = BigInt('0x' + buf.toString('hex'))
  let result = ''
  while (n > 0n) {
    result = (chars[Number(n % 62n)] ?? '') + result
    n = n / 62n
  }
  return result.padStart(8, '0')
}

export function generateId(prefix: string): string {
  const buf = randomBytes(6)
  return `${prefix}_${base62(buf)}`
}

export const newItemId = () => generateId('itm')
export const newProjectId = () => generateId('prj')
export const newAreaId = () => generateId('are')
export const newEventId = () => generateId('evt')
export const newAuditId = () => generateId('aud')
export const newChangeId = () => generateId('chg')
export const newVersionId = () => generateId('ver')
