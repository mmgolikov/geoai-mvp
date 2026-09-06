"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { usePointObjectLocale } from "@/components/point-to-object/locale-provider";
import {
  getDefaultRoleForAudience,
  getExploreRolesByAudience
} from "@/src/lib/explore/scenarios";
import type { ExploreAudience, ExploreRole } from "@/src/lib/explore/types";
import { maxProfileAvatarBytes } from "@/src/lib/auth/profile-local-store";
import type { PointObjectLocale } from "@/src/lib/prototype/point-to-object-markets";

type Notice = {
  kind: "success" | "error";
  text: string;
};

const PROFILE_COPY = {
  en: {
    accountEyebrow: "GeoAI account",
    signInTitle: "Sign in to open your profile",
    signInBody: "Your personal details and B2B/B2C working defaults are available after sign-in.",
    signIn: "Sign in",
    eyebrow: "Personal account",
    title: "Your profile",
    intro: "Manage your personal details and the working defaults GeoAI uses when a product workspace opens.",
    openPrototype: "Open map",
    signOut: "Sign out",
    personalDetails: "Personal details",
    personalDetailsBody: "Add the name and photo shown across GeoAI.",
    choosePhoto: "Choose photo",
    removePhoto: "Remove photo",
    profileImageAlt: "Profile",
    fullName: "Full name",
    fullNamePlaceholder: "First and last name",
    region: "Region",
    contactPhone: "Contact phone",
    defaultWorkspace: "Default workspace",
    defaultWorkspaceBody: "Audience and role set the initial product context. They are preferences, not permissions.",
    defaultAudience: "Default audience",
    defaultRole: "Default role",
    role: "Role",
    saveProfile: "Save profile",
    saving: "Saving…",
    profileSaved: "Profile saved. Your working defaults are ready.",
    demoProfileSaved: "Demo profile saved for this browser session.",
    profileSaveError: "The profile could not be saved. Check the fields and try again.",
    accountSecurity: "Account & security",
    signInDetails: "Sign-in details",
    registeredEmail: "Registered email",
    verifiedPhone: "Verified sign-in phone",
    notAdded: "Not added",
    demoNotice: "Demo access is browser-local and does not authorize protected server resources.",
    changeEmail: "Change email",
    sendConfirmation: "Send confirmation",
    sending: "Sending…",
    emailSent: "Confirmation sent. Check your email.",
    emailError: "The email change could not be started. Check the address and try again.",
    changePassword: "Change password",
    passwordPlaceholder: "At least 8 characters",
    confirmPasswordPlaceholder: "Repeat new password",
    newPassword: "New password",
    confirmPassword: "Confirm new password",
    changing: "Changing…",
    passwordChanged: "Password changed.",
    passwordError: "The password could not be changed. Sign in again and retry.",
    passwordMismatch: "The password confirmation does not match.",
    phonePhoto: "Phone and photo",
    phoneNote: "The contact phone is used for project communication and can be edited independently.",
    storageNote: "Changing the sign-in phone requires verification. The profile photo remains on this device until protected storage is enabled.",
    mfaNote: "Two-factor authentication is not part of the current MVP flow.",
    avatarError: "Choose a JPEG, PNG or WebP photo up to 1 MB.",
    avatarReadError: "The browser could not read this photo."
  },
  ru: {
    accountEyebrow: "Аккаунт GeoAI",
    signInTitle: "Войдите, чтобы открыть профиль",
    signInBody: "После входа доступны личные данные и рабочие настройки B2B/B2C.",
    signIn: "Войти",
    eyebrow: "Личный аккаунт",
    title: "Ваш профиль",
    intro: "Управляйте личными данными и рабочими настройками, с которыми GeoAI открывает продукт.",
    openPrototype: "Открыть карту",
    signOut: "Выйти",
    personalDetails: "Личные данные",
    personalDetailsBody: "Добавьте имя и фотографию, которые будут показаны в GeoAI.",
    choosePhoto: "Выбрать фото",
    removePhoto: "Удалить фото",
    profileImageAlt: "Профиль",
    fullName: "Полное имя",
    fullNamePlaceholder: "Имя и фамилия",
    region: "Регион",
    contactPhone: "Контактный телефон",
    defaultWorkspace: "Рабочие настройки",
    defaultWorkspaceBody: "Аудитория и роль задают начальный контекст продукта. Это настройки, а не права доступа.",
    defaultAudience: "Аудитория по умолчанию",
    defaultRole: "Роль по умолчанию",
    role: "Роль",
    saveProfile: "Сохранить профиль",
    saving: "Сохраняем…",
    profileSaved: "Профиль сохранён. Рабочие настройки готовы.",
    demoProfileSaved: "Демо-профиль сохранён для этой браузерной сессии.",
    profileSaveError: "Не удалось сохранить профиль. Проверьте поля и повторите попытку.",
    accountSecurity: "Аккаунт и безопасность",
    signInDetails: "Данные для входа",
    registeredEmail: "Зарегистрированный email",
    verifiedPhone: "Подтверждённый телефон для входа",
    notAdded: "Не добавлен",
    demoNotice: "Демо-доступ хранится в браузере и не даёт доступа к защищённым серверным ресурсам.",
    changeEmail: "Изменить email",
    sendConfirmation: "Отправить подтверждение",
    sending: "Отправляем…",
    emailSent: "Подтверждение отправлено. Проверьте почту.",
    emailError: "Не удалось начать смену email. Проверьте адрес и повторите попытку.",
    changePassword: "Изменить пароль",
    passwordPlaceholder: "Не менее 8 символов",
    confirmPasswordPlaceholder: "Повторите новый пароль",
    newPassword: "Новый пароль",
    confirmPassword: "Подтверждение нового пароля",
    changing: "Изменяем…",
    passwordChanged: "Пароль изменён.",
    passwordError: "Не удалось изменить пароль. Войдите заново и повторите попытку.",
    passwordMismatch: "Пароли не совпадают.",
    phonePhoto: "Телефон и фотография",
    phoneNote: "Контактный телефон используется для коммуникации по проектам и редактируется отдельно.",
    storageNote: "Для изменения телефона входа требуется подтверждение. Фотография остаётся на этом устройстве до подключения защищённого хранилища.",
    mfaNote: "Двухфакторная аутентификация не входит в текущий MVP.",
    avatarError: "Выберите JPEG, PNG или WebP размером до 1 МБ.",
    avatarReadError: "Браузер не смог прочитать фотографию."
  }
} as const;

const ROLE_COPY: Record<PointObjectLocale, Record<ExploreRole, { label: string; description: string }>> = {
  en: {
    tourist: { label: "Tourist", description: "Places, routes and short-stay context." },
    resident_expat: { label: "Resident / expat", description: "Lifestyle, access and neighborhood screening." },
    home_buyer: { label: "Home buyer", description: "Residential fit and amenity due diligence." },
    renter: { label: "Renter", description: "Commute, services and area-context checks." },
    investor_buyer: { label: "Investor buyer", description: "Demand-driver and investment-context screening." },
    family_relocation: { label: "Family relocation", description: "Family access, services and lifestyle context." },
    developer: { label: "Developer", description: "Early development screening and pipeline strategy." },
    real_estate_fund: { label: "Real estate fund", description: "Shortlisting, portfolio logic and evidence gaps." },
    bank_lender: { label: "Bank / lender", description: "Collateral context and credit-review evidence needs." },
    insurer: { label: "Insurer", description: "Risk exposure, resilience and validation workstreams." },
    government_urban_authority: { label: "Urban authority", description: "Planning-support hypotheses and source readiness." },
    infrastructure_operator: { label: "Infrastructure operator", description: "Corridor, service-area and dependency screening." },
    consultant_broker: { label: "Consultant / broker", description: "Client shortlists and due diligence prompts." },
    family_office: { label: "Family office", description: "Private-capital opportunity and risk screening." },
    asset_manager: { label: "Asset manager", description: "Portfolio action priorities and local comparison." }
  },
  ru: {
    tourist: { label: "Турист", description: "Места, маршруты и контекст для коротких поездок." },
    resident_expat: { label: "Резидент / экспат", description: "Образ жизни, доступность и анализ района." },
    home_buyer: { label: "Покупатель жилья", description: "Соответствие жилья потребностям и проверка инфраструктуры." },
    renter: { label: "Арендатор", description: "Дорога, сервисы и практический контекст района." },
    investor_buyer: { label: "Частный инвестор", description: "Факторы спроса и инвестиционный контекст." },
    family_relocation: { label: "Переезд семьи", description: "Доступность, сервисы и семейный контекст." },
    developer: { label: "Девелопер", description: "Первичный анализ площадок и развитие пайплайна." },
    real_estate_fund: { label: "Фонд недвижимости", description: "Короткий список, портфельная логика и пробелы данных." },
    bank_lender: { label: "Банк / кредитор", description: "Контекст залога и данные для кредитного анализа." },
    insurer: { label: "Страховщик", description: "Риски, устойчивость и план проверки данных." },
    government_urban_authority: { label: "Городской орган", description: "Гипотезы планирования и готовность источников." },
    infrastructure_operator: { label: "Оператор инфраструктуры", description: "Коридоры, зоны обслуживания и зависимости." },
    consultant_broker: { label: "Консультант / брокер", description: "Клиентские подборки и план комплексной проверки." },
    family_office: { label: "Family office", description: "Возможности частного капитала и анализ рисков." },
    asset_manager: { label: "Управляющий активами", description: "Приоритеты портфеля и сравнение локаций." }
  }
};

function messageClassName(kind: Notice["kind"]) {
  return kind === "success"
    ? "border-[#91d4d9] bg-[#e8fafa] text-[#05636e]"
    : "border-[#edc9c4] bg-[#fff6f4] text-[#9a3f34]";
}

function initials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase()).join("") || "G";
}

export function ProfilePanel() {
  const { locale } = usePointObjectLocale();
  const copy = PROFILE_COPY[locale];
  const localizedRoles = ROLE_COPY[locale];
  const {
    isAuthenticated,
    isDemo,
    user,
    saveProfile,
    requestEmailChange,
    changePassword,
    signOut
  } = useAuth();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const activeUserIdRef = useRef<string | null>(null);
  const loadedProfileSignatureRef = useRef("");
  const [fullName, setFullName] = useState("");
  const [region, setRegion] = useState("Dubai / UAE");
  const [defaultAudience, setDefaultAudience] = useState<ExploreAudience>("b2b");
  const [defaultRole, setDefaultRole] = useState<ExploreRole>("developer");
  const [contactPhone, setContactPhone] = useState("");
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileNotice, setProfileNotice] = useState<Notice | null>(null);
  const [accountNotice, setAccountNotice] = useState<Notice | null>(null);
  const [pendingAction, setPendingAction] = useState<"profile" | "email" | "password" | null>(null);
  const availableRoles = getExploreRolesByAudience(defaultAudience);

  useEffect(() => {
    activeUserIdRef.current = user?.id ?? null;
    if (!user) {
      loadedProfileSignatureRef.current = "";
      return;
    }
    const profileSignature = JSON.stringify([
      user.id,
      user.profile.fullName,
      user.profile.region,
      user.profile.defaultAudience,
      user.profile.defaultRole,
      user.profile.contactPhone,
      user.profile.avatarUrl
    ]);
    if (loadedProfileSignatureRef.current === profileSignature) return;
    loadedProfileSignatureRef.current = profileSignature;
    setFullName(user.profile.fullName);
    setRegion(user.profile.region);
    setDefaultAudience(user.profile.defaultAudience);
    setDefaultRole(user.profile.defaultRole);
    setContactPhone(user.profile.contactPhone);
    setAvatarDataUrl(user.profile.avatarUrl?.startsWith("data:image/") ? user.profile.avatarUrl : null);
    setAvatarRemoved(false);
    setNewEmail("");
    setNewPassword("");
    setConfirmPassword("");
    setProfileNotice(null);
    setAccountNotice(null);
  }, [user]);

  function changeAudience(audience: ExploreAudience) {
    setDefaultAudience(audience);
    setDefaultRole(getDefaultRoleForAudience(audience));
  }

  function handleAvatarFile(file: File | null) {
    setProfileNotice(null);
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > maxProfileAvatarBytes) {
      setProfileNotice({ kind: "error", text: copy.avatarError });
      return;
    }
    const userId = activeUserIdRef.current;
    const reader = new FileReader();
    reader.onload = () => {
      if (activeUserIdRef.current === userId && typeof reader.result === "string") {
        setAvatarDataUrl(reader.result);
        setAvatarRemoved(false);
      }
    };
    reader.onerror = () => setProfileNotice({ kind: "error", text: copy.avatarReadError });
    reader.readAsDataURL(file);
  }

  async function handleProfileSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPendingAction("profile");
    setProfileNotice(null);
    try {
      const result = await saveProfile({
        fullName,
        region,
        defaultAudience,
        defaultRole,
        contactPhone,
        avatarDataUrl: avatarRemoved ? null : avatarDataUrl
      });
      setProfileNotice({
        kind: result.ok ? "success" : "error",
        text: result.ok ? (isDemo ? copy.demoProfileSaved : copy.profileSaved) : copy.profileSaveError
      });
    } finally {
      setPendingAction(null);
    }
  }

  async function handleEmailChange(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPendingAction("email");
    setAccountNotice(null);
    try {
      const result = await requestEmailChange(newEmail);
      setAccountNotice({ kind: result.ok ? "success" : "error", text: result.ok ? copy.emailSent : copy.emailError });
      if (result.ok) setNewEmail("");
    } finally {
      setPendingAction(null);
    }
  }

  async function handlePasswordChange(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAccountNotice(null);
    if (newPassword !== confirmPassword) {
      setAccountNotice({ kind: "error", text: copy.passwordMismatch });
      return;
    }
    setPendingAction("password");
    try {
      const result = await changePassword(newPassword);
      setAccountNotice({ kind: result.ok ? "success" : "error", text: result.ok ? copy.passwordChanged : copy.passwordError });
      if (result.ok) {
        setNewPassword("");
        setConfirmPassword("");
      }
    } finally {
      setPendingAction(null);
    }
  }

  if (!isAuthenticated || !user) {
    return (
      <section className="mx-auto grid min-h-[calc(100vh-64px)] max-w-3xl place-items-center px-4 py-10">
        <div className="w-full rounded-[28px] border border-line bg-white p-7 text-center shadow-soft sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#087f8c]">{copy.accountEyebrow}</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.025em] text-ink">{copy.signInTitle}</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted">{copy.signInBody}</p>
          <Link href="/login?next=/profile" className="mt-6 inline-flex h-12 items-center justify-center rounded-control bg-[#087f8c] px-5 text-sm font-semibold text-white transition hover:bg-[#006c78] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c] focus-visible:ring-offset-2">
            {copy.signIn}
          </Link>
        </div>
      </section>
    );
  }

  const visibleAvatar = avatarRemoved ? null : avatarDataUrl ?? user.profile.avatarUrl;

  return (
    <section className="bg-gradient-to-br from-white via-[#f8fbfa] to-[#e9f5f1] px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-[1320px]">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#087f8c]">{copy.eyebrow}</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.035em] text-ink sm:text-[46px]">{copy.title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{copy.intro}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/prototype/point-to-object" className="inline-flex h-12 items-center justify-center rounded-control bg-[#087f8c] px-5 text-sm font-semibold text-white transition hover:bg-[#006c78] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c] focus-visible:ring-offset-2">
              {copy.openPrototype}
            </Link>
            <button type="button" onClick={() => void signOut()} className="inline-flex h-12 items-center justify-center rounded-control border border-line bg-white px-5 text-sm font-semibold text-ink transition hover:border-[#087f8c] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c]">
              {copy.signOut}
            </button>
          </div>
        </div>

        <div className="mt-7 grid gap-5 lg:grid-cols-[1.35fr_0.85fr]">
          <form onSubmit={handleProfileSave} className="overflow-hidden rounded-[26px] border border-line bg-white p-5 shadow-soft sm:p-7 lg:p-9">
            <div className="flex flex-col gap-5 border-b border-line pb-6 sm:flex-row sm:items-center">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[24px] border border-[#87c9bd] bg-[#e9f7f3] text-2xl font-bold text-[#087f70]">
                {visibleAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={visibleAvatar} alt={copy.profileImageAlt} className="h-full w-full object-cover" />
                ) : initials(fullName)}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-2xl font-semibold text-ink">{copy.personalDetails}</h2>
                <p className="mt-1 text-sm leading-6 text-muted">{copy.personalDetailsBody}</p>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden="true"
                  onChange={(event) => {
                    handleAvatarFile(event.target.files?.[0] ?? null);
                    event.currentTarget.value = "";
                  }}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => avatarInputRef.current?.click()} className="inline-flex h-9 items-center rounded-[11px] border border-line bg-white px-4 text-xs font-semibold text-ink transition hover:border-[#087f8c] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c]">
                    {copy.choosePhoto}
                  </button>
                  {avatarDataUrl || user.profile.avatarUrl?.startsWith("data:image/") ? (
                    <button type="button" onClick={() => {
                      setAvatarDataUrl(null);
                      setAvatarRemoved(true);
                    }} className="inline-flex h-9 items-center rounded-[11px] px-4 text-xs font-semibold text-muted transition hover:bg-surface hover:text-ink">
                      {copy.removePhoto}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <label className="grid gap-2 sm:col-span-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">{copy.fullName}</span>
                <input required maxLength={160} autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} className="h-[52px] rounded-[10px] border border-line bg-white px-4 text-sm text-ink outline-none transition focus:border-[#087f8c] focus:ring-2 focus:ring-[#bfe4e2]" placeholder={copy.fullNamePlaceholder} />
              </label>
              <label className="grid gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">{copy.region}</span>
                <input required maxLength={120} value={region} onChange={(event) => setRegion(event.target.value)} className="h-[52px] rounded-[10px] border border-line bg-white px-4 text-sm text-ink outline-none transition focus:border-[#087f8c] focus:ring-2 focus:ring-[#bfe4e2]" placeholder="Dubai / UAE" />
              </label>
              <label className="grid gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">{copy.contactPhone}</span>
                <input type="tel" autoComplete="tel" value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} className="h-[52px] rounded-[10px] border border-line bg-white px-4 text-sm text-ink outline-none transition focus:border-[#087f8c] focus:ring-2 focus:ring-[#bfe4e2]" placeholder="+971501234567" />
              </label>
            </div>

            <fieldset className="mt-6 rounded-[18px] border border-[#cfe0da] bg-[#f4faf7] p-4 sm:p-[18px]">
              <legend className="px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#087f70]">{copy.defaultWorkspace}</legend>
              <p className="mt-1 text-sm leading-6 text-muted">{copy.defaultWorkspaceBody}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1.05fr]">
                <div className="grid h-12 grid-cols-2 gap-1 rounded-xl bg-[#e7f2ef] p-1" role="group" aria-label={copy.defaultAudience}>
                  {(["b2b", "b2c"] as ExploreAudience[]).map((audience) => (
                    <button
                      key={audience}
                      type="button"
                      aria-pressed={defaultAudience === audience}
                      onClick={() => changeAudience(audience)}
                      className={`rounded-[10px] text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c] ${defaultAudience === audience ? "bg-[#087f8c] text-white shadow-sm" : "text-[#47655f] hover:bg-white"}`}
                    >
                      {audience.toUpperCase()}
                    </button>
                  ))}
                </div>
                <label className="grid gap-2">
                  <span className="sr-only">{copy.defaultRole}</span>
                  <select value={defaultRole} onChange={(event) => setDefaultRole(event.target.value as ExploreRole)} className="h-12 rounded-[10px] border border-line bg-white px-4 text-sm font-semibold text-ink outline-none transition focus:border-[#087f8c] focus:ring-2 focus:ring-[#bfe4e2]">
                    {availableRoles.map((role) => <option key={role.id} value={role.id}>{localizedRoles[role.id].label}</option>)}
                  </select>
                </label>
              </div>
              <div className="mt-3 grid min-h-[50px] grid-cols-[48px_1fr] items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-inset ring-[#d8e8e3]">
                <span className="text-[10px] font-semibold uppercase text-[#087f70]">{copy.role}</span>
                <p className="text-xs leading-5 text-ink">{localizedRoles[defaultRole].description}</p>
              </div>
            </fieldset>

            {profileNotice ? <p aria-live="polite" className={`mt-5 rounded-[14px] border px-4 py-3 text-sm leading-6 ${messageClassName(profileNotice.kind)}`}>{profileNotice.text}</p> : null}

            <button disabled={pendingAction !== null} className="mt-6 h-12 w-full rounded-control bg-[#087f8c] px-5 text-sm font-semibold text-white transition hover:bg-[#006c78] disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c] focus-visible:ring-offset-2">
              {pendingAction === "profile" ? copy.saving : copy.saveProfile}
            </button>
          </form>

          <aside className="grid content-start gap-5">
            <div className="overflow-hidden rounded-[26px] border border-line bg-white p-5 shadow-soft sm:p-7">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#087f70]">{copy.accountSecurity}</p>
              <h2 className="mt-4 text-2xl font-semibold text-ink">{copy.signInDetails}</h2>
              <dl className="mt-5 rounded-[14px] bg-[#e9f7f3] p-4 text-sm">
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">{copy.registeredEmail}</dt>
                  <dd className="mt-2 break-all font-semibold text-ink">{user.email ?? copy.notAdded}</dd>
                </div>
                <div className="mt-4">
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">{copy.verifiedPhone}</dt>
                  <dd className="mt-2 font-semibold text-[#087f70]">{user.phone ?? copy.notAdded}</dd>
                </div>
              </dl>

              {isDemo ? (
                <div className="mt-5 rounded-[14px] border border-line bg-surface p-4 text-sm leading-6 text-muted">
                  {copy.demoNotice}
                </div>
              ) : (
                <>
                  <form onSubmit={handleEmailChange} className="mt-6 grid gap-3">
                    <label className="grid gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">{copy.changeEmail}</span>
                      <input required type="email" autoComplete="email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} className="h-[52px] rounded-[10px] border border-line bg-white px-4 text-sm text-ink outline-none transition focus:border-[#087f8c] focus:ring-2 focus:ring-[#bfe4e2]" placeholder="new@email.com" />
                    </label>
                    <button disabled={pendingAction !== null} className="h-[42px] rounded-[11px] border border-[#087f8c] bg-white px-4 text-sm font-semibold text-[#087f8c] transition hover:bg-[#f1faf8] disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c]">
                      {pendingAction === "email" ? copy.sending : copy.sendConfirmation}
                    </button>
                  </form>

                  <form onSubmit={handlePasswordChange} className="mt-6 grid gap-3 border-t border-line pt-5">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">{copy.changePassword}</span>
                    <input required minLength={8} maxLength={128} type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="h-12 rounded-[10px] border border-line bg-white px-4 text-sm text-ink outline-none transition focus:border-[#087f8c] focus:ring-2 focus:ring-[#bfe4e2]" placeholder={copy.passwordPlaceholder} aria-label={copy.newPassword} />
                    <input required minLength={8} maxLength={128} type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="h-12 rounded-[10px] border border-line bg-white px-4 text-sm text-ink outline-none transition focus:border-[#087f8c] focus:ring-2 focus:ring-[#bfe4e2]" placeholder={copy.confirmPasswordPlaceholder} aria-label={copy.confirmPassword} />
                    <button disabled={pendingAction !== null} className="h-[42px] rounded-[11px] border border-[#087f8c] bg-white px-4 text-sm font-semibold text-[#087f8c] transition hover:bg-[#f1faf8] disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c]">
                      {pendingAction === "password" ? copy.changing : copy.changePassword}
                    </button>
                  </form>
                </>
              )}

              {accountNotice ? <p aria-live="polite" className={`mt-5 rounded-[14px] border px-4 py-3 text-sm leading-6 ${messageClassName(accountNotice.kind)}`}>{accountNotice.text}</p> : null}
            </div>

            <div className="rounded-[22px] border border-[#cfe0da] bg-[#f1faf7] p-5 sm:p-6">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#087f70]">{copy.phonePhoto}</h2>
              <p className="mt-3 text-xs leading-5 text-ink">{copy.phoneNote}</p>
              <p className="mt-3 text-xs leading-5 text-muted">{copy.storageNote}</p>
              <p className="mt-3 text-xs leading-5 text-muted">{copy.mfaNote}</p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
