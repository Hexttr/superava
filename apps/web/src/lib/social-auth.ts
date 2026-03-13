import type { LinkedAuthProvider, SocialAuthProvider } from "@superava/shared";

export const socialProviderOrder: SocialAuthProvider[] = [
  "YANDEX",
  "VK",
  "TELEGRAM",
];

export function socialProviderSlug(provider: SocialAuthProvider) {
  return provider.toLowerCase();
}

export function socialProviderLabel(provider: SocialAuthProvider) {
  switch (provider) {
    case "YANDEX":
      return "Yandex";
    case "VK":
      return "VK";
    case "TELEGRAM":
      return "Telegram";
    case "MAILRU":
      return "Mail.ru";
    case "OK":
      return "Одноклассники";
  }
}

export function authProviderMessage(
  error: string,
  provider?: string | null,
  email?: string | null
) {
  const providerLabel =
    provider &&
    socialProviderOrder.includes(provider.toUpperCase() as SocialAuthProvider)
      ? socialProviderLabel(provider.toUpperCase() as SocialAuthProvider)
      : "соцсеть";

  switch (error) {
    case "social_provider_not_configured":
      return `${providerLabel} пока не настроен.`;
    case "social_email_conflict":
      return email
        ? `Email ${email} уже используется. Войдите в существующий аккаунт и привяжите ${providerLabel} в настройках.`
        : `Этот email уже используется. Войдите в существующий аккаунт и привяжите ${providerLabel} в настройках.`;
    case "social_state_invalid":
      return "Сессия авторизации устарела. Запустите вход через соцсеть еще раз.";
    case "social_code_missing":
      return "Провайдер не вернул код авторизации. Попробуйте еще раз.";
    case "social_login_cancelled":
      return `Вход через ${providerLabel} был отменен.`;
    case "provider_already_linked":
      return `${providerLabel} уже привязан к другому аккаунту.`;
    case "provider_already_connected":
      return `${providerLabel} уже подключен к вашему аккаунту.`;
    case "provider_not_linked":
      return `${providerLabel} не подключен к аккаунту.`;
    case "last_auth_method":
      return "Нельзя отключить последний способ входа, пока у аккаунта нет пароля.";
    case "login_required":
      return "Сначала войдите в аккаунт, чтобы привязать соцсеть.";
    case "telegram_auth_invalid":
      return "Telegram не подтвердил данные входа. Попробуйте еще раз.";
    case "account_blocked":
      return "Аккаунт заблокирован. Обратитесь к администратору.";
    case "social_auth_failed":
      return `Не удалось завершить вход через ${providerLabel}. Попробуйте еще раз.`;
    default:
      return error || "Произошла ошибка. Попробуйте еще раз.";
  }
}

export function findLinkedProvider(
  items: LinkedAuthProvider[],
  provider: SocialAuthProvider
) {
  return items.find((item) => item.provider === provider) ?? null;
}
