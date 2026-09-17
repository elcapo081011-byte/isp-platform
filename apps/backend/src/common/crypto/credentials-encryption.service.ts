import { Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

/**
 * Encripta/desencripta credenciales sensibles (contraseñas de MikroTik, OLT,
 * SNMP community strings) antes de guardarlas en BD. La clave maestra viene
 * de la variable de entorno DEVICE_CREDENTIALS_ENCRYPTION_KEY (punto 28).
 */
@Injectable()
export class CredentialsEncryptionService {
  private key: Buffer;

  constructor() {
    const secret = process.env.DEVICE_CREDENTIALS_ENCRYPTION_KEY ?? 'dev-only-insecure-key-change-me';
    this.key = scryptSync(secret, 'isp-platform-salt', 32);
  }

  encrypt(plainText: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return [iv.toString('hex'), authTag.toString('hex'), encrypted.toString('hex')].join(':');
  }

  decrypt(encryptedText: string): string {
    const [ivHex, authTagHex, dataHex] = encryptedText.split(':');
    const decipher = createDecipheriv(ALGORITHM, this.key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]);
    return decrypted.toString('utf8');
  }
}
