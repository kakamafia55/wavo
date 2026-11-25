import { useLocales } from 'expo-localization';

export type AppLang = 'ar' | 'en';

const en = {
  appName: 'wavo',
  tabs: {
    home: 'Home',
    activity: 'Activity',
    setup: 'Setup',
  },
  home: {
    send: 'Send',
    receive: 'Receive',
    infoTitle: 'Direct offline transfer',
    infoBody:
      'Wavo moves files straight from one phone to another over a temporary local Wi-Fi hotspot. No internet, no cloud, no accounts — the bytes never leave your devices.',
    recentActivity: 'Recent activity',
    viewAll: 'View all',
    getReady: 'Get ready',
    noActivity: 'No transfers yet',
  },
  send: {
    title: 'Send files',
    pickFiles: 'Pick files',
    picked: 'picked',
    startSharing: 'Start sharing',
    preparing: 'Preparing hotspot…',
    qrHint: 'Scan this code with the receiving phone',
    sharedFiles: 'Shared files',
    endSharing: 'End sharing',
    noFiles: 'Pick at least one file first',
  },
  receive: {
    title: 'Receive files',
    cameraNeeded: 'Camera access is needed to scan the QR code',
    requestCamera: 'Allow camera',
    scanning: 'Point the camera at the sender’s QR code',
    connecting: 'Connecting…',
    connected: 'Connected to the sender',
    failed: 'Connection failed',
    availableFiles: 'Available files',
    download: 'Download',
    open: 'Open file',
    share: 'Share',
    scanAgain: 'Scan again',
    noFiles: 'The sender is not sharing anything',
  },
  history: {
    title: 'Activity',
    totalTransfers: 'Completed transfers',
    totalSize: 'Total transferred',
    all: 'All',
    sent: 'Sent',
    received: 'Received',
    empty: 'Nothing here yet',
    open: 'Open',
    share: 'Share',
  },
  setup: {
    title: 'Get ready',
    subtitle: 'Wavo needs a few permissions to create the local hotspot and receive files.',
    wifiNearby: 'Wi-Fi & Nearby devices',
    camera: 'Camera',
    locationServices: 'Location services',
    bluetooth: 'Bluetooth (optional)',
    enable: 'Enable',
    enableAll: 'Get ready (enable all)',
    refresh: 'Refresh status',
    granted: 'Granted',
    notGranted: 'Not granted',
    on: 'On',
    off: 'Off',
  },
  errors: {
    title: 'Something went wrong',
    INVALID_QR: 'This QR code is not a valid Wavo code. Ask the sender to show it again.',
    PERMISSION_DENIED: 'A required permission is missing. Grant it in settings and try again.',
    HOTSPOT_FAILED: 'Could not start the local hotspot. Make sure Wi-Fi is on and location is enabled.',
    CONNECTION_FAILED: 'Could not connect to the sender. Make sure you scanned the current QR code.',
    FORBIDDEN: 'The sender rejected the session. Scan the QR code again.',
    DOWNLOAD_FAILED: 'The download was interrupted. It will resume from where it stopped.',
    SAVE_FAILED: 'The file could not be saved to Downloads.',
    UNSUPPORTED_ANDROID: 'Receiving files requires Android 10 or newer.',
    NO_ACTIVITY: 'No app on this phone can open or share this file.',
    GENERIC: 'Unexpected error. Please try again.',
    settings: 'Settings',
    tryAgain: 'Try again',
    close: 'Close',
  },
  footer: '© Eng - Mohamed Badran',
  common: {
    files: 'files',
    file: 'file',
  },
};

export type Translation = typeof en;

const ar: Translation = {
  appName: 'ويفو',
  tabs: {
    home: 'الرئيسية',
    activity: 'السجل',
    setup: 'التجهيز',
  },
  home: {
    send: 'إرسال',
    receive: 'استلام',
    infoTitle: 'نقل مباشر دون إنترنت',
    infoBody:
      'ينقل ويفو الملفات مباشرة من هاتف إلى آخر عبر نقطة wi-fi محلية مؤقتة. بلا إنترنت ولا سحابة ولا حسابات — البيانات لا تغادر أجهزتك أبداً.',
    recentActivity: 'النشاط الأخير',
    viewAll: 'عرض الكل',
    getReady: 'ابدأ التجهيز',
    noActivity: 'لا توجد نقلات بعد',
  },
  send: {
    title: 'إرسال ملفات',
    pickFiles: 'اختر الملفات',
    picked: 'ملف مختار',
    startSharing: 'ابدأ المشاركة',
    preparing: 'جارٍ تجهيز الشبكة…',
    qrHint: 'امسح هذا الرمز من هاتف الاستلام',
    sharedFiles: 'الملفات المشاركة',
    endSharing: 'إنهاء المشاركة',
    noFiles: 'اختر ملفاً واحداً على الأقل أولاً',
  },
  receive: {
    title: 'استلام ملفات',
    cameraNeeded: 'نحتاج إلى الوصول إلى الكاميرا لمسح رمز QR',
    requestCamera: 'السماح بالكاميرا',
    scanning: 'وجّه الكاميرا نحو رمز QR الخاص بالمرسل',
    connecting: 'جارٍ الاتصال…',
    connected: 'متصل بالمرسل',
    failed: 'فشل الاتصال',
    availableFiles: 'الملفات المتاحة',
    download: 'تحميل',
    open: 'فتح الملف',
    share: 'مشاركة',
    scanAgain: 'مسح مرة أخرى',
    noFiles: 'المرسل لا يشارك أي شيء حالياً',
  },
  history: {
    title: 'السجل',
    totalTransfers: 'النقلات المكتملة',
    totalSize: 'إجمالي المنقول',
    all: 'الكل',
    sent: 'مرسلة',
    received: 'مستلمة',
    empty: 'لا يوجد شيء هنا بعد',
    open: 'فتح',
    share: 'مشاركة',
  },
  setup: {
    title: 'التجهيز',
    subtitle: 'يحتاج ويفو إلى بضع صلاحيات لإنشاء نقطة Wi-Fi المحلية واستلام الملفات.',
    wifiNearby: 'Wi-Fi والأجهزة القريبة',
    camera: 'الكاميرا',
    locationServices: 'خدمات الموقع',
    bluetooth: 'البلوتوث (اختياري)',
    enable: 'تفعيل',
    enableAll: 'تجهيز (تفعيل الكل)',
    refresh: 'تحديث الحالة',
    granted: 'ممنوح',
    notGranted: 'غير ممنوح',
    on: 'مفعّل',
    off: 'متوقف',
  },
  errors: {
    title: 'حدث خطأ ما',
    INVALID_QR: 'رمز QR هذا ليس رمز ويفو صالحاً. اطلب من المرسل إظهاره مرة أخرى.',
    PERMISSION_DENIED: 'هناك صلاحية مطلوبة غير ممنوحة. امنحها من الإعدادات ثم أعد المحاولة.',
    HOTSPOT_FAILED: 'تعذّر بدء نقطة Wi-Fi المحلية. تأكد أن Wi-Fi وخدمات الموقع مفعّلان.',
    CONNECTION_FAILED: 'تعذّر الاتصال بالمرسل. تأكد أنك مسحت رمز QR الحالي.',
    FORBIDDEN: 'رفض المرسل الجلسة. امسح رمز QR مرة أخرى.',
    DOWNLOAD_FAILED: 'انقطع التحميل. سيستأنف من حيث توقف.',
    SAVE_FAILED: 'تعذّر حفظ الملف في Downloads.',
    UNSUPPORTED_ANDROID: 'استلام الملفات يتطلب Android 10 أو أحدث.',
    NO_ACTIVITY: 'لا يوجد تطبيق في هذا الهاتف يستطيع فتح أو مشاركة هذا الملف.',
    GENERIC: 'خطأ غير متوقع. حاول مرة أخرى.',
    settings: 'الإعدادات',
    tryAgain: 'حاول مجدداً',
    close: 'إغلاق',
  },
  footer: '© Eng - Mohamed Badran',
  common: {
    files: 'ملفات',
    file: 'ملف',
  },
};

export const dictionaries: Record<AppLang, Translation> = { en, ar };

export function resolveLang(locales: { languageCode?: string | null }[] | undefined): AppLang {
  const code = locales?.[0]?.languageCode;
  return code === 'ar' ? 'ar' : 'en';
}

export function useTranslation() {
  const locales = useLocales();
  const lang = resolveLang(locales);
  const t = dictionaries[lang];
  const rtl = lang === 'ar';
  return { t, lang, rtl, dir: (rtl ? 'rtl' : 'ltr') as 'rtl' | 'ltr' };
}
