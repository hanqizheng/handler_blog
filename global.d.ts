declare module "*.css";
declare module "qrcode" {
  export interface QRCodeToDataURLOptions {
    width?: number;
    margin?: number;
  }

  export function toDataURL(
    text: string,
    options?: QRCodeToDataURLOptions,
  ): Promise<string>;

  const QRCode: {
    toDataURL: typeof toDataURL;
  };

  export default QRCode;
}

interface Window {
  initAliyunCaptcha?: (options: {
    SceneId: string;
    prefix: string;
    mode: "popup";
    element: string;
    button: string;
    captchaVerifyCallback: (
      captchaVerifyParam: string,
    ) => Promise<{ captchaResult: boolean; bizResult?: boolean }>;
    onBizResultCallback?: () => void;
    getInstance?: (instance: unknown) => void;
    slideStyle?: { width?: number; height?: number };
    language?: "cn" | "tw" | "en";
  }) => void;
}
