import { Injectable, InternalServerErrorException } from "@nestjs/common";

type EskizLoginResponse = {
  data?: {
    token?: string;
  };
  message?: string;
};

const defaultEskizBaseUrl = "https://notify.eskiz.uz/api";

@Injectable()
export class EskizSmsService {
  private token?: string;

  async sendVerificationCode(phoneNumber: string, code: string) {
    return this.sendMessage(phoneNumber, createVerificationMessage(code));
  }

  async sendMessage(phoneNumber: string, message: string) {
    if (!this.hasCredentials()) {
      if (process.env.NODE_ENV === "production") {
        throw new InternalServerErrorException(
          "Eskiz SMS credentials are not configured.",
        );
      }

      return {
        provider: "development",
        sent: false,
      };
    }

    await this.sendSms(phoneNumber, message);

    return {
      provider: "eskiz",
      sent: true,
    };
  }

  private async sendSms(phoneNumber: string, message: string) {
    const token = await this.getToken();
    const response = await this.requestSms(token, phoneNumber, message);

    if (response.status === 401) {
      this.token = undefined;
      const refreshedToken = await this.getToken();
      const retryResponse = await this.requestSms(
        refreshedToken,
        phoneNumber,
        message,
      );

      if (!retryResponse.ok) {
        throw await createEskizError(retryResponse);
      }

      return;
    }

    if (!response.ok) {
      throw await createEskizError(response);
    }
  }

  private async requestSms(
    token: string,
    phoneNumber: string,
    message: string,
  ) {
    const formData = new URLSearchParams({
      mobile_phone: toEskizPhoneNumber(phoneNumber),
      message,
      from: process.env.ESKIZ_FROM ?? "4546",
    });

    return fetch(`${this.baseUrl}/message/sms/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData,
    });
  }

  private async getToken() {
    if (this.token) {
      return this.token;
    }

    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: process.env.ESKIZ_EMAIL,
        password: process.env.ESKIZ_PASSWORD,
      }),
    });

    if (!response.ok) {
      throw await createEskizError(response);
    }

    const payload = (await response.json()) as EskizLoginResponse;
    const token = payload.data?.token;

    if (!token) {
      throw new InternalServerErrorException("Eskiz did not return a token.");
    }

    this.token = token;
    return token;
  }

  private get baseUrl() {
    return process.env.ESKIZ_BASE_URL ?? defaultEskizBaseUrl;
  }

  private hasCredentials() {
    return Boolean(process.env.ESKIZ_EMAIL && process.env.ESKIZ_PASSWORD);
  }
}

function createVerificationMessage(code: string) {
  return `Kichkintoy tasdiqlash kodi: ${code}. Kodni hech kimga bermang.`;
}

function toEskizPhoneNumber(phoneNumber: string) {
  return phoneNumber.replace(/\D/g, "");
}

async function createEskizError(response: Response) {
  const body = await response.text();

  return new InternalServerErrorException({
    message: "Eskiz SMS request failed.",
    statusCode: response.status,
    body,
  });
}
