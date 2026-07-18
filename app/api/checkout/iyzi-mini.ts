import crypto from 'crypto';

interface IyziConfig {
  apiKey: string;
  secretKey: string;
  uri: string;
}

export class IyziMini {
  private config: IyziConfig;

  constructor(config: IyziConfig) {
    this.config = config;
  }

  // İyzico'nun ham nesneleri düz metne (PKI String) dönüştürme algoritması
  private toPKIString(obj: any): string {
    let pki = '';
    
    // 1. Anahtarları alfabetik sıraya göre diziyoruz (İyzico kuralı)
    const sortedKeys = Object.keys(obj).sort();
    
    for (const key of sortedKeys) {
      const val = obj[key];
      if (val === null || val === undefined) continue;
      
      if (Array.isArray(val)) {
        // Sepetteki ürünler (basketItems) gibi diziler için
        pki += key + '=[';
        pki += val.map(item => this.toPKIString(item)).join(', ');
        pki += ']';
      } else if (typeof val === 'object') {
        // Alıcı ve Adres gibi alt nesneler için
        pki += key + '={' + this.toPKIString(val) + '}';
      } else {
        // Standart string/number değerler için
        pki += key + '=' + val + ',';
      }
    }
    
    // En sondaki fazla virgülü temizliyoruz
    if (pki.endsWith(',')) {
      pki = pki.slice(0, -1);
    }
    
    return pki;
  }

  private generateAuthHeader(uri: string, body: any, randomString: string): string {
    // İyzico'nun beklediği ham imza dizesi yapısı
    const pkiString = this.toPKIString(body);
    const payload = this.config.apiKey + randomString + this.config.secretKey + pkiString;
    
    const hash = crypto
      .createHash('sha256')
      .update(payload, 'utf-8')
      .digest('base64');

    return `IYZWS ${this.config.apiKey}:${hash}`;
  }

  async createCheckoutForm(requestBody: any): Promise<any> {
    const uri = '/payment/iyzipay/checkoutform/initialize/auth/ecom';
    const randomString = Date.now().toString();
    const authorization = this.generateAuthHeader(uri, requestBody, randomString);

    const response = await fetch(`${this.config.uri}${uri}`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json; charset=utf-8',
        'x-iyzi-rnd': randomString,
        'Authorization': authorization
      },
      body: JSON.stringify(requestBody)
    });

    return response.json();
  }
}