import { S3Client } from "@aws-sdk/client-s3";
import { getEnv } from "@/lib/env";

let client: S3Client | null | undefined;

export function getR2Client(): S3Client | null {
  if (client !== undefined) return client;
  const accountId = getEnv("R2_ACCOUNT_ID");
  const accessKeyId = getEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = getEnv("R2_SECRET_ACCESS_KEY");
  if (!accountId || !accessKeyId || !secretAccessKey) return (client = null);
  client = new S3Client({
    region: "auto",
    endpoint: getEnv("R2_ENDPOINT") ?? `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return client;
}

export function getR2Bucket(): string | null {
  return getEnv("R2_BUCKET_NAME") ?? null;
}