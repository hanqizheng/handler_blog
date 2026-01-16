import CaptchaClient, { VerifyCaptchaRequest } from "@alicloud/captcha20230305";
import * as Util from "@alicloud/tea-util";

const DEFAULT_ENDPOINT = "captcha.aliyuncs.com";
const DEFAULT_REGION = "cn-hangzhou";

const getCaptchaConfig = () => {
  const accessKeyId = process.env.ALIYUN_CAPTCHA_ACCESS_KEY_ID?.trim();
  const accessKeySecret = process.env.ALIYUN_CAPTCHA_ACCESS_KEY_SECRET?.trim();
  const sceneId =
    process.env.ALIYUN_CAPTCHA_SCENE_ID?.trim() ??
    process.env.NEXT_PUBLIC_ALIYUN_CAPTCHA_SCENE_ID?.trim();
  const endpoint =
    process.env.ALIYUN_CAPTCHA_ENDPOINT?.trim() ?? DEFAULT_ENDPOINT;
  const regionId =
    process.env.ALIYUN_CAPTCHA_REGION_ID?.trim() ?? DEFAULT_REGION;

  if (!accessKeyId || !accessKeySecret || !sceneId) {
    throw new Error("Aliyun Captcha 未配置");
  }

  return { accessKeyId, accessKeySecret, sceneId, endpoint, regionId };
};

let cachedClient: CaptchaClient | null = null;

const getClient = () => {
  if (cachedClient) {
    return cachedClient;
  }
  const { accessKeyId, accessKeySecret, endpoint, regionId } =
    getCaptchaConfig();
  const config = {
    accessKeyId,
    accessKeySecret,
    endpoint,
    regionId,
    type: "access_key",
  } as ConstructorParameters<typeof CaptchaClient>[0];
  cachedClient = new CaptchaClient(config);
  return cachedClient;
};

const resolveSuccess = (payload: unknown) => {
  if (!payload || typeof payload !== "object") {
    return false;
  }
  const body = (payload as { body?: unknown }).body ?? payload;
  if (!body || typeof body !== "object") {
    return false;
  }
  const record = body as Record<string, unknown>;
  const candidates = [
    record.success,
    record.result,
    record.verifyResult,
    (record.data as { success?: unknown } | undefined)?.success,
    (record.data as { result?: unknown } | undefined)?.result,
  ];
  return candidates.some((value) => value === true);
};

export async function verifyAliyunCaptcha(captchaVerifyParam: string) {
  const { sceneId } = getCaptchaConfig();
  const request = new VerifyCaptchaRequest({
    sceneId,
    captchaVerifyParam,
  });
  const runtime = new Util.RuntimeOptions({});
  const response = await getClient().verifyCaptchaWithOptions(request, runtime);
  return resolveSuccess(response);
}
