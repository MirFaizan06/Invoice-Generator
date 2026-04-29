import QRCode from 'qrcode';

export async function generateQRCode(data: string): Promise<string> {
  return QRCode.toDataURL(data, {
    width: 200,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: { dark: '#000000', light: '#FFFFFF' },
  });
}
