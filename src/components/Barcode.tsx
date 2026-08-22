// 真实条码/二维码渲染组件（纯前端本地生成，不传任何外部服务）
import { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';

interface BarcodeProps {
  value: string;
  width?: number;   // px
  height?: number; // px
  scale?: number;
}

// 真实一维条码（CODE128，支持数字/字母/常用符号）
export function BarcodeView({ value, width = 200, height = 60, scale = 1 }: BarcodeProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!svgRef.current) return;
    try {
      setError(false);
      JsBarcode(svgRef.current, value || '123456789', {
        format: 'CODE128',
        width: 1.4 * scale,
        height: height * 0.78,
        displayValue: true,
        fontSize: 9 * scale,
        margin: 2,
        lineColor: '#000',
        background: 'transparent',
      });
    } catch {
      setError(true);
    }
  }, [value, height, scale]);

  if (error || !value) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c9cdd4', fontSize: 10 }}>
        {value ? '条码生成失败' : '无数据'}
      </div>
    );
  }
  return <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />;
}

interface QrcodeProps {
  value: string;
  size?: number; // px
}

// 真实二维码（本地生成 dataURL）
export function QrcodeView({ value, size = 120 }: QrcodeProps) {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!value) { setDataUrl(''); setError(false); return; }
    QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#ffffff' },
    })
      .then((url) => { setDataUrl(url); setError(false); })
      .catch(() => setError(true));
  }, [value, size]);

  if (error) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c9cdd4', fontSize: 10 }}>
        二维码生成失败
      </div>
    );
  }
  if (!value) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c9cdd4', fontSize: 10 }}>
        无数据
      </div>
    );
  }
  return <img src={dataUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />;
}
