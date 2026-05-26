import { authApiBaseUrl } from "./constants";
import type { SignupForm } from "./types";

export async function postAuth<TResponse>(
  path: string,
  body: Record<string, unknown>
): Promise<TResponse> {
  const response = await fetch(`${authApiBaseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response));
  }

  return (await response.json()) as TResponse;
}

export function buildRegisterPayload(form: SignupForm) {
  return {
    fullName: form.fullName,
    phoneNumber: form.phoneNumber,
    phoneVerificationToken: form.phoneVerificationToken,
    username: form.username,
    password: form.password,
    role: form.role,
    ...(form.role === "parent"
      ? {
          child: {
            className: form.childClass,
            name: form.childName,
            dateOfBirth: form.childDateOfBirth,
            gender: form.childGender,
            relationshipType: form.relationshipType,
            customRelationshipLabel: form.customRelationshipLabel || undefined
          }
        }
      : {})
  };
}

async function getApiErrorMessage(response: Response) {
  try {
    const payload = (await response.json()) as {
      message?: string | { message?: string; issues?: Array<{ message: string }> };
    };

    if (typeof payload.message === "string") {
      return payload.message;
    }

    if (payload.message?.issues?.[0]?.message) {
      return payload.message.issues[0].message;
    }
  } catch {
    // Fall through to the generic error below.
  }

  return "Request failed. Please try again.";
}
