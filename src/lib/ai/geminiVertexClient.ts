import "server-only";

import { existsSync, readFileSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { GoogleGenAI, type GenerateContentConfig } from "@google/genai";

if (typeof window !== "undefined") {
  throw new Error("geminiVertexClient must only be imported from server-side code.");
}

const LOCAL_GOOGLE_CREDENTIALS_FILE =
  "gen-lang-client-0447269763-8fc0688f2b27.json";
const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash";
const DEFAULT_VERTEX_LOCATION = "global";

type ServiceAccountCredentials = {
  project_id?: string;
  client_email?: string;
  private_key?: string;
  type?: string;
};

let client: GoogleGenAI | null = null;
let envCredentialsPath: string | undefined;

function normalizePrivateKey(credentials: ServiceAccountCredentials) {
  if (typeof credentials.private_key !== "string") return credentials;

  return {
    ...credentials,
    private_key: credentials.private_key.replace(/\\n/g, "\n"),
  };
}

function parseServiceAccountCredentials(rawCredentials: string) {
  const credentials = normalizePrivateKey(
    JSON.parse(rawCredentials) as ServiceAccountCredentials,
  );

  if (
    credentials.type !== "service_account" ||
    !credentials.project_id?.trim() ||
    !credentials.client_email?.trim() ||
    !credentials.private_key?.trim()
  ) {
    throw new Error("Invalid Google service account credentials.");
  }

  return credentials;
}

function readCredentialsFromEnvironment() {
  const base64Credentials =
    process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64?.trim();

  if (base64Credentials) {
    return parseServiceAccountCredentials(
      Buffer.from(base64Credentials.replace(/\s/g, ""), "base64").toString(
        "utf8",
      ),
    );
  }

  const jsonCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON?.trim();
  if (jsonCredentials) {
    return parseServiceAccountCredentials(jsonCredentials);
  }

  return undefined;
}

function writeEnvironmentCredentialsFile() {
  if (envCredentialsPath && existsSync(envCredentialsPath)) {
    return envCredentialsPath;
  }

  const credentials = readCredentialsFromEnvironment();
  if (!credentials) return undefined;

  envCredentialsPath = path.join(tmpdir(), "zpath-google-credentials.json");
  writeFileSync(envCredentialsPath, JSON.stringify(credentials), {
    encoding: "utf8",
    mode: 0o600,
  });

  return envCredentialsPath;
}

function resolveCredentialsPath() {
  const configuredPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  const localPath = path.join(
    /* turbopackIgnore: true */ process.cwd(),
    LOCAL_GOOGLE_CREDENTIALS_FILE,
  );

  if (configuredPath) {
    const resolvedPath = path.isAbsolute(configuredPath)
      ? configuredPath
      : path.join(/* turbopackIgnore: true */ process.cwd(), configuredPath);

    if (existsSync(resolvedPath)) {
      return resolvedPath;
    }
  }

  const environmentCredentialsPath = writeEnvironmentCredentialsFile();
  if (environmentCredentialsPath) {
    return environmentCredentialsPath;
  }

  return existsSync(localPath) ? localPath : undefined;
}

function ensureGoogleApplicationCredentials() {
  const credentialsPath = resolveCredentialsPath();

  if (credentialsPath) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
  }

  return credentialsPath;
}

function preferVertexServiceAccountCredentials() {
  ensureGoogleApplicationCredentials();
  process.env.GOOGLE_GENAI_USE_VERTEXAI = "true";

  delete process.env.GOOGLE_API_KEY;
  delete process.env.GEMINI_API_KEY;
}

function readProjectIdFromCredentials(credentialsPath: string | undefined) {
  if (!credentialsPath || !existsSync(credentialsPath)) return undefined;

  try {
    const credentials = JSON.parse(
      readFileSync(credentialsPath, "utf8"),
    ) as ServiceAccountCredentials;
    return credentials.project_id?.trim() || undefined;
  } catch {
    return undefined;
  }
}

function getVertexProjectId() {
  const credentialsPath = ensureGoogleApplicationCredentials();
  const projectId =
    process.env.GOOGLE_CLOUD_PROJECT?.trim() ||
    process.env.GCLOUD_PROJECT?.trim() ||
    process.env.VERTEX_AI_PROJECT?.trim() ||
    readProjectIdFromCredentials(credentialsPath);

  if (!projectId) {
    throw new Error(
      "Missing Google Cloud project id for Vertex AI Gemini client.",
    );
  }

  return projectId;
}

function getVertexLocation() {
  return (
    process.env.GOOGLE_CLOUD_LOCATION?.trim() ||
    process.env.VERTEX_AI_LOCATION?.trim() ||
    DEFAULT_VERTEX_LOCATION
  );
}

export function isGeminiVertexConfigured() {
  try {
    return Boolean(getVertexProjectId());
  } catch {
    return false;
  }
}

export function getGeminiModelName() {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
}

export const geminiModelName = getGeminiModelName();

function modelSupportsThinkingConfig(modelName: string) {
  return /\bgemini-(?:2\.5|3(?:\.|-\d))/i.test(modelName);
}

function readResponseText(response: unknown) {
  const record = response as {
    text?: string;
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string;
        }>;
      };
    }>;
  };

  const directText = record.text?.trim();
  if (directText) return directText;

  return (
    record.candidates
      ?.flatMap((candidate) => candidate.content?.parts ?? [])
      .map((part) => part.text?.trim() ?? "")
      .filter(Boolean)
      .join("\n")
      .trim() ?? ""
  );
}

function readFinishReason(response: unknown) {
  const record = response as {
    candidates?: Array<{
      finishReason?: string;
    }>;
  };

  return record.candidates?.[0]?.finishReason;
}

export function getGeminiClient() {
  if (!client) {
    preferVertexServiceAccountCredentials();

    client = new GoogleGenAI({
      vertexai: true,
      project: getVertexProjectId(),
      location: getVertexLocation(),
    });
  }

  return client;
}

export async function generateGeminiText({
  prompt,
  config,
}: {
  prompt: string;
  config?: GenerateContentConfig;
}) {
  const model = getGeminiModelName();
  const requestConfig: GenerateContentConfig = {
    ...config,
    ...(config?.thinkingConfig === undefined && modelSupportsThinkingConfig(model)
      ? { thinkingConfig: { thinkingBudget: 0 } }
      : {}),
  };
  const response = await getGeminiClient().models.generateContent({
    model,
    contents: prompt,
    config: requestConfig,
  });

  const text = readResponseText(response);
  if (!text) {
    const finishReason = readFinishReason(response);
    throw new Error(
      finishReason
        ? `GEMINI_EMPTY_RESPONSE:${finishReason}`
        : "GEMINI_EMPTY_RESPONSE",
    );
  }

  return text;
}
